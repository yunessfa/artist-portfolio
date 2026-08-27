"""Contact form messages — a real backend model, not a fake form."""

from django.db import models
from django.utils.translation import gettext_lazy as _

from apps.core.models import TimeStampedModel


class ContactMessage(TimeStampedModel):
    class Status(models.TextChoices):
        NEW = "new", _("جدید")
        READ = "read", _("خوانده‌شده")
        REPLIED = "replied", _("پاسخ داده‌شده")
        SPAM = "spam", _("اسپم")

    class Subject(models.TextChoices):
        PURCHASE = "purchase", _("خرید اثر")
        COMMISSION = "commission", _("سفارش اختصاصی")
        EXHIBITION = "exhibition", _("نمایشگاه و همکاری")
        PRESS = "press", _("رسانه و مصاحبه")
        WORKSHOP = "workshop", _("کارگاه و آموزش")
        OTHER = "other", _("سایر")

    name = models.CharField(_("نام"), max_length=160)
    email = models.EmailField(_("ایمیل"))
    phone = models.CharField(_("تلفن"), max_length=40, blank=True)
    subject = models.CharField(
        _("موضوع"),
        max_length=16,
        choices=Subject.choices,
        default=Subject.OTHER,
        db_index=True,
    )
    message = models.TextField(_("پیام"))
    artwork = models.ForeignKey(
        "artworks.Artwork",
        verbose_name=_("اثر مرتبط"),
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="inquiries",
    )

    status = models.CharField(
        _("وضعیت"),
        max_length=10,
        choices=Status.choices,
        default=Status.NEW,
        db_index=True,
    )
    admin_note = models.TextField(_("یادداشت داخلی"), blank=True)

    # anti-spam / auditing metadata (no raw IP is exposed through the API)
    source_page = models.CharField(_("صفحه‌ی مبدأ"), max_length=300, blank=True)
    user_agent = models.CharField(_("مرورگر"), max_length=300, blank=True)
    ip_hash = models.CharField(_("شناسه‌ی فرستنده"), max_length=64, blank=True)

    class Meta:
        verbose_name = _("پیام تماس")
        verbose_name_plural = _("پیام‌های تماس")
        ordering = ("-created_at",)
        indexes = [models.Index(fields=["status", "-created_at"])]

    def __str__(self):
        return f"{self.name} — {self.get_subject_display()}"
