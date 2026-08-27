from django.contrib import admin
from django.utils.html import format_html

from .models import Season, Theme, ThemeConfig, ThemeVariant


class ThemeVariantInline(admin.StackedInline):
    model = ThemeVariant
    extra = 0
    max_num = 2


@admin.register(Theme)
class ThemeAdmin(admin.ModelAdmin):
    list_display = ("name", "key", "swatch_preview", "is_active", "is_builtin", "order")
    list_editable = ("order",)
    list_filter = ("is_active", "is_builtin", "motion_style")
    search_fields = ("name", "key", "note")
    inlines = [ThemeVariantInline]

    @admin.display(description="رنگ‌ها")
    def swatch_preview(self, obj):
        return format_html(
            "".join(
                '<span style="display:inline-block;width:18px;height:18px;'
                'border:1px solid #999;background:{}"></span>'
                for _ in obj.swatch
            ),
            *obj.swatch,
        )


@admin.register(Season)
class SeasonAdmin(admin.ModelAdmin):
    list_display = ("name", "key", "icon", "word", "start_code", "end_code", "is_active")
    list_editable = ("is_active",)


@admin.register(ThemeConfig)
class ThemeConfigAdmin(admin.ModelAdmin):
    list_display = (
        "active_theme",
        "mode_strategy",
        "season_strategy",
        "allow_visitor_override",
        "updated_at",
    )

    def has_add_permission(self, request):
        return not ThemeConfig.objects.exists()

    def has_delete_permission(self, request, obj=None):
        return False
