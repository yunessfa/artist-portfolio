from datetime import timedelta

from django.db.models import Count
from django.utils import timezone
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.permissions import StaffOnly

from .models import PageView


class DashboardStatsView(APIView):
    """Real numbers for the admin dashboard — no placeholders."""

    permission_classes = [StaffOnly]

    def get(self, request):
        from apps.artworks.models import Artwork, Collection
        from apps.artworks.serializers import ArtworkListSerializer
        from apps.contact.models import ContactMessage
        from apps.exhibitions.models import Exhibition
        from apps.media_library.models import MediaAsset

        now = timezone.now()
        last_30 = now - timedelta(days=30)
        last_7 = now - timedelta(days=7)
        views = PageView.objects.filter(is_bot=False)

        daily = (
            views.filter(created_at__gte=last_30)
            .extra(select={"day": "date(created_at)"})
            .values("day")
            .annotate(total=Count("id"))
            .order_by("day")
        )

        top_paths = (
            views.filter(created_at__gte=last_30)
            .values("path")
            .annotate(total=Count("id"))
            .order_by("-total")[:10]
        )

        context = {"request": request}
        return Response(
            {
                "counts": {
                    "artworks": Artwork.objects.count(),
                    "artworksPublished": Artwork.objects.published().count(),
                    "artworksDraft": Artwork.objects.drafts().count(),
                    "collections": Collection.objects.count(),
                    "exhibitions": Exhibition.objects.count(),
                    "media": MediaAsset.objects.count(),
                    "messagesNew": ContactMessage.objects.filter(status="new").count(),
                },
                "views": {
                    "total": views.count(),
                    "last7": views.filter(created_at__gte=last_7).count(),
                    "last30": views.filter(created_at__gte=last_30).count(),
                    "uniqueLast30": views.filter(created_at__gte=last_30)
                    .values("visitor_hash")
                    .distinct()
                    .count(),
                    "daily": [
                        {"day": str(row["day"]), "total": row["total"]} for row in daily
                    ],
                    "topPaths": list(top_paths),
                },
                "latestArtworks": ArtworkListSerializer(
                    Artwork.objects.with_related().order_by("-created_at")[:6],
                    many=True,
                    context=context,
                ).data,
                "mostViewed": ArtworkListSerializer(
                    Artwork.objects.published().with_related().order_by("-view_count")[:6],
                    many=True,
                    context=context,
                ).data,
                "recentlyEdited": ArtworkListSerializer(
                    Artwork.objects.with_related().order_by("-updated_at")[:6],
                    many=True,
                    context=context,
                ).data,
            }
        )
