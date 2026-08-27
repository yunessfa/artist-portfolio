from django.conf import settings
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response

from apps.core.pagination import LargePagination
from apps.core.permissions import ReadOnlyOrStaff, StaffOnly

from .models import MediaAsset, MediaFolder
from .serializers import (
    MediaAssetSerializer,
    MediaAssetUploadSerializer,
    MediaFolderSerializer,
    UploadLimitsSerializer,
)


class MediaFolderViewSet(viewsets.ModelViewSet):
    queryset = MediaFolder.objects.all()
    serializer_class = MediaFolderSerializer
    permission_classes = [ReadOnlyOrStaff]


class MediaAssetViewSet(viewsets.ModelViewSet):
    queryset = MediaAsset.objects.prefetch_related("variants")
    serializer_class = MediaAssetSerializer
    permission_classes = [ReadOnlyOrStaff]
    pagination_class = LargePagination
    parser_classes = [MultiPartParser, FormParser]
    filterset_fields = ["kind", "folder"]
    search_fields = ["title", "alt_text", "caption"]
    ordering_fields = ["created_at", "file_size", "title"]

    def get_serializer_class(self):
        if self.action == "create":
            return MediaAssetUploadSerializer
        return MediaAssetSerializer

    def create(self, request, *args, **kwargs):
        """Supports single and multiple (drag & drop) uploads."""
        files = request.FILES.getlist("file")
        if len(files) <= 1:
            response = super().create(request, *args, **kwargs)
            asset = MediaAsset.objects.filter(pk=response.data.get("id")).first()
            if asset is None and files:
                asset = MediaAsset.objects.order_by("-id").first()
            if asset is not None:
                response.data = MediaAssetSerializer(
                    asset, context=self.get_serializer_context()
                ).data
            return response

        created = []
        for uploaded in files:
            serializer = MediaAssetUploadSerializer(
                data={
                    "file": uploaded,
                    "folder": request.data.get("folder"),
                    "alt_text": request.data.get("alt_text", ""),
                },
                context=self.get_serializer_context(),
            )
            serializer.is_valid(raise_exception=True)
            created.append(serializer.save())
        return Response(
            MediaAssetSerializer(
                created, many=True, context=self.get_serializer_context()
            ).data,
            status=201,
        )

    @action(detail=True, methods=["post"], permission_classes=[StaffOnly])
    def regenerate(self, request, pk=None):
        """Rebuild WebP/AVIF variants (e.g. after changing the width list)."""
        asset = self.get_object()
        asset.regenerate()
        return Response(self.get_serializer(asset).data)

    @action(detail=False, methods=["get"])
    def limits(self, request):
        return Response(
            UploadLimitsSerializer(
                {
                    "max_size_mb": settings.MAX_UPLOAD_SIZE_MB,
                    "max_size_bytes": settings.MAX_UPLOAD_SIZE,
                    "allowed_extensions": sorted(settings.ALLOWED_UPLOAD_EXTENSIONS),
                    "allowed_mime_types": sorted(settings.ALLOWED_UPLOAD_MIME_TYPES),
                    "variant_widths": settings.IMAGE_VARIANT_WIDTHS,
                    "variant_formats": settings.IMAGE_VARIANT_FORMATS,
                }
            ).data
        )

    @action(detail=False, methods=["get"])
    def unused(self, request):
        """Assets that nothing references — safe cleanup candidates."""
        items = [
            asset
            for asset in self.filter_queryset(self.get_queryset())
            if MediaAssetSerializer(
                asset, context=self.get_serializer_context()
            ).data["usage_count"]
            == 0
        ]
        return Response(
            MediaAssetSerializer(
                items, many=True, context=self.get_serializer_context()
            ).data
        )
