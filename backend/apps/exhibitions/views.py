from rest_framework import viewsets

from apps.core.mixins import PublishMixin, ReorderMixin, ToggleFeatureMixin
from apps.core.permissions import ReadOnlyOrStaff

from .models import Exhibition, ExhibitionImage
from .serializers import (
    ExhibitionDetailSerializer,
    ExhibitionImageSerializer,
    ExhibitionSerializer,
)


class ExhibitionViewSet(
    ReorderMixin, PublishMixin, ToggleFeatureMixin, viewsets.ModelViewSet
):
    permission_classes = [ReadOnlyOrStaff]
    lookup_field = "slug"
    filterset_fields = ["kind", "is_featured", "status", "city", "country"]
    search_fields = ["title", "venue", "city"]

    def get_queryset(self):
        queryset = Exhibition.objects.select_related("cover").prefetch_related(
            "cover__variants", "images__image__variants"
        )
        if not (self.request.user and self.request.user.is_staff):
            queryset = queryset.published()
        state = self.request.query_params.get("state")
        if state:
            ids = [item.pk for item in queryset if item.state == state]
            queryset = queryset.filter(pk__in=ids)
        return queryset

    def get_serializer_class(self):
        if self.action == "retrieve":
            return ExhibitionDetailSerializer
        return ExhibitionSerializer


class ExhibitionImageViewSet(ReorderMixin, viewsets.ModelViewSet):
    queryset = ExhibitionImage.objects.select_related("image").prefetch_related(
        "image__variants"
    )
    serializer_class = ExhibitionImageSerializer
    permission_classes = [ReadOnlyOrStaff]
    filterset_fields = ["exhibition"]
