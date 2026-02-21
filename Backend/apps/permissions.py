"""
Shared permission classes for PLMun Nexus.

Import these instead of redefining them in each app's views.py:
    from apps.permissions import IsStaffOrAbove, IsAdmin, IsFacultyOrAbove
"""

from rest_framework import permissions


class IsFacultyOrAbove(permissions.BasePermission):
    """Allow access to Faculty, Staff, or Admin."""

    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.has_min_role('FACULTY')


class IsStaffOrAbove(permissions.BasePermission):
    """Allow access to Staff or Admin only."""

    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.has_min_role('STAFF')


class IsAdmin(permissions.BasePermission):
    """Allow access to Admin only."""

    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.is_admin
