from django.contrib import admin

from .models import (
    Artist,
    Award,
    CVEntry,
    Education,
    Medium,
    Publication,
    Service,
    Stat,
    Testimonial,
    TimelineEntry,
)


@admin.register(Artist)
class ArtistAdmin(admin.ModelAdmin):
    list_display = ("name", "role", "city", "email")

    def has_add_permission(self, request):
        return not Artist.objects.exists()

    def has_delete_permission(self, request, obj=None):
        return False


class _OrderedAdmin(admin.ModelAdmin):
    list_editable = ("is_active", "order")


@admin.register(Medium)
class MediumAdmin(_OrderedAdmin):
    list_display = ("label", "label_en", "is_active", "order")


@admin.register(Stat)
class StatAdmin(_OrderedAdmin):
    list_display = ("value", "suffix", "label", "is_active", "order")


@admin.register(Education)
class EducationAdmin(_OrderedAdmin):
    list_display = ("year", "degree", "institution", "is_active", "order")


@admin.register(Award)
class AwardAdmin(_OrderedAdmin):
    list_display = ("year", "title", "issuer", "is_active", "order")


@admin.register(Publication)
class PublicationAdmin(_OrderedAdmin):
    list_display = ("year", "title", "publisher", "is_active", "order")


@admin.register(TimelineEntry)
class TimelineEntryAdmin(_OrderedAdmin):
    list_display = ("year", "title", "is_active", "order")


@admin.register(Testimonial)
class TestimonialAdmin(_OrderedAdmin):
    list_display = ("author", "source", "is_active", "order")


@admin.register(Service)
class ServiceAdmin(_OrderedAdmin):
    list_display = ("title", "icon", "is_active", "order")


@admin.register(CVEntry)
class CVEntryAdmin(_OrderedAdmin):
    list_display = ("section", "year", "title", "place", "is_active", "order")
    list_filter = ("section", "is_active")
    search_fields = ("title", "place")
