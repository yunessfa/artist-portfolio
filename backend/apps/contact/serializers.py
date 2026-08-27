from rest_framework import serializers

from .models import ContactMessage


class ContactMessageCreateSerializer(serializers.ModelSerializer):
    """Public write path. A honeypot field silently rejects bots."""

    honeypot = serializers.CharField(required=False, allow_blank=True, write_only=True)

    class Meta:
        model = ContactMessage
        fields = (
            "name",
            "email",
            "phone",
            "subject",
            "message",
            "artwork",
            "source_page",
            "honeypot",
        )

    def validate_message(self, value):
        if len(value.strip()) < 10:
            raise serializers.ValidationError("متن پیام بسیار کوتاه است.")
        return value.strip()

    def validate(self, attrs):
        if attrs.pop("honeypot", ""):
            raise serializers.ValidationError("ارسال نامعتبر.")
        return attrs


class ContactMessageSerializer(serializers.ModelSerializer):
    subject_label = serializers.CharField(source="get_subject_display", read_only=True)
    status_label = serializers.CharField(source="get_status_display", read_only=True)
    artwork_title = serializers.CharField(
        source="artwork.title", read_only=True, default=""
    )

    class Meta:
        model = ContactMessage
        fields = (
            "id",
            "name",
            "email",
            "phone",
            "subject",
            "subject_label",
            "message",
            "artwork",
            "artwork_title",
            "status",
            "status_label",
            "admin_note",
            "source_page",
            "created_at",
        )
        read_only_fields = ("name", "email", "phone", "subject", "message", "artwork")
