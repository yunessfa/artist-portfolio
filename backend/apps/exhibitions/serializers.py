from rest_framework import serializers

from apps.media_library.serializers import MediaAssetSerializer

from .models import Exhibition, ExhibitionImage


class ExhibitionImageSerializer(serializers.ModelSerializer):
    image_detail = MediaAssetSerializer(source="image", read_only=True)
    alt_text = serializers.CharField(read_only=True)

    class Meta:
        model = ExhibitionImage
        fields = (
            "id",
            "exhibition",
            "image",
            "image_detail",
            "caption",
            "alt_override",
            "alt_text",
            "order",
        )


class ExhibitionSerializer(serializers.ModelSerializer):
    cover_detail = MediaAssetSerializer(source="cover", read_only=True)
    state = serializers.CharField(read_only=True)
    state_label = serializers.CharField(read_only=True)
    location_display = serializers.CharField(read_only=True)
    kind_label = serializers.CharField(source="get_kind_display", read_only=True)

    class Meta:
        model = Exhibition
        fields = (
            "id",
            "slug",
            "title",
            "title_en",
            "kind",
            "kind_label",
            "year_label",
            "start_date",
            "end_date",
            "venue",
            "city",
            "country",
            "address",
            "curator",
            "external_url",
            "cover",
            "cover_detail",
            "state",
            "state_label",
            "location_display",
            "is_featured",
            "status",
            "order",
            # The listing pages (landing section + /exhibitions) show a short
            # description under each entry, so it belongs in the list payload.
            "description",
        )


class ExhibitionDetailSerializer(ExhibitionSerializer):
    images = ExhibitionImageSerializer(many=True, read_only=True)
    artworks = serializers.SerializerMethodField()

    class Meta(ExhibitionSerializer.Meta):
        fields = ExhibitionSerializer.Meta.fields + (
            "images",
            "artworks",
            "seo_title",
            "seo_description",
        )

    def get_artworks(self, obj) -> list:
        from apps.artworks.serializers import ArtworkListSerializer

        queryset = obj.artworks.published().with_related()
        return ArtworkListSerializer(queryset, many=True, context=self.context).data
