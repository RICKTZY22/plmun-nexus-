from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q, F
from django.utils import timezone

from .models import Request, Comment, Notification
from .serializers import (
    RequestSerializer,
    RequestCreateSerializer,
    RequestActionSerializer,
    CommentSerializer,
    CommentCreateSerializer,
    NotificationSerializer,
)
from apps.authentication.models import User
from apps.permissions import IsStaffOrAbove


class RequestViewSet(viewsets.ModelViewSet):

    queryset = Request.objects.all()

    def get_serializer_class(self):
        if self.action == 'create':
            return RequestCreateSerializer
        return RequestSerializer

    def get_permissions(self):
        if self.action in ['approve', 'reject']:
            return [IsStaffOrAbove()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        queryset = Request.objects.all()
        user = self.request.user

        if not user.has_min_role('STAFF'):
            queryset = queryset.filter(requested_by=user)

        # Filters
        status_filter = self.request.query_params.get('status', '')
        priority = self.request.query_params.get('priority', '')
        search = self.request.query_params.get('search', '')

        if status_filter:
            queryset = queryset.filter(status=status_filter)

        if priority:
            queryset = queryset.filter(priority=priority)

        if search:
            queryset = queryset.filter(
                Q(item_name__icontains=search) |
                Q(purpose__icontains=search)
            )

        return queryset.select_related('requested_by', 'approved_by', 'item')

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        req = serializer.save(requested_by=request.user)

        # Notify all staff/admin about the new request
        author_name = request.user.get_full_name() or request.user.username
        staff_users = User.objects.filter(
            role__in=['STAFF', 'ADMIN']
        ).exclude(id=request.user.id)
        Notification.objects.bulk_create([
            Notification(
                recipient=staff,
                sender=request.user,
                request=req,
                type='STATUS_CHANGE',
                message=f'{author_name} submitted a new request for "{req.item_name}"',
            )
            for staff in staff_users
        ])

        return Response(
            RequestSerializer(req).data,
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        """Approve a pending request, deduct stock, and notify the requester."""
        req = self.get_object()

        if req.status != 'PENDING':
            return Response(
                {'error': 'Only pending requests can be approved'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Prevent self-approval (requester cannot approve their own request)
        if req.requested_by == request.user:
            return Response(
                {'error': 'You cannot approve your own request'},
                status=status.HTTP_403_FORBIDDEN,
            )

        # Atomically check and deduct stock to prevent race conditions
        item = req.item
        from apps.inventory.models import Item
        updated = Item.objects.filter(
            pk=item.pk,
            quantity__gte=req.quantity,
        ).update(quantity=F('quantity') - req.quantity)

        if not updated:
            # Re-read to give an accurate error message
            item.refresh_from_db()
            return Response(
                {'error': f'Insufficient stock. Only {item.quantity} available, but {req.quantity} requested.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # If quantity hit zero, mark item as IN_USE
        item.refresh_from_db()
        if item.quantity == 0:
            item.status = 'IN_USE'
            item.save(update_fields=['status'])

        req.status = 'APPROVED'
        req.approved_by = request.user
        req.approved_at = timezone.now()

        # Auto-calculate expected return from item's borrow duration
        if item.is_returnable and item.borrow_duration:
            delta = item.get_return_timedelta()
            if delta:
                req.expected_return = timezone.now() + delta

        req.save()

        # Notify the requester about approval
        approver_name = request.user.get_full_name() or request.user.username
        Notification.objects.create(
            recipient=req.requested_by,
            sender=request.user,
            request=req,
            type='STATUS_CHANGE',
            message=f'{approver_name} approved your request for "{req.item_name}"',
        )

        return Response(RequestSerializer(req).data)

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        req = self.get_object()

        if req.status != 'PENDING':
            return Response(
                {'error': 'Only pending requests can be rejected'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = RequestActionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        req.status = 'REJECTED'
        req.approved_by = request.user
        req.approved_at = timezone.now()
        req.rejection_reason = serializer.validated_data.get('reason', '')
        req.save()

        # Notify the requester about rejection
        rejector_name = request.user.get_full_name() or request.user.username
        reason_text = f' Reason: "{req.rejection_reason}"' if req.rejection_reason else ''
        Notification.objects.create(
            recipient=req.requested_by,
            sender=request.user,
            request=req,
            type='STATUS_CHANGE',
            message=f'{rejector_name} rejected your request for "{req.item_name}".{reason_text}',
        )

        return Response(RequestSerializer(req).data)

    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        req = self.get_object()

        if req.status != 'APPROVED':
            return Response(
                {'error': 'Only approved requests can be completed'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        req.status = 'COMPLETED'
        req.save()

        # Let the requester know
        completer = request.user.get_full_name() or request.user.username
        Notification.objects.create(
            recipient=req.requested_by,
            sender=request.user,
            request=req,
            type='STATUS_CHANGE',
            message=f'{completer} marked your request for "{req.item_name}" as completed.',
        )

        return Response(RequestSerializer(req).data)

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        req = self.get_object()

        if req.requested_by != request.user and not request.user.has_min_role('STAFF'):
            return Response(
                {'error': 'You can only cancel your own requests'},
                status=status.HTTP_403_FORBIDDEN,
            )

        if req.status != 'PENDING':
            return Response(
                {'error': 'Only pending requests can be cancelled'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        req.status = 'CANCELLED'
        req.save()

        return Response(RequestSerializer(req).data)

    @action(detail=True, methods=['post'])
    def return_item(self, request, pk=None):
        """Handle returning a borrowed item — restores stock and updates status."""
        req = self.get_object()

        # Only the requester or staff/admin can return an item
        if req.requested_by != request.user and not request.user.has_min_role('STAFF'):
            return Response(
                {'error': 'You can only return your own borrowed items'},
                status=status.HTTP_403_FORBIDDEN,
            )

        if req.status not in ('APPROVED', 'COMPLETED'):
            return Response(
                {'error': 'Only approved or completed requests can be returned'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Check if item is returnable
        item = req.item
        if not item.is_returnable:
            return Response(
                {'error': 'This item is not returnable'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Restore stock
        item.quantity += req.quantity
        if item.status == 'IN_USE':
            item.status = 'AVAILABLE'
        item.save()

        req.status = 'RETURNED'
        req.returned_at = timezone.now()
        req.save()

        return Response(RequestSerializer(req).data)

    @action(detail=False, methods=['delete'])
    def clear_completed(self, request):
        clearable_statuses = ['COMPLETED', 'RETURNED', 'REJECTED', 'CANCELLED']
        qs = self.get_queryset().filter(status__in=clearable_statuses)
        count, _ = qs.delete()
        return Response({'status': f'{count} requests cleared'})

    @action(detail=True, methods=['get', 'post'])
    def comments(self, request, pk=None):
        req = self.get_object()

        if request.method == 'GET':
            comments = req.comments.all()
            serializer = CommentSerializer(comments, many=True)
            return Response(serializer.data)

        elif request.method == 'POST':
            serializer = CommentCreateSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)

            comment = Comment.objects.create(
                request=req,
                author=request.user,
                text=serializer.validated_data['text'],
            )

            # Auto-create notifications for request owner + all previous commenters + staff/admin
            recipients = set()
            # Always notify the request owner (unless they are the commenter)
            if req.requested_by_id != request.user.id:
                recipients.add(req.requested_by_id)
            # Notify all previous commenters (except the current commenter)
            for c in req.comments.exclude(author=request.user).values_list('author_id', flat=True).distinct():
                recipients.add(c)
            # Notify all staff/admin users who aren't already in recipients
            staff_ids = User.objects.filter(
                role__in=['STAFF', 'ADMIN']
            ).exclude(id=request.user.id).values_list('id', flat=True)
            for sid in staff_ids:
                recipients.add(sid)

            author_name = request.user.get_full_name() or request.user.username
            message = f'{author_name} commented on "{req.item_name}": "{comment.text[:80]}"'
            Notification.objects.bulk_create([
                Notification(
                    recipient_id=recipient_id,
                    sender=request.user,
                    request=req,
                    type='COMMENT',
                    message=message,
                )
                for recipient_id in recipients
            ])

            return Response(
                CommentSerializer(comment).data,
                status=status.HTTP_201_CREATED,
            )

    @action(detail=False, methods=['get'])
    def stats(self, request):
        queryset = self.get_queryset()
        from datetime import date
        overdue_qs = queryset.filter(
            status__in=['APPROVED', 'COMPLETED'],
            expected_return__lt=date.today(),
        )

        stats = {
            'total': queryset.count(),
            'pending': queryset.filter(status='PENDING').count(),
            'approved': queryset.filter(status='APPROVED').count(),
            'completed': queryset.filter(status='COMPLETED').count(),
            'rejected': queryset.filter(status='REJECTED').count(),
            'returned': queryset.filter(status='RETURNED').count(),
            'overdue': overdue_qs.count(),
            'highPriority': queryset.filter(priority='HIGH', status='PENDING').count(),
        }

        return Response(stats)

    @action(detail=False, methods=['get'])
    def overdue_requests(self, request):
        overdue = self.get_queryset().filter(
            status__in=['APPROVED', 'COMPLETED'],
            expected_return__lt=timezone.now(),
        )
        serializer = RequestSerializer(overdue, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['post'])
    def check_overdue(self, request):
        """Scans for overdue borrows, flags the user, and sends notifications.
        Only fires one notification per request per day to avoid spam."""
        now = timezone.now()
        overdue = self.get_queryset().filter(
            status__in=['APPROVED', 'COMPLETED'],
            expected_return__lt=now,
        )
        created_count = 0
        for req in overdue:
            # Calculate overdue duration
            overdue_delta = now - req.expected_return
            total_minutes = int(overdue_delta.total_seconds() / 60)
            if total_minutes < 60:
                overdue_text = f'{total_minutes} minute(s)'
            elif total_minutes < 1440:
                overdue_text = f'{total_minutes // 60} hour(s)'
            else:
                overdue_text = f'{overdue_delta.days} day(s)'
            # Only create notification if one hasn't been sent today
            already_notified = Notification.objects.filter(
                request=req,
                type='OVERDUE',
                created_at__date=now.date(),
            ).exists()
            if not already_notified:
                # Flag the borrower's account
                borrower = req.requested_by
                borrower.overdue_count += 1
                borrower.is_flagged = True
                borrower.save(update_fields=['overdue_count', 'is_flagged'])

                # Notify the borrower
                Notification.objects.create(
                    recipient=borrower,
                    request=req,
                    type='OVERDUE',
                    message=f'Your request for "{req.item_name}" is {overdue_text} overdue. Please return it.',
                )
                # Notify all staff/admin
                staff_users = User.objects.filter(
                    role__in=['STAFF', 'ADMIN']
                )
                borrower_name = borrower.get_full_name() or borrower.username
                Notification.objects.bulk_create([
                    Notification(
                        recipient=staff,
                        request=req,
                        type='OVERDUE',
                        message=f'{borrower_name}\'s request for "{req.item_name}" is {overdue_text} overdue.',
                    )
                    for staff in staff_users
                ])
                created_count += 1
        return Response({'status': f'{created_count} overdue notifications created'})


class NotificationViewSet(viewsets.ModelViewSet):
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ['get', 'post', 'patch', 'delete']

    def get_queryset(self):
        return Notification.objects.filter(recipient=self.request.user)

    @action(detail=True, methods=['patch'])
    def read(self, request, pk=None):
        notification = self.get_object()
        notification.is_read = True
        notification.save()
        return Response(NotificationSerializer(notification).data)

    @action(detail=False, methods=['post'])
    def read_all(self, request):
        self.get_queryset().filter(is_read=False).update(is_read=True)
        return Response({'status': 'all marked as read'})

    @action(detail=False, methods=['get'])
    def unread_count(self, request):
        count = self.get_queryset().filter(is_read=False).count()
        return Response({'count': count})

    @action(detail=False, methods=['delete'])
    def clear_all(self, request):
        count, _ = self.get_queryset().delete()
        return Response({'status': f'{count} notifications cleared'})

