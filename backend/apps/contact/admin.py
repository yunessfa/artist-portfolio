from django.contrib import admin

from .models import ContactMessage


@admin.register(ContactMessage)
class ContactMessageAdmin(admin.ModelAdmin):
    list_display = ("name", "email", "subject", "status", "created_at")
    list_editable = ("status",)
    list_filter = ("status", "subject", "created_at")
    search_fields = ("name", "email", "message")
    readonly_fields = (
        "name",
        "email",
        "phone",
        "subject",
        "message",
        "artwork",
        "source_page",
        "user_agent",
        "ip_hash",
        "created_at",
    )

    def has_add_permission(self, request):
        return False
