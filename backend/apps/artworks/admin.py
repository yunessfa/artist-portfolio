from django.contrib import admin
from django.utils.html import format_html

from .models import Artwork, ArtworkImage, Category, Collection, SculptureDetail


class ArtworkImageInline(admin.TabularInline):
    model = ArtworkImage
    extra = 1
    fields = ("image", "role", "caption", "alt_override", "is_cover", "order")


class SculptureDetailInline(admin.StackedInline):
    model = SculptureDetail
    extra = 0
    max_num = 1


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ("label", "key", "is_active", "order")
    list_editable = ("is_active", "order")


@admin.register(Collection)
class CollectionAdmin(admin.ModelAdmin):
    list_display = ("title", "year", "status", "is_featured", "order")
    list_editable = ("status", "is_featured", "order")
    list_filter = ("status", "is_featured")
    search_fields = ("title", "title_en")
    prepopulated_fields = {}


@admin.register(Artwork)
class ArtworkAdmin(admin.ModelAdmin):
    list_display = (
        "thumb",
        "title",
        "category",
        "year",
        "availability",
        "status",
        "is_featured",
        "order",
    )
    list_editable = ("status", "is_featured", "order")
    list_filter = ("status", "is_featured", "category", "collection", "availability")
    search_fields = ("title", "title_en", "technique", "material")
    readonly_fields = ("year_sort", "view_count")
    filter_horizontal = ("related_artworks",)
    inlines = [ArtworkImageInline, SculptureDetailInline]
    actions = ["make_published", "make_draft", "duplicate_selected"]
    fieldsets = (
        (None, {"fields": ("title", "title_en", "slug", "category", "collection")}),
        ("مشخصات", {"fields": (
            "year", "year_sort", "technique", "material", "medium", "dimensions",
        )}),
        ("فروش", {"fields": ("availability", "price", "price_currency", "show_price")}),
        ("محتوا", {"fields": ("excerpt", "description", "concept", "artist_note")}),
        ("نمایش", {"fields": (
            "hero_image", "layout_span", "allow_zoom", "is_featured", "order",
            "related_artworks", "view_count",
        )}),
        ("انتشار", {"fields": ("status", "published_at")}),
        ("SEO", {
            "classes": ("collapse",),
            "fields": (
                "seo_title", "seo_description", "seo_keywords", "og_image",
                "canonical_url", "noindex",
            ),
        }),
    )

    @admin.display(description="تصویر")
    def thumb(self, obj):
        if obj.hero_image_id and obj.hero_image.file:
            return format_html(
                '<img src="{}" style="height:44px;border-radius:4px" />',
                obj.hero_image.file.url,
            )
        return "—"

    @admin.action(description="انتشار موارد انتخاب‌شده")
    def make_published(self, request, queryset):
        for artwork in queryset:
            artwork.publish()

    @admin.action(description="بازگرداندن به پیش‌نویس")
    def make_draft(self, request, queryset):
        for artwork in queryset:
            artwork.unpublish()

    @admin.action(description="کپی کردن موارد انتخاب‌شده")
    def duplicate_selected(self, request, queryset):
        for artwork in queryset:
            artwork.duplicate()
