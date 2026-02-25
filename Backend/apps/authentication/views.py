import os

from rest_framework import status, generics, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.decorators import api_view, permission_classes
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth import get_user_model
from django.utils.decorators import method_decorator
from django_ratelimit.decorators import ratelimit

from .serializers import (
    UserSerializer,
    RegisterSerializer,
    ProfileUpdateSerializer,
    ChangePasswordSerializer,
)
from .models import AuditLog, log_action
from apps.permissions import IsAdmin

User = get_user_model()


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """Adds user data to the JWT token response."""

    def validate(self, attrs):
        data = super().validate(attrs)
        # Update last_login since JWT auth doesn't trigger Django's login signal
        from django.contrib.auth.models import update_last_login
        update_last_login(None, self.user)
        user_serializer = UserSerializer(self.user, context={'request': self.context['request']})
        data['user'] = user_serializer.data
        return data


class CustomTokenObtainPairView(TokenObtainPairView):
    """Login endpoint — rate-limited to 10 attempts/min per IP.
    Accepts email or username + password."""
    serializer_class = CustomTokenObtainPairSerializer

    def get_serializer(self, *args, **kwargs):
        """If request data has 'email' but no 'username', look up user and inject username."""
        data = kwargs.get('data')
        if data and 'email' in data and 'username' not in data:
            data = data.copy()
            email = data.pop('email', [''])[0] if hasattr(data, 'getlist') else data.pop('email', '')
            if isinstance(email, list):
                email = email[0] if email else ''
            email = email.strip().lower()
            if email:
                try:
                    user = User.objects.get(email__iexact=email)
                    data['username'] = user.username
                except User.DoesNotExist:
                    # Let it pass through — serializer will fail with invalid credentials
                    data['username'] = email
            kwargs['data'] = data
        return super().get_serializer(*args, **kwargs)

    @method_decorator(ratelimit(key='ip', rate='10/m', method='POST', block=False))
    def post(self, request, *args, **kwargs):
        was_limited = getattr(request, 'limited', False)
        if was_limited:
            log_action(AuditLog.LOGIN_FAILED,
                       details='Rate-limited login attempt',
                       request=request)
            return Response(
                {'detail': 'Too many login attempts. Please wait a moment and try again.'},
                status=status.HTTP_429_TOO_MANY_REQUESTS
            )

        response = super().post(request, *args, **kwargs)

        if response.status_code == 200:
            # Successful login — user is in the response data
            user_data = response.data.get('user', {})
            username = user_data.get('username', request.data.get('username', ''))
            try:
                user = User.objects.get(username=username)
            except User.DoesNotExist:
                user = None
            log_action(AuditLog.LOGIN, user=user,
                       details=f'Successful login from {request.META.get("REMOTE_ADDR", "")}',
                       request=request)
        else:
            # Failed login
            log_action(AuditLog.LOGIN_FAILED,
                       details=f'Failed login attempt for: {request.data.get("email", request.data.get("username", "?"))}',
                       request=request)

        return response


class RegisterView(generics.CreateAPIView):
    """Creates a new user and returns JWT tokens so they're logged in right away."""

    queryset = User.objects.all()
    permission_classes = [permissions.AllowAny]
    serializer_class = RegisterSerializer

    def create(self, request, *args, **kwargs):
        from rest_framework_simplejwt.tokens import RefreshToken

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        # Audit
        log_action(AuditLog.REGISTER, user=user,
                   details=f'New account: {user.username} ({user.role})',
                   request=request)

        refresh = RefreshToken.for_user(user)
        user_serializer = UserSerializer(user, context={'request': request})
        return Response({
            'message': 'Registration successful',
            'user': user_serializer.data,
            'access': str(refresh.access_token),
            'refresh': str(refresh),
        }, status=status.HTTP_201_CREATED)


