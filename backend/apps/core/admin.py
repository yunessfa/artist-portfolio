from django.contrib import admin

from .models import NavigationItem, SiteSetting, SocialLink


@admin.register(SiteSetting)
class SiteSettingAdmin(admin.ModelAdmin):
    list_display = ("site_name", "email", "maintenance_mode", "updated_at")

    def has_add_permission(self, request):
        return not SiteSetting.objects.exists()

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(NavigationItem)
class NavigationItemAdmin(admin.ModelAdmin):
    list_display = ("label", "url", "location", "is_active", "order")
    list_editable = ("is_active", "order")
    list_filter = ("location", "is_active")


@admin.register(SocialLink)
class SocialLinkAdmin(admin.ModelAdmin):
    list_display = ("platform", "label", "url", "is_active", "order")
    list_editable = ("is_active", "order")
