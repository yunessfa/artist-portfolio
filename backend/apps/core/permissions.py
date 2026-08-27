"""Reusable DRF permissions."""

from rest_framework import permissions

SAFE = permissions.SAFE_METHODS


class ReadOnlyOrStaff(permissions.BasePermission):
    """Anyone may read published content; only staff may write."""

    message = "برای این عملیات باید مدیر باشید."

    def has_permission(self, request, view):
        if request.method in SAFE:
            return True
        return bool(request.user and request.user.is_staff)


class StaffOnly(permissions.BasePermission):
    message = "دسترسی فقط برای مدیران."

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_staff)


class WriteOnlyPublic(permissions.BasePermission):
    """Public visitors may POST (contact form) but never read or edit."""

    message = "دسترسی مجاز نیست."

    def has_permission(self, request, view):
        if request.method == "POST":
            return True
        return bool(request.user and request.user.is_staff)