class ProfileView(APIView):

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user, context={'request': request})
        return Response(serializer.data)

    def put(self, request):
        serializer = ProfileUpdateSerializer(
            request.user,
            data=request.data,
            partial=True,
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        log_action(AuditLog.PROFILE_UPDATE, user=request.user,
                   details='Profile information updated', request=request)
        return Response(UserSerializer(request.user, context={'request': request}).data)


class ChangePasswordView(APIView):

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        log_action(AuditLog.PASSWORD_CHANGE, user=request.user,
                   details='Password changed successfully', request=request)
        return Response({'message': 'Password changed successfully'})


class ProfilePictureView(APIView):

    permission_classes = [permissions.IsAuthenticated]

    ALLOWED_MIME = {'image/jpeg', 'image/png', 'image/webp'}
    ALLOWED_EXT = {'.jpg', '.jpeg', '.png', '.webp'}
    MAX_SIZE = 5 * 1024 * 1024  # 5 MB

    def post(self, request):
        file = request.FILES.get('avatar')
        if not file:
            return Response(
                {'error': 'No image file provided'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # SEC-02: Validate file type, extension, and size
        if file.content_type not in self.ALLOWED_MIME:
            return Response(
                {'error': 'Only JPEG, PNG, and WebP images are allowed.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        ext = os.path.splitext(file.name)[1].lower()
        if ext not in self.ALLOWED_EXT:
            return Response(
                {'error': f'File extension "{ext}" is not allowed.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if file.size > self.MAX_SIZE:
            return Response(
                {'error': 'Image must be smaller than 5 MB.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        request.user.avatar = file
        request.user.save()

        return Response({
            'message': 'Profile picture updated',
            'avatar': request.build_absolute_uri(request.user.avatar.url) if request.user.avatar else None,
        })


class AuditLogView(APIView):
    """Admin-only listing of audit events. Supports ?limit= and ?action= filters."""

    permission_classes = [IsAdmin]  # SEC-03: class-level permission

    def get(self, request):

        qs = AuditLog.objects.select_related('user').all()

        # Optional filters
        action_filter = request.query_params.get('action')
        if action_filter:
            qs = qs.filter(action__icontains=action_filter)

        username_filter = request.query_params.get('username')
        if username_filter:
            qs = qs.filter(username__icontains=username_filter)

        try:
            limit = min(int(request.query_params.get('limit', 50)), 200)
        except (ValueError, TypeError):
            limit = 50
        qs = qs[:limit]

        data = [
            {
                'id':         log.id,
                'action':     log.action,
                'user':       log.username or (log.user.username if log.user else 'System'),
                'details':    log.details,
                'ip_address': log.ip_address,
                'timestamp':  log.timestamp.isoformat(),
            }
            for log in qs
        ]
        return Response(data)

    def delete(self, request):
        """Admin-only: clear all audit log entries."""

        count = AuditLog.objects.count()
        AuditLog.objects.all().delete()

        # Log the clear action itself (so there's always a trace)
        log_action(
            AuditLog.Action.OTHER,
            user=request.user,
            details=f'Cleared {count} audit log entries',
            request=request,
        )

        return Response({'message': f'Cleared {count} audit log entries.'})


class BackupView(APIView):
    """Dumps users, inventory, and requests as a downloadable JSON file.
    Admin only."""

    permission_classes = [IsAdmin]  # SEC-03: class-level permission

    def get(self, request):

        import json
        from django.http import HttpResponse
        from django.utils import timezone
        from apps.inventory.models import Item
        from apps.requests.models import Request

        items = list(Item.objects.values(
            'id', 'name', 'category', 'quantity', 'status',
            'location', 'description', 'access_level', 'is_returnable',
            'borrow_duration', 'borrow_duration_unit', 'created_at', 'updated_at',
        ))

        requests_qs = list(Request.objects.values(
            'id', 'item_name', 'quantity', 'status', 'priority', 'purpose',
            'requested_by__username', 'approved_by__username',
            'created_at', 'updated_at', 'expected_return', 'returned_at',
        ))

        users = list(User.objects.values(
            'id', 'username', 'email', 'first_name', 'last_name',
            'role', 'department', 'is_active', 'date_joined',
        ))

        backup_data = {
            'exported_at': timezone.now().isoformat(),
            'exported_by': request.user.username,
            'version': '1.0.0',
            'data': {
                'users': users,
                'inventory': items,
                'requests': requests_qs,
            },
        }

        # Convert datetime objects to strings for JSON serialization
        def default_serializer(obj):
            if hasattr(obj, 'isoformat'):
                return obj.isoformat()
            raise TypeError(f'Object of type {type(obj)} is not JSON serializable')

        log_action(AuditLog.BACKUP, user=request.user,
                   details='System backup exported', request=request)

        json_str = json.dumps(backup_data, default=default_serializer, indent=2)
        filename = f"plmun_nexus_backup_{timezone.now().strftime('%Y%m%d_%H%M%S')}.json"

        response = HttpResponse(json_str, content_type='application/json')
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        response['Access-Control-Expose-Headers'] = 'Content-Disposition'
        return response
