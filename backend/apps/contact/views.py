from django.conf import settings
from django.core.mail import send_mail
from rest_framework import mixins, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle

from apps.core.permissions import WriteOnlyPublic

from .models import ContactMessage
from .serializers import ContactMessageCreateSerializer, ContactMessageSerializer


class ContactThrottle(AnonRateThrottle):
    scope = "contact"


class ContactMessageViewSet(
    mixins.CreateModelMixin,
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    mixins.DestroyModelMixin,
    viewsets.GenericViewSet,
):
    queryset = ContactMessage.objects.select_related("artwork")
    permission_classes = [WriteOnlyPublic]
    filterset_fields = ["status", "subject"]
    search_fields = ["name", "email", "message"]

    def get_throttles(self):
        if self.action == "create":
            return [ContactThrottle()]
        return super().get_throttles()

    def get_serializer_class(self):
        if self.action == "create":
            return ContactMessageCreateSerializer
        return ContactMessageSerializer

    def perform_create(self, serializer):
        import hashlib

        request = self.request
        ip = request.META.get("REMOTE_ADDR", "")
        salt = settings.SECRET_KEY
        message = serializer.save(
            user_agent=request.META.get("HTTP_USER_AGENT", "")[:300],
            ip_hash=hashlib.sha256(f"{salt}:{ip}".encode()).hexdigest()[:64],
        )
        self._notify(message)

    def _notify(self, message):
        recipient = getattr(settings, "CONTACT_NOTIFY_EMAIL", "") or ""
        if not recipient:
            return
        try:
            send_mail(
                subject=f"پیام جدید: {message.get_subject_display()}",
                message=(
                    f"نام: {message.name}\n"
                    f"ایمیل: {message.email}\n"
                    f"تلفن: {message.phone}\n\n{message.message}"
                ),
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[recipient],
                fail_silently=True,
            )
        except Exception:
            pass

    @action(detail=True, methods=["post"], url_path="mark")
    def mark(self, request, pk=None):
        message = self.get_object()
        status_value = request.data.get("status")
        valid = {choice for choice, _label in ContactMessage.Status.choices}
        if status_value not in valid:
            return Response({"detail": "وضعیت نامعتبر."}, status=400)
        message.status = status_value
        message.save(update_fields=["status", "updated_at"])
        return Response(ContactMessageSerializer(message).data)
