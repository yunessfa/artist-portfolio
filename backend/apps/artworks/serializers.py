"""Artwork, collection and category serializers.

List serializers stay deliberately light (grid cards); the detail serializer
returns everything the artwork page needs in a single request, including
Schema.org VisualArtwork structured data.
"""

from rest_framework import serializers

from apps.media_library.serializers import MediaAssetSerializer

from .models import (
    Artwork,
    ArtworkImage,
    Category,
    Collection,
    SculptureDetail,
)


class CategorySerializer(serializers.ModelSerializer):
    artwork_count = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = (
            "id",
            "key",
            "label",
            "label_en",
            "description",
            "is_active",
            "order",
            "artwork_count",
        )

    def get_artwork_count(self, obj) -> int:
        return obj.artworks.published().count()


class SculptureDetailSerializer(serializers.ModelSerializer):
    dimensions_display = serializers.CharField(read_only=True)

    class Meta:
        model = SculptureDetail
        fields = (
            "material",
            "height_cm",
            "width_cm",
            "depth_cm",
            "weight_kg",
            "edition",
            "foundry",
            "patina",
            "location",
            "outdoor_suitable",
            "dimensions_display",
        )


class ArtworkImageSerializer(serializers.ModelSerializer):
    image_detail = MediaAssetSerializer(source="image", read_only=True)
    alt_text = serializers.CharField(read_only=True)

    class Meta:
        model = ArtworkImage
        fields = (
            "id",
            "artwork",
            "image",
            "image_detail",
            "role",
            "caption",
            "alt_override",
            "alt_text",
            "is_cover",
            "order",
        )


class ArtworkListSerializer(serializers.ModelSerializer):
    hero = MediaAssetSerializer(source="hero_image", read_only=True)
    # `cover` is the name the gallery cards and the artwork hero read. Without
    # it every card fell back to an empty placeholder, which is why featured
    # works showed no images. `hero_image` is also exposed as a plain id so the
    # admin form can pre-select the current cover.
    cover = MediaAssetSerializer(source="hero_image", read_only=True)
    category_key = serializers.CharField(source="category.key", read_only=True, default="")
    category_label = serializers.CharField(source="category.label", read_only=True, default="")
    collection_slug = serializers.CharField(source="collection.slug", read_only=True, default="")
    availability_label = serializers.CharField(source="get_availability_display", read_only=True)

    class Meta:
        model = Artwork
        fields = (
            "id",
            "slug",
            "title",
            "title_en",
            "year",
            "technique",
            "material",
            "dimensions",
            "excerpt",
            "category",
            "category_key",
            "category_label",
            "collection",
            "collection_slug",
            "availability",
            "availability_label",
            "price",
            "price_currency",
            "show_price",
            "layout_span",
            "is_featured",
            "status",
            "order",
            "hero",
            "cover",
            "hero_image",
        )


