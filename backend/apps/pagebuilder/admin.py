from django.contrib import admin

from .models import Page, PageSection


class PageSectionInline(admin.StackedInline):
    model = PageSection
    extra = 0
    fields = (
        "section_type",
        "is_enabled",
        "order",
        "eyebrow",
        "heading",
        "subheading",
        "body",
        "image",
        "background",
        "spacing",
        "settings",
    )


@admin.register(Page)
class PageAdmin(admin.ModelAdmin):
    list_display = ("title", "slug", "kind", "status", "is_locked")
    list_filter = ("kind", "status")
    inlines = [PageSectionInline]


@admin.register(PageSection)
class PageSectionAdmin(admin.ModelAdmin):
    list_display = ("page", "section_type", "heading", "is_enabled", "order")
    list_editable = ("is_enabled", "order")
    list_filter = ("page", "section_type", "is_enabled")
