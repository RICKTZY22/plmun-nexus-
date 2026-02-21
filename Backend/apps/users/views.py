from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.contrib.auth import get_user_model
from django.db.models import Q

from apps.authentication.serializers import UserSerializer
from apps.permissions import IsAdmin

User = get_user_model()


class UserViewSet(viewsets.ModelViewSet):
    """Admin-only ViewSet for user management."""

    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAdmin]

    def get_queryset(self):
        """Filter and search users."""
        queryset = User.objects.all()

        search = self.request.query_params.get('search', '')
        role = self.request.query_params.get('role', '')
        is_active = self.request.query_params.get('is_active', '')

        if search:
            queryset = queryset.filter(
                Q(first_name__icontains=search) |
                Q(last_name__icontains=search) |
                Q(email__icontains=search)
            )

        if role:
            queryset = queryset.filter(role=role)

        if is_active:
            queryset = queryset.filter(is_active=is_active.lower() == 'true')

        return queryset

    @action(detail=True, methods=['put', 'patch'])
    def role(self, request, pk=None):
        """Change user role."""
        user = self.get_object()
        new_role = request.data.get('role')

        if new_role not in User.Role.values:
            return Response(
                {'error': f'Invalid role. Must be one of: {list(User.Role.values)}'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user.role = new_role
        user.save()

        return Response(UserSerializer(user, context={'request': request}).data)

    @action(detail=True, methods=['post'])
    def toggle_status(self, request, pk=None):
        """Activate/deactivate user."""
        user = self.get_object()
        user.is_active = not user.is_active
        user.save()

        return Response({
            'message': f'User {"activated" if user.is_active else "deactivated"}',
            'user': UserSerializer(user, context={'request': request}).data,
        })

    @action(detail=True, methods=['post'])
    def unflag(self, request, pk=None):
        """Remove flag from a user account (admin only)."""
        user = self.get_object()

        if not user.is_flagged:
            return Response(
                {'message': 'User is not flagged'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user.is_flagged = False
        user.overdue_count = 0
        user.save(update_fields=['is_flagged', 'overdue_count'])

        return Response({
            'message': f'{user.get_full_name() or user.username} has been unflagged',
            'user': UserSerializer(user, context={'request': request}).data,
        })

    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Get user statistics."""
        queryset = User.objects.all()

        stats = {
            'total': queryset.count(),
            'active': queryset.filter(is_active=True).count(),
            'inactive': queryset.filter(is_active=False).count(),
            'byRole': {
                'students': queryset.filter(role='STUDENT').count(),
                'faculty': queryset.filter(role='FACULTY').count(),
                'staff': queryset.filter(role='STAFF').count(),
                'admin': queryset.filter(role='ADMIN').count(),
            },
        }

        return Response(stats)
