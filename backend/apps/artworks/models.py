"""Artworks, categories, collections and sculpture-specific details."""

import re

from django.db import models
from django.utils.translation import gettext_lazy as _

from apps.core.models import (
    OrderedModel,
    PublishableModel,
    PublishableQuerySet,
    SEOModel,
    SluggedModel,
    TimeStampedModel,
)

PERSIAN_DIGITS = "۰۱۲۳۴۵۶۷۸۹"
ARABIC_DIGITS = "٠١٢٣٤٥٦٧٨٩"


def to_latin_digits(value: str) -> str:
    for index, digit in enumerate(PERSIAN_DIGITS):
        value = value.replace(digit, str(index))
    for index, digit in enumerate(ARABIC_DIGITS):
        value = value.replace(digit, str(index))
    return value


class Category(OrderedModel, TimeStampedModel):
    key = models.SlugField(_("کلید"), max_length=40, unique=True)
    label = models.CharField(_("عنوان"), max_length=80)
    label_en = models.CharField(_("عنوان انگلیسی"), max_length=80, blank=True)
    description = models.TextField(_("توضیح"), blank=True)
    is_active = models.BooleanField(_("فعال"), default=True)

    class Meta(OrderedModel.Meta):
        verbose_name = _("دسته‌بندی")
        verbose_name_plural = _("دسته‌بندی‌ها")

    def __str__(self):
        return self.label


class Collection(SluggedModel, PublishableModel, SEOModel, OrderedModel, TimeStampedModel):
    title = models.CharField(_("عنوان"), max_length=160)
    title_en = models.CharField(_("عنوان انگلیسی"), max_length=160, blank=True)
    subtitle = models.CharField(_("زیرعنوان"), max_length=200, blank=True)
    description = models.TextField(_("توضیح"), blank=True)
    statement = models.TextField(_("متن هنرمند"), blank=True)
    year = models.CharField(_("سال"), max_length=20, blank=True)
    cover = models.ForeignKey(
        "media_library.MediaAsset",
        verbose_name=_("تصویر جلد"),
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="collection_covers",
    )

    class Meta(OrderedModel.Meta):
        verbose_name = _("مجموعه")
        verbose_name_plural = _("مجموعه‌ها")

    def __str__(self):
        return self.title


class Availability(models.TextChoices):
    AVAILABLE = "available", _("موجود")
    SOLD = "sold", _("فروخته‌شده")
    RESERVED = "reserved", _("رزروشده")
    NOT_FOR_SALE = "not_for_sale", _("غیرقابل فروش")
    PRIVATE_COLLECTION = "private", _("مجموعه‌ی خصوصی")
    ON_LOAN = "on_loan", _("امانتی / نمایشگاه")
    COMMISSION = "commission", _("سفارشی")


class LayoutSpan(models.TextChoices):
    """Preserves the legacy grid hints (`wide` / `tall`)."""

    NORMAL = "normal", _("عادی")
    WIDE = "wide", _("عریض")
    TALL = "tall", _("بلند")
    LARGE = "large", _("بزرگ")


class ArtworkQuerySet(PublishableQuerySet):
    def with_related(self):
        return self.select_related(
            "category", "collection", "hero_image"
        ).prefetch_related("hero_image__variants", "images__image__variants")


class Artwork(SluggedModel, PublishableModel, SEOModel, OrderedModel, TimeStampedModel):
    title = models.CharField(_("عنوان"), max_length=200)
    title_en = models.CharField(_("عنوان انگلیسی"), max_length=200, blank=True)
    category = models.ForeignKey(
        Category,
        verbose_name=_("دسته‌بندی"),
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="artworks",
    )
    collection = models.ForeignKey(
        Collection,
        verbose_name=_("مجموعه"),
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="artworks",
    )

    year = models.CharField(_("سال خلق"), max_length=20, blank=True)
    year_sort = models.IntegerField(_("سال (مرتب‌سازی)"), default=0, db_index=True)
    technique = models.CharField(_("تکنیک"), max_length=200, blank=True)
    material = models.CharField(_("متریال"), max_length=200, blank=True)
    medium = models.CharField(_("مدیوم"), max_length=200, blank=True)
    dimensions = models.CharField(_("ابعاد"), max_length=120, blank=True)

    availability = models.CharField(
        _("وضعیت اثر"),
        max_length=16,
        choices=Availability.choices,
        default=Availability.NOT_FOR_SALE,
        db_index=True,
    )
    price = models.DecimalField(
        _("قیمت"), max_digits=14, decimal_places=0, null=True, blank=True
    )
    price_currency = models.CharField(_("واحد پول"), max_length=10, default="IRT")
    show_price = models.BooleanField(_("نمایش قیمت"), default=False)

    excerpt = models.CharField(_("توضیح کوتاه"), max_length=300, blank=True)
    description = models.TextField(_("توضیح کامل"), blank=True)
    concept = models.TextField(_("داستان / کانسپت"), blank=True)
    artist_note = models.TextField(_("یادداشت هنرمند"), blank=True)

    hero_image = models.ForeignKey(
        "media_library.MediaAsset",
        verbose_name=_("تصویر اصلی"),
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="artwork_heroes",
    )
    layout_span = models.CharField(
        _("اندازه در گرید"),
        max_length=8,
        choices=LayoutSpan.choices,
        default=LayoutSpan.NORMAL,
    )
    allow_zoom = models.BooleanField(_("اجازه‌ی بزرگ‌نمایی"), default=True)
    view_count = models.PositiveIntegerField(_("بازدید"), default=0)
    related_artworks = models.ManyToManyField(
        "self", verbose_name=_("آثار مرتبط"), blank=True, symmetrical=False
    )

    objects = ArtworkQuerySet.as_manager()

    class Meta(OrderedModel.Meta):
        verbose_name = _("اثر هنری")
        verbose_name_plural = _("آثار هنری")
        indexes = [
            models.Index(fields=["status", "order"]),
            models.Index(fields=["is_featured", "status"]),
        ]

    def __str__(self):
        return self.title

    def save(self, *args, **kwargs):
        digits = re.sub(r"\D", "", to_latin_digits(self.year or ""))
        self.year_sort = int(digits) if digits else 0
        super().save(*args, **kwargs)

    def duplicate(self):
        """Real duplicate: copies fields, images and sculpture details as a draft."""
        images = list(self.images.all())
        sculpture = getattr(self, "sculpture_detail", None)

        clone = Artwork.objects.get(pk=self.pk)
        clone.pk = None
        clone.slug = ""
        clone.title = f"{self.title} (کپی)"
        clone.status = "draft"
        clone.published_at = None
        clone.is_featured = False
        clone.view_count = 0
        clone.order = (Artwork.objects.count() or 0) + 1
        clone.save()

        for image in images:
            ArtworkImage.objects.create(
                artwork=clone,
                image=image.image,
                role=image.role,
                caption=image.caption,
                alt_override=image.alt_override,
                is_cover=image.is_cover,
                order=image.order,
            )
        if sculpture is not None:
            sculpture.pk = None
            sculpture.artwork = clone
            sculpture.save()
        return clone


