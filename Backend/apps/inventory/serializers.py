from rest_framework import serializers
from django.utils.html import strip_tags
from .models import Item


class ItemSerializer(serializers.ModelSerializer):
    """Serializer for Item model."""

    isLowStock = serializers.SerializerMethodField()
    isOutOfStock = serializers.SerializerMethodField()
    dateAdded = serializers.DateTimeField(source='created_at', read_only=True)
    accessLevel = serializers.CharField(source='access_level')
    imageUrl = serializers.ImageField(source='image', required=False, allow_null=True)
    isReturnable = serializers.BooleanField(source='is_returnable', read_only=True)
    borrowDuration = serializers.IntegerField(source='borrow_duration', read_only=True, allow_null=True)
    borrowDurationUnit = serializers.CharField(source='borrow_duration_unit', read_only=True)

    # Status metadata
    statusNote = serializers.CharField(source='status_note', read_only=True, default='')
    statusChangedAt = serializers.DateTimeField(source='status_changed_at', read_only=True, allow_null=True)
    statusChangedByName = serializers.SerializerMethodField()
    maintenanceEta = serializers.DateTimeField(source='maintenance_eta', read_only=True, allow_null=True)

    class Meta:
        model = Item
        fields = [
            'id', 'name', 'category', 'quantity', 'status', 'location',
            'description', 'imageUrl', 'accessLevel', 'dateAdded',
            'isLowStock', 'isOutOfStock', 'isReturnable',
            'borrowDuration', 'borrowDurationUnit',
            'statusNote', 'statusChangedAt', 'statusChangedByName', 'maintenanceEta',
        ]
        read_only_fields = ['id', 'dateAdded', 'isLowStock', 'isOutOfStock']

    def get_isLowStock(self, obj):
        return obj.is_low_stock

    def get_isOutOfStock(self, obj):
        return obj.is_out_of_stock

    def get_statusChangedByName(self, obj):
        if obj.status_changed_by:
            full = obj.status_changed_by.get_full_name()
            return full if full.strip() else obj.status_changed_by.email
        return None


class ItemCreateUpdateSerializer(serializers.ModelSerializer):
    """Serializer for creating/updating items."""

    accessLevel = serializers.CharField(source='access_level', required=False)
    imageUrl = serializers.ImageField(source='image', required=False, allow_null=True)
    isReturnable = serializers.BooleanField(source='is_returnable', required=False)
    borrowDuration = serializers.IntegerField(source='borrow_duration', required=False, allow_null=True)
    borrowDurationUnit = serializers.CharField(source='borrow_duration_unit', required=False)

    class Meta:
        model = Item
        fields = [
            'name', 'category', 'quantity', 'status', 'location',
            'description', 'imageUrl', 'accessLevel', 'isReturnable',
            'borrowDuration', 'borrowDurationUnit',
        ]

    def validate_quantity(self, value):
        if value < 0:
            raise serializers.ValidationError('Quantity cannot be negative.')
        return value

    def validate_name(self, value):
        """Strip HTML tags to prevent stored XSS."""
        return strip_tags(value).strip()

    def validate_description(self, value):
        """Strip HTML tags to prevent stored XSS."""
        if value:
            return strip_tags(value).strip()
        return value

