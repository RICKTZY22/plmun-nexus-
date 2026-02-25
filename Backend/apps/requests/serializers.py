from rest_framework import serializers
from django.utils import timezone
from django.utils.html import strip_tags
from .models import Request, Comment, Notification
from apps.authentication.serializers import UserSerializer


class CommentSerializer(serializers.ModelSerializer):

    author = UserSerializer(read_only=True)
    authorName = serializers.SerializerMethodField()
    timestamp = serializers.DateTimeField(source='created_at', read_only=True)

    class Meta:
        model = Comment
        fields = ['id', 'author', 'authorName', 'text', 'timestamp']
        read_only_fields = ['id', 'author', 'authorName', 'timestamp']

    def get_authorName(self, obj):
        return obj.author.get_full_name() or obj.author.username


class CommentCreateSerializer(serializers.ModelSerializer):

    class Meta:
        model = Comment
        fields = ['text']

    def validate_text(self, value):
        """Strip HTML tags to prevent stored XSS."""
        return strip_tags(value).strip()


class RequestSerializer(serializers.ModelSerializer):

    requestedBy = serializers.SerializerMethodField()
    requestedById = serializers.IntegerField(source='requested_by_id', read_only=True)
    approvedBy = serializers.SerializerMethodField()
    itemName = serializers.CharField(source='item_name', read_only=True)
    requestDate = serializers.DateField(source='request_date', read_only=True)
    expectedReturn = serializers.DateTimeField(source='expected_return', allow_null=True, required=False)
    approvedAt = serializers.DateTimeField(source='approved_at', read_only=True)
    rejectionReason = serializers.CharField(source='rejection_reason', read_only=True)
    returnedAt = serializers.DateTimeField(source='returned_at', read_only=True)
    isReturnable = serializers.SerializerMethodField()
    isOverdue = serializers.SerializerMethodField()
    borrowDuration = serializers.SerializerMethodField()
    borrowDurationUnit = serializers.SerializerMethodField()
    createdAt = serializers.DateTimeField(source='created_at', read_only=True)
    comments = CommentSerializer(many=True, read_only=True)

    class Meta:
        model = Request
        fields = [
            'id', 'item', 'itemName', 'requestedBy', 'requestedById', 'quantity', 'purpose',
            'status', 'priority', 'requestDate', 'expectedReturn',
            'approvedBy', 'approvedAt', 'rejectionReason', 'returnedAt', 'isReturnable',
            'isOverdue', 'borrowDuration', 'borrowDurationUnit', 'createdAt', 'comments',
        ]
        read_only_fields = [
            'id', 'requestedBy', 'requestedById', 'requestDate', 'approvedBy', 'approvedAt',
            'rejectionReason', 'returnedAt', 'isReturnable', 'isOverdue',
            'borrowDuration', 'borrowDurationUnit', 'createdAt', 'comments', 'itemName',
        ]

    def get_requestedBy(self, obj):
        return obj.requested_by.get_full_name() or obj.requested_by.username

    def get_approvedBy(self, obj):
        if obj.approved_by:
            return obj.approved_by.get_full_name() or obj.approved_by.username
        return None

    def get_isReturnable(self, obj):
        try:
            return obj.item.is_returnable
        except (AttributeError, obj.item.DoesNotExist):
            return False

    def get_isOverdue(self, obj):
        if obj.status not in ('APPROVED', 'COMPLETED'):
            return False
        if not obj.expected_return:
            return False
        return obj.expected_return < timezone.now()

    def get_borrowDuration(self, obj):
        try:
            return obj.item.borrow_duration
        except (AttributeError, obj.item.DoesNotExist):
            return None

    def get_borrowDurationUnit(self, obj):
        try:
            return obj.item.borrow_duration_unit
        except (AttributeError, obj.item.DoesNotExist):
            return None


class RequestCreateSerializer(serializers.ModelSerializer):

    itemName = serializers.CharField(source='item_name')
    expectedReturn = serializers.DateTimeField(source='expected_return', required=False, allow_null=True)

    class Meta:
        model = Request
        fields = ['item', 'itemName', 'quantity', 'purpose', 'priority', 'expectedReturn']

    def validate_quantity(self, value):
        if value < 1:
            raise serializers.ValidationError('Quantity must be at least 1.')
        return value

    def validate_purpose(self, value):
        """Strip HTML tags to prevent stored XSS."""
        if value:
            return strip_tags(value).strip()
        return value


class RequestActionSerializer(serializers.Serializer):
    """Approve/reject payload — just an optional reason."""

    reason = serializers.CharField(required=False, allow_blank=True)


class NotificationSerializer(serializers.ModelSerializer):

    senderName = serializers.SerializerMethodField()
    itemName = serializers.SerializerMethodField()
    requestId = serializers.IntegerField(source='request_id', read_only=True)
    createdAt = serializers.DateTimeField(source='created_at', read_only=True)
    isRead = serializers.BooleanField(source='is_read', read_only=True)

    class Meta:
        model = Notification
        fields = ['id', 'type', 'message', 'isRead', 'senderName', 'itemName', 'requestId', 'createdAt']

    def get_senderName(self, obj):
        if obj.sender:
            return obj.sender.get_full_name() or obj.sender.username
        return None

    def get_itemName(self, obj):
        if obj.request:
            return obj.request.item_name
        return None

