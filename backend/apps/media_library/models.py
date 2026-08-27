"""Real media library.

Uploads are stored on disk (never base64 inside HTML like the legacy
prototype). For every image we generate WebP + AVIF variants at 400/800/1280/
1920 px, plus a tiny blurred LQIP placeholder used to avoid layout shift.
"""

from __future__ import annotations

import base64
import hashlib
import io
import os
from pathlib import Path

from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.files.base import ContentFile
from django.db import models
from django.utils.translation import gettext_lazy as _

from apps.core.models import TimeStampedModel


def upload_to(instance, filename: str) -> str:
    from django.utils import timezone

    now = timezone.now()
    return f"uploads/{now:%Y/%m}/{filename}"


def variant_upload_to(instance, filename: str) -> str:
    return f"variants/{instance.asset_id}/{filename}"


def validate_upload(uploaded) -> str:
    """Validate size, extension and *real* MIME type (magic bytes).

    Returns the detected MIME type. Raises ValidationError otherwise.
    """
    max_size = getattr(settings, "MAX_UPLOAD_SIZE", 25 * 1024 * 1024)
    if uploaded.size > max_size:
        raise ValidationError(
            _("حجم فایل بیشتر از حد مجاز (%(mb)s مگابایت) است.")
            % {"mb": getattr(settings, "MAX_UPLOAD_SIZE_MB", 25)}
        )

    extension = Path(uploaded.name).suffix.lower().lstrip(".")
    allowed_ext = set(getattr(settings, "ALLOWED_UPLOAD_EXTENSIONS", set()))
    if allowed_ext and extension not in allowed_ext:
        raise ValidationError(
            _("پسوند .%(ext)s مجاز نیست.") % {"ext": extension}
        )

    detected = ""
    head = uploaded.read(4096)
    uploaded.seek(0)
    try:
        import magic  # python-magic

        detected = magic.from_buffer(head, mime=True) or ""
    except Exception:
        # fall back to the browser-provided type when libmagic is unavailable
        detected = getattr(uploaded, "content_type", "") or ""

    allowed_mime = set(getattr(settings, "ALLOWED_UPLOAD_MIME_TYPES", set()))
    if allowed_mime and detected and detected not in allowed_mime:
        raise ValidationError(
            _("نوع فایل (%(mime)s) مجاز نیست.") % {"mime": detected}
        )
    return detected


class MediaFolder(TimeStampedModel):
    name = models.CharField(_("نام پوشه"), max_length=120, unique=True)
    parent = models.ForeignKey(
        "self",
        verbose_name=_("پوشه‌ی والد"),
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="children",
    )

    class Meta:
        verbose_name = _("پوشه‌ی رسانه")
        verbose_name_plural = _("پوشه‌های رسانه")
        ordering = ("name",)

    def __str__(self):
        return self.name


