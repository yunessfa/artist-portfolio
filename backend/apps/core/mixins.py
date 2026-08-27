"""Reusable ViewSet actions: drag & drop reorder, publish, duplicate, feature.

These are what make the admin panel real — every action writes to the database.
"""

from django.db import transaction
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.response import Response

from .permissions import StaffOnly


class ReorderMixin:
    """POST /<resource>/reorder/  { "order": [12, 4, 9] }"""

    @action(detail=False, methods=["post"], permission_classes=[StaffOnly])
    def reorder(self, request):
        ids = request.data.get("order") or request.data.get("ids") or []
        if not isinstance(ids, list) or not ids:
            return Response(
                {"detail": "لیست order الزامی است."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        model = self.get_queryset().model
        found = {obj.pk: obj for obj in model.objects.filter(pk__in=ids)}
        updated = []
        for index, pk in enumerate(ids):
            obj = found.get(pk)
            if obj is None:
                continue
            obj.order = index
            updated.append(obj)

        with transaction.atomic():
            model.objects.bulk_update(updated, ["order"])
        return Response({"updated": len(updated)})


class PublishMixin:
    @action(detail=True, methods=["post"], permission_classes=[StaffOnly])
    def publish(self, request, pk=None):
        obj = self.get_object()
        obj.status = "published"
        if obj.published_at is None:
            obj.published_at = timezone.now()
        obj.save(update_fields=["status", "published_at", "updated_at"])
        return Response(self.get_serializer(obj).data)

    @action(detail=True, methods=["post"], permission_classes=[StaffOnly])
    def unpublish(self, request, pk=None):
        obj = self.get_object()
        obj.status = "draft"
        obj.save(update_fields=["status", "updated_at"])
        return Response(self.get_serializer(obj).data)


class DuplicateMixin:
    @action(detail=True, methods=["post"], permission_classes=[StaffOnly])
    def duplicate(self, request, pk=None):
        obj = self.get_object()
        if not hasattr(obj, "duplicate"):
            return Response(
                {"detail": "این مورد قابل کپی نیست."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        clone = obj.duplicate()
        return Response(
            self.get_serializer(clone).data, status=status.HTTP_201_CREATED
        )


class ToggleFeatureMixin:
    @action(
        detail=True,
        methods=["post"],
        url_path="toggle-feature",
        permission_classes=[StaffOnly],
    )
    def toggle_feature(self, request, pk=None):
        obj = self.get_object()
        obj.is_featured = not obj.is_featured
        obj.save(update_fields=["is_featured", "updated_at"])
        return Response({"id": obj.pk, "isFeatured": obj.is_featured})
