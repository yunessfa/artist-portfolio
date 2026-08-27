"""Site-level serializers: settings, navigation, social links."""

from rest_framework import serializers

from apps.media_library.serializers import MediaAssetSerializer

from .models import NavigationItem, SiteSetting, SocialLink


class SiteSettingSerializer(serializers.ModelSerializer):
    default_og_image_detail = MediaAssetSerializer(
        source="default_og_image", read_only=True
    )
    logo_detail = MediaAssetSerializer(source="logo", read_only=True)
    logo_mark_detail = MediaAssetSerializer(source="logo_mark", read_only=True)
    favicon_detail = MediaAssetSerializer(source="favicon", read_only=True)

    class Meta:
        model = SiteSetting
        fields = (
            "site_name",
            "site_name_en",
            "tagline",
            "description",
            "email",
            "phone",
            "address",
            "studio_note",
            "map_url",
            "default_gallery_layout",
            "artworks_per_page",
            "show_prices",
            "enable_intro_loader",
            "enable_custom_cursor",
            "enable_page_transitions",
            "default_language",
            "enable_english",
            "artist_display_name",
            "logo",
            "logo_detail",
            "logo_mark",
            "logo_mark_detail",
            "favicon",
            "favicon_detail",
            "default_seo_title",
            "default_seo_description",
            "default_og_image",
            "default_og_image_detail",
            "robots_extra",
            "analytics_snippet",
            "maintenance_mode",
            "maintenance_message",
            "updated_at",
        )


class PublicSiteSettingSerializer(serializers.ModelSerializer):
    """What anonymous visitors are allowed to see — no analytics snippet,
    no internal robots configuration.
    """

    default_og_image_detail = MediaAssetSerializer(
        source="default_og_image", read_only=True
    )
    logo_detail = MediaAssetSerializer(source="logo", read_only=True)
    logo_mark_detail = MediaAssetSerializer(source="logo_mark", read_only=True)
    favicon_detail = MediaAssetSerializer(source="favicon", read_only=True)

    class Meta:
        model = SiteSetting
        fields = (
            "site_name",
            "site_name_en",
            "tagline",
            "description",
            "email",
            "phone",
            "address",
            "studio_note",
            "map_url",
            "default_gallery_layout",
            "artworks_per_page",
            "show_prices",
            "enable_intro_loader",
            "enable_custom_cursor",
            "enable_page_transitions",
            "default_language",
            "enable_english",
            "artist_display_name",
            "logo_detail",
            "logo_mark_detail",
            "favicon_detail",
            "default_seo_title",
            "default_seo_description",
            "default_og_image_detail",
            "maintenance_mode",
            "maintenance_message",
        )


class NavigationItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = NavigationItem
        fields = (
            "id",
            "label",
            "label_en",
            "url",
            "location",
            "is_active",
            "open_in_new_tab",
            "parent",
            "order",
        )


class SocialLinkSerializer(serializers.ModelSerializer):
    platform_label = serializers.CharField(
        source="get_platform_display", read_only=True
    )

    class Meta:
        model = SocialLink
        fields = (
            "id",
            "platform",
            "platform_label",
            "label",
            "url",
            "is_active",
            "order",
        )
