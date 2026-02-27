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
from apps.authentication.models import User, AuditLog, log_action
from apps.permissions import IsStaffOrAbove


# helper: skip creating a notification if an identical one (same type, request,
# recipient) was already created in the last 5 minutes. Prevents the annoying
# duplicate spam from double-clicks, network retries, etc.
from datetime import timedelta

def _create_notif_if_new(recipient, request_obj, notif_type, message, sender=None):
    """Create notification only if no duplicate exists in the last 5 min."""
    recent_cutoff = timezone.now() - timedelta(minutes=5)
    already_exists = Notification.objects.filter(
        recipient=recipient,
        request=request_obj,
        type=notif_type,
        created_at__gte=recent_cutoff,
    ).exists()
    if not already_exists:
        Notification.objects.create(
            recipient=recipient,
            sender=sender,
            request=request_obj,
            type=notif_type,
            message=message,
        )


# TODO(erick): the approve/reject/release actions share a lot of common
# validation logic, might be worth extracting into a mixin at some point
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

        # Audit log
        log_action(AuditLog.REQUEST_CREATED, user=request.user,
                   details=f'Created request for "{req.item_name}" (qty: {req.quantity})',
                   request=request)

        # Notify all staff/admin about the new request
        # uses dedup helper so re-submitting the same request doesn't spam
        author_name = request.user.get_full_name() or request.user.username
        staff_users = User.objects.filter(
            role__in=['STAFF', 'ADMIN']
        ).exclude(id=request.user.id)
        for staff in staff_users:
            _create_notif_if_new(
                recipient=staff,
                request_obj=req,
                notif_type='STATUS_CHANGE',
                message=f'{author_name} submitted a new request for "{req.item_name}"',
                sender=request.user,
            )

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

        # Audit log
        log_action(AuditLog.REQUEST_APPROVED, user=request.user,
                   details=f'Approved request #{req.id} for "{req.item_name}" (qty: {req.quantity})',
                   request=request)

        # Notify the requester about approval (deduped)
        approver_name = request.user.get_full_name() or request.user.username
        _create_notif_if_new(
            recipient=req.requested_by,
            request_obj=req,
            notif_type='STATUS_CHANGE',
            message=f'{approver_name} approved your request for "{req.item_name}"',
            sender=request.user,
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

        # Audit log
        log_action(AuditLog.REQUEST_REJECTED, user=request.user,
                   details=f'Rejected request #{req.id} for "{req.item_name}". Reason: {req.rejection_reason or "(none)"}',
                   request=request)

        # Notify the requester about rejection (deduped)
        rejector_name = request.user.get_full_name() or request.user.username
        reason_text = f' Reason: "{req.rejection_reason}"' if req.rejection_reason else ''
        _create_notif_if_new(
            recipient=req.requested_by,
            request_obj=req,
            notif_type='STATUS_CHANGE',
            message=f'{rejector_name} rejected your request for "{req.item_name}".{reason_text}',
            sender=request.user,
        )

        return Response(RequestSerializer(req).data)

    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        req = self.get_object()

        # SEC-05: only requester or staff/admin can complete
        if req.requested_by != request.user and not request.user.has_min_role('STAFF'):
            return Response(
                {'error': 'You can only complete your own requests'},
                status=status.HTTP_403_FORBIDDEN,
            )

        if req.status != 'APPROVED':
            return Response(
                {'error': 'Only approved requests can be completed'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        req.status = 'COMPLETED'
        req.save()

        # Let the requester know (deduped)
        completer = request.user.get_full_name() or request.user.username
        _create_notif_if_new(
            recipient=req.requested_by,
            request_obj=req,
            notif_type='STATUS_CHANGE',
            message=f'{completer} marked your request for "{req.item_name}" as completed.',
            sender=request.user,
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

        # Audit log
        log_action(AuditLog.OTHER, user=request.user,
                   details=f'Cancelled request #{req.id} for "{req.item_name}"',
                   request=request)

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

        # Restore stock atomically to prevent race conditions
        from apps.inventory.models import Item
        Item.objects.filter(pk=item.pk).update(quantity=F('quantity') + req.quantity)
        item.refresh_from_db()
        if item.status == 'IN_USE':
            item.status = 'AVAILABLE'
            item.save(update_fields=['status'])

        req.status = 'RETURNED'
        req.returned_at = timezone.now()
        req.save()

        # Audit log
        log_action(AuditLog.REQUEST_RETURNED, user=request.user,
                   details=f'Returned item for request #{req.id} "{req.item_name}" (qty: {req.quantity})',
                   request=request)

        # Notify the requester about the return (deduped, only if someone else returned it)
        returner_name = request.user.get_full_name() or request.user.username
        if req.requested_by != request.user:
            _create_notif_if_new(
                recipient=req.requested_by,
                request_obj=req,
                notif_type='STATUS_CHANGE',
                message=f'{returner_name} returned your borrowed item "{req.item_name}".',
                sender=request.user,
            )

        return Response(RequestSerializer(req).data)

    @action(detail=False, methods=['delete'])
    def clear_completed(self, request):
        # SEC-05: only staff/admin can bulk-clear
        if not request.user.has_min_role('STAFF'):
            return Response(
                {'error': 'Staff access required to clear requests'},
                status=status.HTTP_403_FORBIDDEN,
            )

        clearable_statuses = ['COMPLETED', 'RETURNED', 'REJECTED', 'CANCELLED']
        qs = self.get_queryset().filter(status__in=clearable_statuses)
        count, _ = qs.delete()

        # Audit log
        log_action(AuditLog.OTHER, user=request.user,
                   details=f'Cleared {count} completed/returned/rejected/cancelled requests',
                   request=request)

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
            # dedup comments too — rapid double-post shouldn't spam everyone
            for recipient_id in recipients:
                _create_notif_if_new(
                    recipient=User.objects.get(pk=recipient_id),
                    request_obj=req,
                    notif_type='COMMENT',
                    message=message,
                    sender=request.user,
                )

            return Response(
                CommentSerializer(comment).data,
                status=status.HTTP_201_CREATED,
            )

    @action(detail=False, methods=['get'])
    def stats(self, request):
        queryset = self.get_queryset()
        overdue_qs = queryset.filter(
            status__in=['APPROVED', 'COMPLETED'],
            expected_return__lt=timezone.now(),
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
        Only fires one notification per request per day to avoid spam.
        BUG-01 fix: uses select_related + batch operations to avoid N+1 queries.
        AUDIT-01 fix: uses unscoped queryset so any user can trigger a full scan.
        AUDIT-02 fix: only increments overdue_count for users not already flagged."""
        now = timezone.now()
        # Use unscoped queryset — any authenticated user should trigger a system-wide scan
        overdue = (
            Request.objects.filter(status__in=['APPROVED', 'COMPLETED'], expected_return__lt=now)
            .select_related('requested_by')
        )

        # Batch-exclude requests already notified today
        already_notified_ids = set(
            Notification.objects.filter(
                type='OVERDUE',
                created_at__date=now.date(),
                request__in=overdue,
            ).values_list('request_id', flat=True)
        )

        # Pre-fetch staff users once
        staff_users = list(User.objects.filter(role__in=['STAFF', 'ADMIN']))

        borrower_notifications = []
        staff_notifications = []
        flagged_user_ids = set()

        for req in overdue:
            if req.id in already_notified_ids:
                continue

            # Calculate overdue duration
            overdue_delta = now - req.expected_return
            total_minutes = int(overdue_delta.total_seconds() / 60)
            if total_minutes < 60:
                overdue_text = f'{total_minutes} minute(s)'
            elif total_minutes < 1440:
                overdue_text = f'{total_minutes // 60} hour(s)'
            else:
                overdue_text = f'{overdue_delta.days} day(s)'

            borrower = req.requested_by
            flagged_user_ids.add(borrower.pk)

            # Borrower notification
            borrower_notifications.append(Notification(
                recipient=borrower,
                request=req,
                type='OVERDUE',
                message=f'Your request for "{req.item_name}" is {overdue_text} overdue. Please return it.',
            ))

            # Staff notifications
            borrower_name = borrower.get_full_name() or borrower.username
            for staff in staff_users:
                staff_notifications.append(Notification(
                    recipient=staff,
                    request=req,
                    type='OVERDUE',
                    message=f'{borrower_name}\'s request for "{req.item_name}" is {overdue_text} overdue.',
                ))

        # Batch create all notifications
        Notification.objects.bulk_create(borrower_notifications + staff_notifications)

        # AUDIT-02: Only flag+increment users who aren't already flagged
        # This prevents overdue_count from inflating by +1 every day
        if flagged_user_ids:
            User.objects.filter(
                pk__in=flagged_user_ids,
                is_flagged=False,
            ).update(
                overdue_count=F('overdue_count') + 1,
                is_flagged=True,
            )
            # Ensure already-flagged users are still marked (idempotent)
            User.objects.filter(
                pk__in=flagged_user_ids,
            ).update(is_flagged=True)

        return Response({'status': f'{len(borrower_notifications)} overdue notifications created'})


class NotificationViewSet(viewsets.ModelViewSet):
    """User notifications — scoped to the authenticated user."""
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ['get', 'post', 'patch', 'delete']

    def get_queryset(self):
        # BUG FIX: previously this had [:100] slicing which broke clear_all
        # and read_all — Django doesn't let you filter or delete a sliced QS.
        # Learned that the hard way. Limit is now applied only in list().
        return (
            Notification.objects
            .filter(recipient=self.request.user)
            .select_related('sender', 'request')
            .order_by('-created_at')
        )

    def list(self, request, *args, **kwargs):
        # cap at 100 so we don't send thousands of old notifs
        qs = self.get_queryset()[:100]
        serializer = self.get_serializer(qs, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['patch'])
    def read(self, request, pk=None):
        notification = self.get_object()
        notification.is_read = True
        notification.save()
        return Response(NotificationSerializer(notification).data)

    @action(detail=False, methods=['post'])
    def read_all(self, request):
        updated = self.get_queryset().filter(is_read=False).update(is_read=True)
        return Response({'status': f'{updated} marked as read'})

    @action(detail=False, methods=['get'])
    def unread_count(self, request):
        count = self.get_queryset().filter(is_read=False).count()
        return Response({'count': count})

    @action(detail=False, methods=['delete'])
    def clear_all(self, request):
        count, _ = self.get_queryset().delete()
        return Response({'status': f'{count} notifications cleared'})

