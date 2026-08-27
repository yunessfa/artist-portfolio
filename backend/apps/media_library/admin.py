from django.contrib import admin
from django.utils.html import format_html

from .models import MediaAsset, MediaFolder, MediaVariant


class MediaVariantInline(admin.TabularInline):
    model = MediaVariant
    extra = 0
    readonly_fields = ("file", "width", "height", "image_format", "file_size")
    can_delete = False


@admin.register(MediaFolder)
class MediaFolderAdmin(admin.ModelAdmin):
    list_display = ("name", "parent", "created_at")


@admin.register(MediaAsset)
class MediaAssetAdmin(admin.ModelAdmin):
    list_display = ("preview", "title", "kind", "width", "height", "file_size", "created_at")
    list_filter = ("kind", "folder")
    search_fields = ("title", "alt_text", "caption")
    readonly_fields = (
        "mime_type",
        "file_size",
        "width",
        "height",
        "checksum",
        "dominant_color",
        "placeholder",
    )
    inlines = [MediaVariantInline]

    @admin.display(description="پیش‌نمایش")
    def preview(self, obj):
        if obj.kind == MediaAsset.Kind.IMAGE and obj.file:
            return format_html(
                '<img src="{}" style="height:48px;border-radius:4px" />', obj.file.url
            )
        return "—"
