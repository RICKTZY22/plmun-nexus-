from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q
from django.utils import timezone

from .models import Item
from .serializers import ItemSerializer, ItemCreateUpdateSerializer
from apps.authentication.models import User, AuditLog, log_action
from apps.permissions import IsStaffOrAbove, IsAdmin


class ItemViewSet(viewsets.ModelViewSet):
    """ViewSet for inventory items."""

    queryset = Item.objects.all()

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return ItemCreateUpdateSerializer
        return ItemSerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.IsAuthenticated()]
        elif self.action in ['create', 'update', 'partial_update', 'destroy', 'change_status']:
            return [IsStaffOrAbove()]
        return [permissions.IsAuthenticated()]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        item = serializer.save()

        log_action(AuditLog.ITEM_CREATED, user=request.user,
                   details=f'Created item "{item.name}" (category: {item.category}, qty: {item.quantity})',
                   request=request)

        return Response(
            ItemSerializer(item).data,
            status=status.HTTP_201_CREATED,
        )

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        item = serializer.save()

        log_action(AuditLog.ITEM_UPDATED, user=request.user,
                   details=f'Updated item "{item.name}" (id: {item.id})',
                   request=request)

        return Response(ItemSerializer(item).data)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        item_name = instance.name
        item_id = instance.id
        response = super().destroy(request, *args, **kwargs)

        log_action(AuditLog.ITEM_DELETED, user=request.user,
                   details=f'Deleted item "{item_name}" (id: {item_id})',
                   request=request)

        return response

    def get_queryset(self):
        """Filter items based on user role and query params."""
        queryset = Item.objects.select_related('status_changed_by').all()
        user = self.request.user

        # Role-based access filtering
        role_hierarchy = User.ROLE_HIERARCHY
        user_level = role_hierarchy.get(user.role, 0)

        accessible_levels = [
            role for role, level in role_hierarchy.items()
            if level <= user_level
        ]
        queryset = queryset.filter(access_level__in=accessible_levels)

        # Hide RETIRED items from students and faculty
        if user.role in ['STUDENT', 'FACULTY']:
            queryset = queryset.exclude(status='RETIRED')

        # Query params
        search = self.request.query_params.get('search', '')
        category = self.request.query_params.get('category', '')
        item_status = self.request.query_params.get('status', '')

        if search:
            queryset = queryset.filter(
                Q(name__icontains=search) |
                Q(description__icontains=search) |
                Q(location__icontains=search)
            )

        if category:
            queryset = queryset.filter(category=category)

        if item_status:
            queryset = queryset.filter(status=item_status)

        return queryset

    @action(detail=True, methods=['post'])
    def change_status(self, request, pk=None):
        """Change an item's status with metadata (note, ETA)."""
        item = self.get_object()
        new_status = request.data.get('status')
        note = request.data.get('note', '')
        maintenance_eta = request.data.get('maintenanceEta')

        # Validate status
        valid_statuses = [s[0] for s in Item.Status.choices]
        if not new_status or new_status not in valid_statuses:
            return Response(
                {'detail': f'Invalid status. Must be one of: {", ".join(valid_statuses)}'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        old_status = item.status
        item.status = new_status
        item.status_note = note
        item.status_changed_at = timezone.now()
        item.status_changed_by = request.user

        # Set or clear maintenance ETA
        if new_status == 'MAINTENANCE' and maintenance_eta:
            from django.utils.dateparse import parse_datetime
            parsed = parse_datetime(maintenance_eta)
            item.maintenance_eta = parsed
        else:
            item.maintenance_eta = None

        item.save()

        log_action(AuditLog.ITEM_UPDATED, user=request.user,
                   details=f'Changed status of "{item.name}" from {old_status} to {new_status}'
                           f'{" — " + note if note else ""}',
                   request=request)

        return Response(ItemSerializer(item).data)

    @action(detail=False, methods=['get'])
    def low_stock(self, request):
        """Get low stock items."""
        items = self.get_queryset().filter(
            quantity__lte=Item.LOW_STOCK_THRESHOLD,
            quantity__gt=0,
        ).exclude(status='RETIRED').order_by('quantity')

        serializer = ItemSerializer(items, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def out_of_stock(self, request):
        """Get out of stock items."""
        items = self.get_queryset().filter(quantity=0)
        serializer = ItemSerializer(items, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Get inventory statistics."""
        queryset = self.get_queryset()

        stats = {
            'total': queryset.count(),
            'available': queryset.filter(status='AVAILABLE').count(),
            'inUse': queryset.filter(status='IN_USE').count(),
            'maintenance': queryset.filter(status='MAINTENANCE').count(),
            'retired': queryset.filter(status='RETIRED').count(),
            'lowStock': queryset.filter(
                quantity__lte=Item.LOW_STOCK_THRESHOLD,
                quantity__gt=0,
            ).count(),
            'outOfStock': queryset.filter(quantity=0).count(),
        }

        return Response(stats)

