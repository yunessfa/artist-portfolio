"""Media serializers.

Every image is returned with its full responsive set (srcset per format) plus
an LQIP placeholder and intrinsic dimensions, so the frontend can render
responsive, zero-layout-shift images with zero extra requests.
"""

from rest_framework import serializers

from .models import MediaAsset, MediaFolder, MediaVariant, validate_upload


class MediaVariantSerializer(serializers.ModelSerializer):
    url = serializers.SerializerMethodField()

    class Meta:
        model = MediaVariant
        fields = ("id", "url", "width", "height", "image_format", "file_size")

    def get_url(self, obj) -> str:
        request = self.context.get("request")
        if not obj.file:
            return ""
        url = obj.file.url
        return request.build_absolute_uri(url) if request else url


class MediaFolderSerializer(serializers.ModelSerializer):
    asset_count = serializers.IntegerField(source="assets.count", read_only=True)

    class Meta:
        model = MediaFolder
        fields = ("id", "name", "parent", "asset_count", "created_at")


class MediaAssetSerializer(serializers.ModelSerializer):
    url = serializers.SerializerMethodField()
    thumbnail = serializers.SerializerMethodField()
    srcset = serializers.SerializerMethodField()
    sources = serializers.SerializerMethodField()
    aspect_ratio = serializers.FloatField(read_only=True)
    variants = MediaVariantSerializer(many=True, read_only=True)
    usage_count = serializers.SerializerMethodField()

    class Meta:
        model = MediaAsset
        fields = (
            "id",
            "url",
            "thumbnail",
            "srcset",
            "sources",
            "kind",
            "title",
            "alt_text",
            "alt_text_en",
            "caption",
            "folder",
            "mime_type",
            "file_size",
            "width",
            "height",
            "aspect_ratio",
            "dominant_color",
            "placeholder",
            "variants",
            "usage_count",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "mime_type",
            "file_size",
            "width",
            "height",
            "dominant_color",
            "placeholder",
        )

    # ------------------------------------------------------------------ #
    def _absolute(self, url: str) -> str:
        request = self.context.get("request")
        return request.build_absolute_uri(url) if request and url else url

    def get_url(self, obj) -> str:
        return self._absolute(obj.file.url) if obj.file else ""

    def get_thumbnail(self, obj) -> str:
        target = None
        for variant in obj.variants.all():
            if variant.image_format == "webp" and (
                target is None or variant.width < target.width
            ):
                target = variant
        if target is not None and target.file:
            return self._absolute(target.file.url)
        return self.get_url(obj)

    def get_srcset(self, obj) -> str:
        parts = [
            f"{self._absolute(variant.file.url)} {variant.width}w"
            for variant in obj.variants.all()
            if variant.image_format == "webp" and variant.file
        ]
        return ", ".join(parts)

    def get_sources(self, obj) -> list[dict]:
        """Grouped per format so the frontend can emit a <picture> element."""
        buckets: dict[str, list] = {}
        for variant in obj.variants.all():
            if variant.file:
                buckets.setdefault(variant.image_format, []).append(variant)
        # AVIF first (best compression), then WebP as the fallback
        order = ["avif", "webp"]
        result = []
        for image_format in order + [f for f in buckets if f not in order]:
            variants = sorted(buckets.get(image_format, []), key=lambda v: v.width)
            if not variants:
                continue
            result.append(
                {
                    "type": f"image/{image_format}",
                    "srcset": ", ".join(
                        f"{self._absolute(v.file.url)} {v.width}w" for v in variants
                    ),
                }
            )
        return result

    def get_usage_count(self, obj) -> int:
        """How many places reference this asset (used by the ‘unused’ filter)."""
        counters = (
            "artwork_images",
            "artwork_heroes",
            "collection_covers",
            "exhibition_covers",
            "exhibition_images",
            "page_sections",
            "timeline_entries",
            "testimonial_avatars",
            "artist_portraits",
            "artist_studios",
            "artist_cvs",
        )
        total = 0
        for name in counters:
            manager = getattr(obj, name, None)
            if manager is not None:
                try:
                    total += manager.count()
                except Exception:
                    pass
        return total


class MediaAssetUploadSerializer(serializers.ModelSerializer):
    file = serializers.FileField(write_only=True)

    class Meta:
        model = MediaAsset
        fields = ("file", "kind", "title", "alt_text", "caption", "folder")

    def validate_file(self, uploaded):
        detected = validate_upload(uploaded)
        self._detected_mime = detected
        return uploaded

    def create(self, validated_data):
        uploaded = validated_data["file"]
        validated_data.setdefault("title", uploaded.name)
        mime = getattr(self, "_detected_mime", "") or ""
        if mime:
            validated_data["mime_type"] = mime
        if not validated_data.get("kind"):
            if mime.startswith("video/"):
                validated_data["kind"] = MediaAsset.Kind.VIDEO
            elif mime.startswith("image/"):
                validated_data["kind"] = MediaAsset.Kind.IMAGE
            else:
                validated_data["kind"] = MediaAsset.Kind.DOCUMENT
        return super().create(validated_data)


class UploadLimitsSerializer(serializers.Serializer):
    """Exposes the server-side upload rules so the admin UI can pre-validate."""

    max_size_mb = serializers.IntegerField()
    max_size_bytes = serializers.IntegerField()
    allowed_extensions = serializers.ListField(child=serializers.CharField())
    allowed_mime_types = serializers.ListField(child=serializers.CharField())
    variant_widths = serializers.ListField(child=serializers.IntegerField())
    variant_formats = serializers.ListField(child=serializers.CharField())
