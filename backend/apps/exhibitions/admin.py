from django.contrib import admin

from .models import Exhibition, ExhibitionImage


class ExhibitionImageInline(admin.TabularInline):
    model = ExhibitionImage
    extra = 1


@admin.register(Exhibition)
class ExhibitionAdmin(admin.ModelAdmin):
    list_display = (
        "title",
        "kind",
        "year_label",
        "venue",
        "city",
        "state_label",
        "status",
        "order",
    )
    list_editable = ("status", "order")
    list_filter = ("kind", "status", "city", "country")
    search_fields = ("title", "venue", "city")
    filter_horizontal = ("artworks",)
    inlines = [ExhibitionImageInline]

    @admin.display(description="وضعیت زمانی")
    def state_label(self, obj):
        return obj.state_label
