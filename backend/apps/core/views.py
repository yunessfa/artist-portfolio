"""Site-level endpoints, including the single `bootstrap` call the frontend
uses to paint its first frame, plus robots.txt and sitemap.xml.
"""

from django.http import HttpResponse, JsonResponse
from django.views import View
from rest_framework import viewsets
from rest_framework.decorators import api_view, permission_classes
from rest_framework.generics import RetrieveUpdateAPIView
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from .mixins import ReorderMixin
from .models import NavigationItem, SiteSetting, SocialLink
from .permissions import ReadOnlyOrStaff, StaffOnly
from .serializers import (
    NavigationItemSerializer,
    PublicSiteSettingSerializer,
    SiteSettingSerializer,
    SocialLinkSerializer,
)


class SiteSettingView(RetrieveUpdateAPIView):
    permission_classes = [ReadOnlyOrStaff]

    def get_object(self):
        return SiteSetting.load()

    def get_serializer_class(self):
        user = self.request.user
        if user and user.is_staff:
            return SiteSettingSerializer
        return PublicSiteSettingSerializer


class NavigationItemViewSet(ReorderMixin, viewsets.ModelViewSet):
    serializer_class = NavigationItemSerializer
    permission_classes = [ReadOnlyOrStaff]
    filterset_fields = ["location", "is_active"]

    def get_queryset(self):
        queryset = NavigationItem.objects.all()
        user = self.request.user
        if not (user and user.is_staff):
            queryset = queryset.filter(is_active=True)
        return queryset


class SocialLinkViewSet(ReorderMixin, viewsets.ModelViewSet):
    serializer_class = SocialLinkSerializer
    permission_classes = [ReadOnlyOrStaff]

    def get_queryset(self):
        queryset = SocialLink.objects.all()
        user = self.request.user
        if not (user and user.is_staff):
            queryset = queryset.filter(is_active=True)
        return queryset


@api_view(["GET"])
@permission_classes([AllowAny])
def bootstrap(request):
    """Everything needed for the first paint, in one request.

    settings + resolved theme (+ seasons/themes for the switcher) + navigation
    + socials + categories + featured artworks + the homepage section tree.
    """
    from apps.artist.models import Artist, Medium, Stat
    from apps.artist.serializers import (
        ArtistSerializer,
        MediumSerializer,
        StatSerializer,
    )
    from apps.artworks.models import Artwork, Category
    from apps.artworks.serializers import (
        ArtworkListSerializer,
        CategorySerializer,
    )
    from apps.pagebuilder.models import Page
    from apps.pagebuilder.serializers import PageSerializer
    from apps.theming.models import Season, Theme, ThemeConfig
    from apps.theming.serializers import (
        SeasonSerializer,
        ThemeSerializer,
        resolve_theme,
    )

    context = {"request": request}
    config = ThemeConfig.load()

    mode = request.query_params.get("mode")
    season = request.query_params.get("season")
    if not config.allow_visitor_override:
        mode = season = None

    home = (
        Page.objects.filter(kind=Page.Kind.HOME)
        .prefetch_related("sections__image__variants")
        .first()
    )

    return Response(
        {
            "settings": PublicSiteSettingSerializer(
                SiteSetting.load(), context=context
            ).data,
            "artist": ArtistSerializer(Artist.load(), context=context).data,
            "theme": resolve_theme(config, context=context, mode=mode, season_key=season),
            "themes": ThemeSerializer(
                Theme.objects.prefetch_related("variants"), many=True, context=context
            ).data,
            "seasons": SeasonSerializer(
                Season.objects.filter(is_active=True), many=True, context=context
            ).data,
            "navigation": NavigationItemSerializer(
                NavigationItem.objects.filter(is_active=True), many=True, context=context
            ).data,
            "socials": SocialLinkSerializer(
                SocialLink.objects.filter(is_active=True), many=True, context=context
            ).data,
            "categories": CategorySerializer(
                Category.objects.filter(is_active=True), many=True, context=context
            ).data,
            "stats": StatSerializer(
                Stat.objects.filter(is_active=True), many=True, context=context
            ).data,
            "mediums": MediumSerializer(
                Medium.objects.filter(is_active=True), many=True, context=context
            ).data,
            "featured": ArtworkListSerializer(
                Artwork.objects.published().featured().with_related()[:12],
                many=True,
                context=context,
            ).data,
            "home": PageSerializer(home, context=context).data if home else None,
        }
    )


class RobotsTxtView(View):
    def get(self, request):
        settings_obj = SiteSetting.load()
        site = request.build_absolute_uri("/").rstrip("/")
        lines = ["User-agent: *"]
        if settings_obj.maintenance_mode:
            lines.append("Disallow: /")
        else:
            lines += [
                "Disallow: /admin-panel/",
                "Disallow: /django-admin/",
                "Disallow: /api/",
                "Allow: /",
            ]
        lines.append(f"Sitemap: {site}/sitemap.xml")
        if settings_obj.robots_extra:
            lines.append(settings_obj.robots_extra)
        return HttpResponse("\n".join(lines) + "\n", content_type="text/plain")


class SitemapView(View):
    """Hand-rolled sitemap so artwork, collection and exhibition slugs are all
    included with their real last-modified timestamps.
    """

    def get(self, request):
        from apps.artworks.models import Artwork, Collection
        from apps.exhibitions.models import Exhibition
        from apps.pagebuilder.models import Page

        base = request.build_absolute_uri("/").rstrip("/")
        entries = [(f"{base}/", None, "1.0")]

        for artwork in Artwork.objects.published():
            if not artwork.noindex:
                entries.append(
                    (f"{base}/artworks/{artwork.slug}", artwork.updated_at, "0.9")
                )
        for collection in Collection.objects.published():
            entries.append(
                (f"{base}/collections/{collection.slug}", collection.updated_at, "0.8")
            )
        for exhibition in Exhibition.objects.published():
            entries.append(
                (f"{base}/exhibitions/{exhibition.slug}", exhibition.updated_at, "0.7")
            )
        for page in Page.objects.published().exclude(kind=Page.Kind.HOME):
            entries.append((f"{base}/{page.slug}", page.updated_at, "0.6"))

        parts = [
            '<?xml version="1.0" encoding="UTF-8"?>',
            '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
        ]
        for loc, lastmod, priority in entries:
            parts.append("  <url>")
            parts.append(f"    <loc>{loc}</loc>")
            if lastmod:
                parts.append(f"    <lastmod>{lastmod.date().isoformat()}</lastmod>")
            parts.append(f"    <priority>{priority}</priority>")
            parts.append("  </url>")
        parts.append("</urlset>")
        return HttpResponse("\n".join(parts), content_type="application/xml")


def health(request):
    """Container HEALTHCHECK target — also verifies the DB connection."""
    from django.db import connection

    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
        database = "ok"
    except Exception as exc:  # pragma: no cover
        return JsonResponse({"status": "error", "database": str(exc)}, status=503)
    return JsonResponse({"status": "ok", "database": database})
