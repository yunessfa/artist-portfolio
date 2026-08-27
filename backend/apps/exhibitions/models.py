"""Exhibitions with automatic upcoming / current / past state."""

from django.db import models
from django.utils import timezone
from django.utils.translation import gettext_lazy as _

from apps.core.models import (
    OrderedModel,
    PublishableModel,
    SEOModel,
    SluggedModel,
    TimeStampedModel,
)


class ExhibitionState(models.TextChoices):
    UPCOMING = "upcoming", _("پیش‌رو")
    CURRENT = "current", _("در جریان")
    PAST = "past", _("گذشته")


class Exhibition(SluggedModel, PublishableModel, SEOModel, OrderedModel, TimeStampedModel):
    class Kind(models.TextChoices):
        SOLO = "solo", _("انفرادی")
        DUO = "duo", _("دونفره")
        GROUP = "group", _("گروهی")
        FAIR = "fair", _("آرت‌فر")
        RESIDENCY = "residency", _("اقامت هنری")
        BIENNIAL = "biennial", _("دوسالانه")

    title = models.CharField(_("عنوان"), max_length=240)
    title_en = models.CharField(_("عنوان انگلیسی"), max_length=240, blank=True)
    kind = models.CharField(
        _("نوع"), max_length=12, choices=Kind.choices, default=Kind.GROUP
    )

    year_label = models.CharField(_("سال (نمایشی)"), max_length=20, blank=True)
    start_date = models.DateField(_("تاریخ شروع"), null=True, blank=True)
    end_date = models.DateField(_("تاریخ پایان"), null=True, blank=True)

    venue = models.CharField(_("محل برگزاری"), max_length=200, blank=True)
    city = models.CharField(_("شهر"), max_length=120, blank=True)
    country = models.CharField(_("کشور"), max_length=120, blank=True)
    address = models.CharField(_("نشانی"), max_length=280, blank=True)

    description = models.TextField(_("توضیحات"), blank=True)
    curator = models.CharField(_("کیوراتور"), max_length=200, blank=True)
    external_url = models.URLField(_("لینک خارجی"), blank=True)

    cover = models.ForeignKey(
        "media_library.MediaAsset",
        verbose_name=_("تصویر جلد"),
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="exhibition_covers",
    )
    artworks = models.ManyToManyField(
        "artworks.Artwork",
        verbose_name=_("آثار عرضه‌شده"),
        blank=True,
        related_name="exhibitions",
    )

    class Meta(OrderedModel.Meta):
        verbose_name = _("نمایشگاه")
        verbose_name_plural = _("نمایشگاه‌ها")
        ordering = ("order", "-start_date", "-id")

    def __str__(self):
        return self.title

    @property
    def state(self) -> str:
        """Computed from the dates — never stored, so it can never go stale."""
        today = timezone.localdate()
        if self.start_date and self.start_date > today:
            return ExhibitionState.UPCOMING
        if self.end_date and self.end_date < today:
            return ExhibitionState.PAST
        if self.start_date and self.start_date <= today and (
            self.end_date is None or self.end_date >= today
        ):
            return ExhibitionState.CURRENT
        return ExhibitionState.PAST

    @property
    def state_label(self) -> str:
        return dict(ExhibitionState.choices).get(self.state, "")

    @property
    def location_display(self) -> str:
        parts = [part for part in (self.venue, self.city, self.country) if part]
        return "، ".join(parts)


class ExhibitionImage(OrderedModel, TimeStampedModel):
    exhibition = models.ForeignKey(
        Exhibition,
        verbose_name=_("نمایشگاه"),
        on_delete=models.CASCADE,
        related_name="images",
    )
    image = models.ForeignKey(
        "media_library.MediaAsset",
        verbose_name=_("تصویر"),
        on_delete=models.CASCADE,
        related_name="exhibition_images",
    )
    caption = models.CharField(_("زیرنویس"), max_length=300, blank=True)
    alt_override = models.CharField(_("متن جایگزین"), max_length=300, blank=True)

    class Meta(OrderedModel.Meta):
        verbose_name = _("تصویر نمایشگاه")
        verbose_name_plural = _("تصاویر نمایشگاه")

    def __str__(self):
        return f"{self.exhibition_id} / {self.pk}"

    @property
    def alt_text(self) -> str:
        return self.alt_override or (self.image.alt_text if self.image_id else "")
