from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.core.mixins import DuplicateMixin, PublishMixin, ReorderMixin
from apps.core.permissions import ReadOnlyOrStaff

from .models import Page, PageSection
from .serializers import (
    PageSectionSerializer,
    PageSerializer,
    SectionCatalogSerializer,
)


class PageViewSet(PublishMixin, viewsets.ModelViewSet):
    serializer_class = PageSerializer
    permission_classes = [ReadOnlyOrStaff]
    lookup_field = "slug"

    def get_queryset(self):
        queryset = Page.objects.prefetch_related("sections__image__variants")
        if not (self.request.user and self.request.user.is_staff):
            queryset = queryset.published()
        return queryset

    @action(detail=False, methods=["get"], url_path="section-catalog")
    def section_catalog(self, request):
        return Response(SectionCatalogSerializer(None).data)


class PageSectionViewSet(ReorderMixin, DuplicateMixin, viewsets.ModelViewSet):
    queryset = PageSection.objects.select_related("page", "image").prefetch_related(
        "image__variants"
    )
    serializer_class = PageSectionSerializer
    permission_classes = [ReadOnlyOrStaff]
    filterset_fields = ["page", "section_type", "is_enabled"]

    @action(detail=True, methods=["post"])
    def toggle(self, request, pk=None):
        section = self.get_object()
        section.is_enabled = not section.is_enabled
        section.save(update_fields=["is_enabled", "updated_at"])
        return Response(self.get_serializer(section).data)