class MediaAsset(TimeStampedModel):
    class Kind(models.TextChoices):
        IMAGE = "image", _("تصویر")
        VIDEO = "video", _("ویدیو")
        DOCUMENT = "document", _("سند")

    file = models.FileField(_("فایل"), upload_to=upload_to, max_length=400)
    kind = models.CharField(
        _("نوع"), max_length=10, choices=Kind.choices, default=Kind.IMAGE, db_index=True
    )
    title = models.CharField(_("عنوان"), max_length=200, blank=True)
    alt_text = models.CharField(_("متن جایگزین"), max_length=300, blank=True)
    alt_text_en = models.CharField(_("متن جایگزین انگلیسی"), max_length=300, blank=True)
    caption = models.CharField(_("زیرنویس"), max_length=300, blank=True)
    folder = models.ForeignKey(
        MediaFolder,
        verbose_name=_("پوشه"),
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assets",
    )

    mime_type = models.CharField(_("نوع MIME"), max_length=100, blank=True)
    file_size = models.PositiveBigIntegerField(_("حجم (بایت)"), default=0)
    width = models.PositiveIntegerField(_("عرض"), default=0)
    height = models.PositiveIntegerField(_("ارتفاع"), default=0)
    checksum = models.CharField(_("چک‌سام"), max_length=64, blank=True, db_index=True)
    dominant_color = models.CharField(_("رنگ غالب"), max_length=9, blank=True)
    placeholder = models.TextField(_("پلیس‌هولدر (LQIP)"), blank=True)

    class Meta:
        verbose_name = _("فایل رسانه")
        verbose_name_plural = _("کتابخانه‌ی رسانه")
        ordering = ("-created_at",)

    def __str__(self):
        return self.title or Path(self.file.name).name

    @property
    def aspect_ratio(self) -> float | None:
        if self.width and self.height:
            return round(self.width / self.height, 4)
        return None

    # ------------------------------------------------------------------ #
    def save(self, *args, **kwargs):
        new_file = self.pk is None or "file" in (kwargs.get("update_fields") or ["file"])
        super().save(*args, **kwargs)
        if new_file and self.file:
            changed = self._read_metadata()
            if changed:
                super().save(update_fields=changed)
            if self.kind == self.Kind.IMAGE:
                self._generate_variants()

    def _read_metadata(self) -> list[str]:
        """Fill size, checksum, dimensions, dominant colour and LQIP."""
        fields: list[str] = []
        try:
            self.file.open("rb")
            raw = self.file.read()
        except Exception:
            return fields
        finally:
            try:
                self.file.close()
            except Exception:
                pass

        self.file_size = len(raw)
        self.checksum = hashlib.sha256(raw).hexdigest()
        fields += ["file_size", "checksum"]

        if not self.mime_type:
            try:
                import magic

                self.mime_type = magic.from_buffer(raw[:4096], mime=True) or ""
            except Exception:
                self.mime_type = ""
            fields.append("mime_type")

        if self.kind == self.Kind.IMAGE:
            try:
                from PIL import Image

                with Image.open(io.BytesIO(raw)) as image:
                    image = image.convert("RGB")
                    self.width, self.height = image.size
                    fields += ["width", "height"]

                    tiny = image.resize((1, 1))
                    r, g, b = tiny.getpixel((0, 0))
                    self.dominant_color = f"#{r:02X}{g:02X}{b:02X}"
                    fields.append("dominant_color")

                    lqip_width = getattr(settings, "IMAGE_PLACEHOLDER_WIDTH", 24)
                    ratio = lqip_width / max(image.width, 1)
                    lqip = image.resize(
                        (lqip_width, max(int(image.height * ratio), 1))
                    )
                    buffer = io.BytesIO()
                    lqip.save(buffer, format="WEBP", quality=40)
                    encoded = base64.b64encode(buffer.getvalue()).decode()
                    self.placeholder = f"data:image/webp;base64,{encoded}"
                    fields.append("placeholder")
            except Exception:
                pass
        return fields

    def _generate_variants(self) -> None:
        """Create responsive WebP/AVIF renditions. Never raises."""
        try:
            from PIL import Image
        except Exception:  # pragma: no cover
            return

        widths = getattr(settings, "IMAGE_VARIANT_WIDTHS", [400, 800, 1280, 1920])
        formats = getattr(settings, "IMAGE_VARIANT_FORMATS", ["webp", "avif"])

        try:
            self.file.open("rb")
            raw = self.file.read()
        except Exception:
            return
        finally:
            try:
                self.file.close()
            except Exception:
                pass

        stem = Path(self.file.name).stem
        for target_width in widths:
            if self.width and target_width > self.width:
                continue
            for image_format in formats:
                try:
                    with Image.open(io.BytesIO(raw)) as image:
                        image = image.convert("RGB")
                        ratio = target_width / max(image.width, 1)
                        resized = image.resize(
                            (target_width, max(int(image.height * ratio), 1)),
                            Image.LANCZOS,
                        )
                        buffer = io.BytesIO()
                        resized.save(
                            buffer,
                            format=image_format.upper(),
                            quality=82,
                            method=6 if image_format == "webp" else None,
                        )
                        payload = buffer.getvalue()
                except Exception:
                    # AVIF support depends on the Pillow build; skip silently
                    continue

                variant, _created = MediaVariant.objects.get_or_create(
                    asset=self, width=target_width, image_format=image_format
                )
                variant.height = max(int((self.height or 0) * (target_width / max(self.width or 1, 1))), 0)
                variant.file_size = len(payload)
                variant.file.save(
                    f"{stem}-{target_width}.{image_format}",
                    ContentFile(payload),
                    save=False,
                )
                variant.save()

    def regenerate(self) -> None:
        """Delete and rebuild all variants (used by the admin action)."""
        for variant in self.variants.all():
            variant.delete()
        fields = self._read_metadata()
        if fields:
            super().save(update_fields=fields)
        if self.kind == self.Kind.IMAGE:
            self._generate_variants()


class MediaVariant(models.Model):
    asset = models.ForeignKey(
        MediaAsset,
        verbose_name=_("فایل اصلی"),
        on_delete=models.CASCADE,
        related_name="variants",
    )
    file = models.FileField(_("فایل"), upload_to=variant_upload_to, max_length=400)
    width = models.PositiveIntegerField(_("عرض"))
    height = models.PositiveIntegerField(_("ارتفاع"), default=0)
    image_format = models.CharField(_("فرمت"), max_length=8)
    file_size = models.PositiveBigIntegerField(_("حجم"), default=0)

    class Meta:
        verbose_name = _("نسخه‌ی تصویر")
        verbose_name_plural = _("نسخه‌های تصویر")
        ordering = ("image_format", "width")
        unique_together = (("asset", "width", "image_format"),)

    def __str__(self):
        return f"{self.asset_id} @ {self.width}px .{self.image_format}"

    def delete(self, *args, **kwargs):
        storage, name = self.file.storage, self.file.name
        super().delete(*args, **kwargs)
        try:
            if name:
                storage.delete(name)
        except Exception:
            pass
