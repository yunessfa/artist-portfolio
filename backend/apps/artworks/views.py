from django.db.models import F
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.core.mixins import (
    DuplicateMixin,
    PublishMixin,
    ReorderMixin,
    ToggleFeatureMixin,
)
from apps.core.permissions import ReadOnlyOrStaff

from .models import Artwork, ArtworkImage, Category, Collection
from .serializers import (
    ArtworkDetailSerializer,
    ArtworkImageSerializer,
    ArtworkListSerializer,
    ArtworkWriteSerializer,
    CategorySerializer,
    CollectionDetailSerializer,
    CollectionSerializer,
)


class CategoryViewSet(ReorderMixin, viewsets.ModelViewSet):
    serializer_class = CategorySerializer
    permission_classes = [ReadOnlyOrStaff]
    lookup_field = "key"

    def get_queryset(self):
        queryset = Category.objects.all()
        if not (self.request.user and self.request.user.is_staff):
            queryset = queryset.filter(is_active=True)
        return queryset


class ArtworkViewSet(
    ReorderMixin, PublishMixin, DuplicateMixin, ToggleFeatureMixin, viewsets.ModelViewSet
):
    permission_classes = [ReadOnlyOrStaff]
    lookup_field = "slug"
    filterset_fields = ["category", "collection", "availability", "is_featured", "status"]
    search_fields = ["title", "title_en", "technique", "material", "excerpt"]
    ordering_fields = ["order", "year_sort", "created_at", "view_count"]

    def get_queryset(self):
        queryset = Artwork.objects.with_related()
        if not (self.request.user and self.request.user.is_staff):
            queryset = queryset.published()
        return queryset

    def get_serializer_class(self):
        if self.action in {"create", "update", "partial_update"}:
            return ArtworkWriteSerializer
        if self.action == "retrieve":
            return ArtworkDetailSerializer
        return ArtworkListSerializer

    def retrieve(self, request, *args, **kwargs):
        response = super().retrieve(request, *args, **kwargs)
        # count the view without touching updated_at
        if not (request.user and request.user.is_staff):
            Artwork.objects.filter(pk=self.get_object().pk).update(
                view_count=F("view_count") + 1
            )
        return response

    @action(detail=False, methods=["get"])
    def featured(self, request):
        queryset = self.get_queryset().featured()[:12]
        return Response(
            ArtworkListSerializer(
                queryset, many=True, context=self.get_serializer_context()
            ).data
        )


class ArtworkImageViewSet(ReorderMixin, viewsets.ModelViewSet):
    queryset = ArtworkImage.objects.select_related("image").prefetch_related(
        "image__variants"
    )
    serializer_class = ArtworkImageSerializer
    permission_classes = [ReadOnlyOrStaff]
    filterset_fields = ["artwork", "role", "is_cover"]

    @action(detail=True, methods=["post"], url_path="set-cover")
    def set_cover(self, request, pk=None):
        image = self.get_object()
        image.is_cover = True
        image.save()
        return Response(self.get_serializer(image).data)


class CollectionViewSet(
    ReorderMixin, PublishMixin, ToggleFeatureMixin, viewsets.ModelViewSet
):
    permission_classes = [ReadOnlyOrStaff]
    lookup_field = "slug"
    filterset_fields = ["is_featured", "status"]

    def get_queryset(self):
        queryset = Collection.objects.select_related("cover").prefetch_related(
            "cover__variants"
        )
        if not (self.request.user and self.request.user.is_staff):
            queryset = queryset.published()
        return queryset

    def get_serializer_class(self):
        if self.action == "retrieve":
            return CollectionDetailSerializer
        return CollectionSerializer
