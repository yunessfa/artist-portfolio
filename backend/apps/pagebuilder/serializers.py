from rest_framework import serializers

from apps.media_library.serializers import MediaAssetSerializer

from .models import SECTION_SCHEMA, Page, PageSection, SectionType


class PageSectionSerializer(serializers.ModelSerializer):
    image_detail = MediaAssetSerializer(source="image", read_only=True)
    section_label = serializers.CharField(
        source="get_section_type_display", read_only=True
    )
    schema = serializers.DictField(read_only=True)

    class Meta:
        model = PageSection
        fields = (
            "id",
            "page",
            "section_type",
            "section_label",
            "eyebrow",
            "heading",
            "subheading",
            "body",
            "image",
            "image_detail",
            "settings",
            "is_enabled",
            "background",
            "spacing",
            "order",
            "schema",
        )


class PageSerializer(serializers.ModelSerializer):
    sections = serializers.SerializerMethodField()

    class Meta:
        model = Page
        fields = (
            "id",
            "slug",
            "title",
            "title_en",
            "kind",
            "is_locked",
            "status",
            "seo_title",
            "seo_description",
            "sections",
        )

    def get_sections(self, obj) -> list:
        queryset = obj.sections.select_related("image").prefetch_related(
            "image__variants"
        )
        # visitors only ever receive enabled sections
        request = self.context.get("request")
        if not (request and request.user and request.user.is_staff):
            queryset = queryset.filter(is_enabled=True)
        return PageSectionSerializer(queryset, many=True, context=self.context).data


class SectionCatalogSerializer(serializers.Serializer):
    """Feeds the “add section” picker in the admin page builder."""

    def to_representation(self, instance):
        catalog = []
        for key, label in SectionType.choices:
            schema = SECTION_SCHEMA.get(key, {})
            catalog.append(
                {
                    "type": key,
                    "label": str(schema.get("label", label)),
                    "description": str(schema.get("description", "")),
                    "fields": schema.get("fields", {}),
                    "uses": schema.get("uses", []),
                }
            )
        return {"sections": catalog}
