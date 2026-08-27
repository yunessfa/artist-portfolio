from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework.views import APIView

from apps.core.mixins import DuplicateMixin, ReorderMixin
from apps.core.permissions import ReadOnlyOrStaff, StaffOnly

from .models import Season, Theme, ThemeConfig
from .serializers import (
    SeasonSerializer,
    ThemeConfigSerializer,
    ThemeSerializer,
    resolve_theme,
)


class ThemeViewSet(ReorderMixin, DuplicateMixin, viewsets.ModelViewSet):
    queryset = Theme.objects.prefetch_related("variants")
    serializer_class = ThemeSerializer
    permission_classes = [ReadOnlyOrStaff]
    lookup_field = "key"

    @action(detail=True, methods=["post"], permission_classes=[StaffOnly])
    def activate(self, request, key=None):
        """Persist the active theme in the database — not localStorage."""
        theme = self.get_object()
        Theme.objects.update(is_active=False)
        theme.is_active = True
        theme.save(update_fields=["is_active"])

        config = ThemeConfig.load()
        config.active_theme = theme
        config.save(update_fields=["active_theme", "updated_at"])
        return Response(resolve_theme(config, context={"request": request}))

    @action(detail=True, methods=["get"])
    def preview(self, request, key=None):
        """Resolved tokens for a theme without activating it (admin preview)."""
        theme = self.get_object()
        config = ThemeConfig.load()
        original = config.active_theme
        config.active_theme = theme
        data = resolve_theme(
            config,
            context={"request": request},
            mode=request.query_params.get("mode"),
            season_key=request.query_params.get("season"),
        )
        config.active_theme = original
        return Response(data)


class SeasonViewSet(ReorderMixin, viewsets.ModelViewSet):
    queryset = Season.objects.all()
    serializer_class = SeasonSerializer
    permission_classes = [ReadOnlyOrStaff]
    lookup_field = "key"


class ActiveThemeView(APIView):
    """GET  → resolved theme for the current visitor.
    PATCH → staff-only theme configuration + token overrides (customizer).
    """

    permission_classes = [AllowAny]

    def get(self, request):
        config = ThemeConfig.load()
        mode = request.query_params.get("mode")
        season = request.query_params.get("season")
        if not config.allow_visitor_override:
            mode = season = None
        return Response(
            resolve_theme(config, context={"request": request}, mode=mode, season_key=season)
        )

    def patch(self, request):
        if not (request.user and request.user.is_staff):
            return Response({"detail": "دسترسی مجاز نیست."}, status=403)
        config = ThemeConfig.load()
        serializer = ThemeConfigSerializer(
            config, data=request.data, partial=True, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)