class ArtworkDetailSerializer(ArtworkListSerializer):
    images = ArtworkImageSerializer(many=True, read_only=True)
    sculpture = SculptureDetailSerializer(source="sculpture_detail", read_only=True)
    related = serializers.SerializerMethodField()
    neighbours = serializers.SerializerMethodField()
    seo = serializers.SerializerMethodField()
    structured_data = serializers.SerializerMethodField()

    class Meta(ArtworkListSerializer.Meta):
        fields = ArtworkListSerializer.Meta.fields + (
            "medium",
            "description",
            "concept",
            "artist_note",
            "allow_zoom",
            "view_count",
            "images",
            "sculpture",
            "related",
            "neighbours",
            "seo",
            "structured_data",
            "created_at",
            "updated_at",
        )

    # ------------------------------------------------------------------ #
    def get_related(self, obj) -> list:
        manual = obj.related_artworks.published().with_related()[:6]
        items = list(manual)
        if len(items) < 3:
            fill = (
                Artwork.objects.published()
                .with_related()
                .exclude(pk=obj.pk)
                .exclude(pk__in=[item.pk for item in items])
            )
            if obj.collection_id:
                fill = fill.filter(collection_id=obj.collection_id)
            elif obj.category_id:
                fill = fill.filter(category_id=obj.category_id)
            items.extend(list(fill[: 6 - len(items)]))
        return ArtworkListSerializer(items, many=True, context=self.context).data

    def get_neighbours(self, obj) -> dict:
        """Previous / next in the artist-defined display order."""
        queryset = Artwork.objects.published()
        previous = queryset.filter(order__lt=obj.order).order_by("-order").first()
        nxt = queryset.filter(order__gt=obj.order).order_by("order").first()
        shape = lambda item: (
            {"slug": item.slug, "title": item.title} if item else None
        )
        return {"previous": shape(previous), "next": shape(nxt)}

    def get_seo(self, obj) -> dict:
        return {
            "title": obj.seo_title or f"{obj.title} — {obj.year}".strip(" —"),
            "description": obj.seo_description or obj.excerpt or obj.description[:200],
            "keywords": obj.seo_keywords,
            "canonical": obj.canonical_url,
            "noindex": obj.noindex,
            "ogImage": (
                MediaAssetSerializer(obj.og_image, context=self.context).data["url"]
                if obj.og_image_id
                else (
                    MediaAssetSerializer(obj.hero_image, context=self.context).data["url"]
                    if obj.hero_image_id
                    else ""
                )
            ),
        }

    def get_structured_data(self, obj) -> dict:
        """Schema.org VisualArtwork — rendered into the page head."""
        image = ""
        if obj.hero_image_id:
            image = MediaAssetSerializer(obj.hero_image, context=self.context).data["url"]
        return {
            "@context": "https://schema.org",
            "@type": "VisualArtwork",
            "name": obj.title,
            "alternateName": obj.title_en,
            "dateCreated": obj.year,
            "artMedium": obj.medium or obj.technique,
            "artworkSurface": obj.material,
            "artform": obj.category.label if obj.category_id else "",
            "description": obj.excerpt or obj.description,
            "image": image,
            "width": obj.dimensions,
        }


class ArtworkWriteSerializer(serializers.ModelSerializer):
    """Admin-panel writes. Slug stays optional and stable."""

    sculpture = SculptureDetailSerializer(required=False)

    class Meta:
        model = Artwork
        exclude = ("year_sort", "view_count")
        extra_kwargs = {"slug": {"required": False, "allow_blank": True}}

    def _write_sculpture(self, artwork, data):
        if data is None:
            return
        SculptureDetail.objects.update_or_create(artwork=artwork, defaults=data)

    def create(self, validated_data):
        sculpture = validated_data.pop("sculpture", None)
        related = validated_data.pop("related_artworks", [])
        artwork = Artwork.objects.create(**validated_data)
        if related:
            artwork.related_artworks.set(related)
        self._write_sculpture(artwork, sculpture)
        return artwork

    def update(self, instance, validated_data):
        sculpture = validated_data.pop("sculpture", None)
        related = validated_data.pop("related_artworks", None)
        for field, value in validated_data.items():
            setattr(instance, field, value)
        instance.save()
        if related is not None:
            instance.related_artworks.set(related)
        self._write_sculpture(instance, sculpture)
        return instance


class CollectionSerializer(serializers.ModelSerializer):
    cover_detail = MediaAssetSerializer(source="cover", read_only=True)
    artwork_count = serializers.SerializerMethodField()

    class Meta:
        model = Collection
        fields = (
            "id",
            "slug",
            "title",
            "title_en",
            "subtitle",
            "description",
            "year",
            "cover",
            "cover_detail",
            "is_featured",
            "status",
            "order",
            "artwork_count",
        )

    def get_artwork_count(self, obj) -> int:
        return obj.artworks.published().count()


class CollectionDetailSerializer(CollectionSerializer):
    artworks = serializers.SerializerMethodField()

    class Meta(CollectionSerializer.Meta):
        fields = CollectionSerializer.Meta.fields + (
            "statement",
            "artworks",
            "seo_title",
            "seo_description",
        )

    def get_artworks(self, obj) -> list:
        queryset = obj.artworks.published().with_related()
        return ArtworkListSerializer(queryset, many=True, context=self.context).data
