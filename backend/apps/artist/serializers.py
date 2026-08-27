"""Artist profile + CV serializers."""

from rest_framework import serializers

from apps.media_library.models import MediaAsset
from apps.media_library.serializers import MediaAssetSerializer

from .models import (
    Artist,
    Award,
    CVEntry,
    CVSection,
    Education,
    Medium,
    Publication,
    Service,
    Stat,
    Testimonial,
    TimelineEntry,
)


def media_pk_field(required: bool = False):
    """Writable media FK used across the admin serializers."""
    return serializers.PrimaryKeyRelatedField(
        queryset=MediaAsset.objects.all(),
        required=required,
        allow_null=True,
    )


class ArtistSerializer(serializers.ModelSerializer):
    portrait_detail = MediaAssetSerializer(source="portrait", read_only=True)
    studio_image_detail = MediaAssetSerializer(source="studio_image", read_only=True)
    cv_file_detail = MediaAssetSerializer(source="cv_file", read_only=True)
    hero_lines = serializers.ListField(child=serializers.CharField(), read_only=True)

    class Meta:
        model = Artist
        fields = "__all__"


class MediumSerializer(serializers.ModelSerializer):
    class Meta:
        model = Medium
        fields = ("id", "label", "label_en", "is_active", "order")


class StatSerializer(serializers.ModelSerializer):
    class Meta:
        model = Stat
        fields = ("id", "value", "suffix", "label", "is_active", "order")


class EducationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Education
        fields = (
            "id",
            "year",
            "degree",
            "institution",
            "city",
            "description",
            "is_active",
            "order",
        )


class AwardSerializer(serializers.ModelSerializer):
    class Meta:
        model = Award
        fields = ("id", "year", "title", "issuer", "description", "is_active", "order")


class PublicationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Publication
        fields = (
            "id",
            "year",
            "title",
            "publisher",
            "author",
            "url",
            "is_active",
            "order",
        )


class TimelineEntrySerializer(serializers.ModelSerializer):
    image_detail = MediaAssetSerializer(source="image", read_only=True)

    class Meta:
        model = TimelineEntry
        fields = (
            "id",
            "year",
            "title",
            "body",
            "image",
            "image_detail",
            "is_active",
            "order",
        )


class TestimonialSerializer(serializers.ModelSerializer):
    avatar_detail = MediaAssetSerializer(source="avatar", read_only=True)

    class Meta:
        model = Testimonial
        fields = (
            "id",
            "text",
            "author",
            "source",
            "url",
            "avatar",
            "avatar_detail",
            "is_active",
            "order",
        )


class ServiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Service
        fields = (
            "id",
            "title",
            "description",
            "icon",
            "cta_label",
            "cta_url",
            "is_active",
            "order",
        )


class CVEntrySerializer(serializers.ModelSerializer):
    section_label = serializers.CharField(source="get_section_display", read_only=True)

    class Meta:
        model = CVEntry
        fields = (
            "id",
            "section",
            "section_label",
            "year",
            "title",
            "place",
            "description",
            "url",
            "is_active",
            "order",
        )


class CVSerializer(serializers.Serializer):
    """The whole CV, grouped by section — one request for the resume page."""

    def to_representation(self, instance):
        entries = CVEntry.objects.filter(is_active=True)
        grouped = []
        for key, label in CVSection.choices:
            rows = [entry for entry in entries if entry.section == key]
            if not rows:
                continue
            grouped.append(
                {
                    "key": key,
                    "label": str(label),
                    "entries": CVEntrySerializer(
                        rows, many=True, context=self.context
                    ).data,
                }
            )
        return {"sections": grouped}
