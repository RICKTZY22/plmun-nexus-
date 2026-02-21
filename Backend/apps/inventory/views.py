from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q

from .models import Item
from .serializers import ItemSerializer, ItemCreateUpdateSerializer
from apps.authentication.models import User
from apps.permissions import IsFacultyOrAbove, IsStaffOrAbove, IsAdmin


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
        elif self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsStaffOrAbove()]
        return [permissions.IsAuthenticated()]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        item = serializer.save()
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
        return Response(ItemSerializer(item).data)

    def get_queryset(self):
        """Filter items based on user role and query params."""
        queryset = Item.objects.all()
        user = self.request.user

        # Role-based access filtering
        role_hierarchy = User.ROLE_HIERARCHY
        user_level = role_hierarchy.get(user.role, 0)

        accessible_levels = [
            role for role, level in role_hierarchy.items()
            if level <= user_level
        ]
        queryset = queryset.filter(access_level__in=accessible_levels)

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