class ArtworkImage(OrderedModel, TimeStampedModel):
    class Role(models.TextChoices):
        MAIN = "main", _("تصویر اصلی")
        DETAIL = "detail", _("جزئیات")
        CONTEXT = "context", _("در فضا")
        PROCESS = "process", _("مراحل ساخت")

    artwork = models.ForeignKey(
        Artwork, verbose_name=_("اثر"), on_delete=models.CASCADE, related_name="images"
    )
    image = models.ForeignKey(
        "media_library.MediaAsset",
        verbose_name=_("تصویر"),
        on_delete=models.CASCADE,
        related_name="artwork_images",
    )
    role = models.CharField(
        _("نقش"), max_length=10, choices=Role.choices, default=Role.MAIN
    )
    caption = models.CharField(_("زیرنویس"), max_length=300, blank=True)
    alt_override = models.CharField(_("متن جایگزین اختصاصی"), max_length=300, blank=True)
    is_cover = models.BooleanField(_("تصویر کاور"), default=False)

    class Meta(OrderedModel.Meta):
        verbose_name = _("تصویر اثر")
        verbose_name_plural = _("تصاویر اثر")

    def __str__(self):
        return f"{self.artwork_id} / {self.role}"

    @property
    def alt_text(self) -> str:
        return self.alt_override or (self.image.alt_text if self.image_id else "")

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        if self.is_cover:
            ArtworkImage.objects.filter(artwork=self.artwork).exclude(
                pk=self.pk
            ).update(is_cover=False)


class SculptureDetail(TimeStampedModel):
    """Sculpture-only measurements and edition data."""

    artwork = models.OneToOneField(
        Artwork,
        verbose_name=_("اثر"),
        on_delete=models.CASCADE,
        related_name="sculpture_detail",
    )
    material = models.CharField(_("متریال"), max_length=200, blank=True)
    height_cm = models.DecimalField(
        _("ارتفاع (cm)"), max_digits=8, decimal_places=1, null=True, blank=True
    )
    width_cm = models.DecimalField(
        _("عرض (cm)"), max_digits=8, decimal_places=1, null=True, blank=True
    )
    depth_cm = models.DecimalField(
        _("عمق (cm)"), max_digits=8, decimal_places=1, null=True, blank=True
    )
    weight_kg = models.DecimalField(
        _("وزن (kg)"), max_digits=8, decimal_places=2, null=True, blank=True
    )
    edition = models.CharField(_("ادیشن"), max_length=60, blank=True)
    foundry = models.CharField(_("ریخته‌گری"), max_length=120, blank=True)
    patina = models.CharField(_("پاتینا / روکش"), max_length=120, blank=True)
    location = models.CharField(_("محل نگهداری"), max_length=200, blank=True)
    outdoor_suitable = models.BooleanField(_("مناسب فضای باز"), default=False)

    class Meta:
        verbose_name = _("مشخصات مجسمه")
        verbose_name_plural = _("مشخصات مجسمه")

    def __str__(self):
        return f"{self.artwork_id} — sculpture"

    @property
    def dimensions_display(self) -> str:
        parts = [
            f"{value:g}"
            for value in (self.height_cm, self.width_cm, self.depth_cm)
            if value is not None
        ]
        return " × ".join(parts) + (" cm" if parts else "")
