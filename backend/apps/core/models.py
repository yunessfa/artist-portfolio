"""Shared abstract models + site-level singletons.

Every concrete model in the project reuses these building blocks so that
timestamps, ordering, publishing and SEO behave identically everywhere.
"""

from django.db import models
from django.utils import timezone
from django.utils.text import slugify
from django.utils.translation import gettext_lazy as _


class TimeStampedModel(models.Model):
    created_at = models.DateTimeField(_("تاریخ ایجاد"), auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(_("آخرین ویرایش"), auto_now=True)

    class Meta:
        abstract = True


class OrderedModel(models.Model):
    """Manual display order, driven by drag & drop in the admin panel."""

    order = models.PositiveIntegerField(_("ترتیب نمایش"), default=0, db_index=True)

    class Meta:
        abstract = True
        ordering = ("order", "id")


class PublishStatus(models.TextChoices):
    DRAFT = "draft", _("پیش‌نویس")
    PUBLISHED = "published", _("منتشرشده")
    ARCHIVED = "archived", _("بایگانی")


class PublishableQuerySet(models.QuerySet):
    def published(self):
        return self.filter(
            status=PublishStatus.PUBLISHED,
            published_at__lte=timezone.now(),
        )

    def drafts(self):
        return self.filter(status=PublishStatus.DRAFT)

    def featured(self):
        return self.filter(is_featured=True)


class PublishableModel(models.Model):
    status = models.CharField(
        _("وضعیت"),
        max_length=16,
        choices=PublishStatus.choices,
        default=PublishStatus.DRAFT,
        db_index=True,
    )
    published_at = models.DateTimeField(_("تاریخ انتشار"), null=True, blank=True)
    is_featured = models.BooleanField(_("شاخص"), default=False, db_index=True)

    objects = PublishableQuerySet.as_manager()

    class Meta:
        abstract = True

    @property
    def is_published(self) -> bool:
        return self.status == PublishStatus.PUBLISHED and bool(
            self.published_at and self.published_at <= timezone.now()
        )

    def publish(self, save: bool = True):
        self.status = PublishStatus.PUBLISHED
        if self.published_at is None:
            self.published_at = timezone.now()
        if save:
            self.save(update_fields=["status", "published_at", "updated_at"])
        return self

    def unpublish(self, save: bool = True):
        self.status = PublishStatus.DRAFT
        if save:
            self.save(update_fields=["status", "updated_at"])
        return self


class SEOModel(models.Model):
    """Per-object SEO overrides (title, description, OG image, canonical)."""

    seo_title = models.CharField(_("عنوان SEO"), max_length=200, blank=True)
    seo_description = models.TextField(_("توضیح SEO"), max_length=400, blank=True)
    seo_keywords = models.CharField(_("کلمات کلیدی"), max_length=300, blank=True)
    og_image = models.ForeignKey(
        "media_library.MediaAsset",
        verbose_name=_("تصویر اشتراک‌گذاری"),
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="%(app_label)s_%(class)s_og_images",
    )
    canonical_url = models.URLField(_("آدرس کانونیکال"), blank=True)
    noindex = models.BooleanField(_("عدم ایندکس در موتورهای جستجو"), default=False)

    class Meta:
        abstract = True


def unicode_slugify(value: str, fallback: str = "item") -> str:
    """Slugify that keeps Persian characters instead of throwing them away."""
    slug = slugify(value, allow_unicode=True)
    return slug or fallback


class SluggedModel(models.Model):
    """Stable slug: generated once from the title, then never auto-changed
    (so published URLs and SEO do not break when a title is edited).
    """

    slug = models.SlugField(
        _("شناسه‌ی نشانی"),
        max_length=220,
        unique=True,
        allow_unicode=True,
        blank=True,
    )

    slug_source_field = "title"

    class Meta:
        abstract = True

    def build_slug(self) -> str:
        source = getattr(self, self.slug_source_field, "") or ""
        english = getattr(self, f"{self.slug_source_field}_en", "") or ""
        base = unicode_slugify(english or source, fallback="item")
        candidate = base
        model = self.__class__
        counter = 2
        while (
            model.objects.filter(slug=candidate).exclude(pk=self.pk).exists()
        ):
            candidate = f"{base}-{counter}"
            counter += 1
        return candidate

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = self.build_slug()
        super().save(*args, **kwargs)


class SingletonModel(models.Model):
    """Exactly one row, always pk=1."""

    class Meta:
        abstract = True

    def save(self, *args, **kwargs):
        self.pk = 1
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):  # pragma: no cover
        raise RuntimeError("این رکورد قابل حذف نیست.")

    @classmethod
    def load(cls):
        obj, _created = cls.objects.get_or_create(pk=1)
        return obj


class GalleryLayout(models.TextChoices):
    MASONRY = "masonry", _("موزاییک (Masonry)")
    EDITORIAL = "editorial", _("مجله‌ای (Editorial)")
    MINIMAL = "minimal", _("گرید مینیمال")
    LARGE_CARDS = "large_cards", _("کارت‌های بزرگ")
    ASYMMETRIC = "asymmetric", _("گرید نامتقارن")
    FULLSCREEN = "fullscreen", _("تمام‌صفحه")


class SiteSetting(SingletonModel, TimeStampedModel):
    site_name = models.CharField(_("نام سایت"), max_length=120, default="نام هنرمند")
    site_name_en = models.CharField(_("نام انگلیسی"), max_length=120, blank=True)
    tagline = models.CharField(_("شعار"), max_length=200, blank=True)
    description = models.TextField(_("توضیحات"), blank=True)

    email = models.EmailField(_("ایمیل"), blank=True)
    phone = models.CharField(_("تلفن"), max_length=60, blank=True)
    address = models.CharField(_("نشانی"), max_length=240, blank=True)
    studio_note = models.CharField(_("توضیح استودیو"), max_length=240, blank=True)
    map_url = models.URLField(_("لینک نقشه"), blank=True)

    default_gallery_layout = models.CharField(
        _("چیدمان پیش‌فرض گالری"),
        max_length=20,
        choices=GalleryLayout.choices,
        default=GalleryLayout.EDITORIAL,
    )
    artworks_per_page = models.PositiveSmallIntegerField(_("تعداد اثر در هر صفحه"), default=24)
    show_prices = models.BooleanField(_("نمایش قیمت‌ها"), default=False)
    enable_intro_loader = models.BooleanField(_("نمایش اینتروی ورود"), default=True)
    enable_custom_cursor = models.BooleanField(_("نشانگر اختصاصی (دسکتاپ)"), default=True)
    enable_page_transitions = models.BooleanField(_("ترانزیشن بین صفحات"), default=True)

    default_language = models.CharField(
        _("زبان پیش‌فرض"),
        max_length=5,
        choices=(("fa", _("فارسی")), ("en", _("English"))),
        default="fa",
    )
    enable_english = models.BooleanField(_("فعال‌سازی نسخه‌ی انگلیسی"), default=False)

    # --- Branding ---------------------------------------------------------- #
    # Every brand asset is a MediaAsset reference, so the logo, mark and favicon
    # are managed from the media library like any other image and there is no
    # hardcoded branding anywhere in the frontend.
    artist_display_name = models.CharField(
        _("نام نمایشی هنرمند"), max_length=120, blank=True
    )
    logo = models.ForeignKey(
        "media_library.MediaAsset",
        verbose_name=_("لوگو"),
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="site_logos",
    )
    logo_mark = models.ForeignKey(
        "media_library.MediaAsset",
        verbose_name=_("نشانه‌ی لوگو"),
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="site_logo_marks",
    )
    favicon = models.ForeignKey(
        "media_library.MediaAsset",
        verbose_name=_("فاویکون"),
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="site_favicons",
    )

    default_seo_title = models.CharField(_("عنوان پیش‌فرض SEO"), max_length=200, blank=True)
    default_seo_description = models.TextField(_("توضیح پیش‌فرض SEO"), blank=True)
    default_og_image = models.ForeignKey(
        "media_library.MediaAsset",
        verbose_name=_("تصویر پیش‌فرض اشتراک‌گذاری"),
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="site_og_images",
    )
    robots_extra = models.TextField(_("خطوط اضافی robots.txt"), blank=True)
    analytics_snippet = models.TextField(_("کد آنالیتیکس"), blank=True)

    maintenance_mode = models.BooleanField(_("حالت تعمیر و نگهداری"), default=False)
    maintenance_message = models.TextField(_("پیام حالت تعمیر"), blank=True)

    class Meta:
        verbose_name = _("تنطیمات سایت")
        verbose_name_plural = _("تنطیمات سایت")

    def __str__(self):
        return self.site_name


class NavigationItem(OrderedModel, TimeStampedModel):
    class Location(models.TextChoices):
        HEADER = "header", _("منوی بالا")
        MOBILE = "mobile", _("منوی موبایل")
        FOOTER = "footer", _("پانوشت")

    label = models.CharField(_("عنوان"), max_length=80)
    label_en = models.CharField(_("عنوان انگلیسی"), max_length=80, blank=True)
    url = models.CharField(_("نشانی"), max_length=240)
    location = models.CharField(
        _("محل نمایش"),
        max_length=10,
        choices=Location.choices,
        default=Location.HEADER,
        db_index=True,
    )
    is_active = models.BooleanField(_("فعال"), default=True)
    open_in_new_tab = models.BooleanField(_("باز شدن در تب جدید"), default=False)
    parent = models.ForeignKey(
        "self",
        verbose_name=_("والد"),
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="children",
    )

    class Meta(OrderedModel.Meta):
        verbose_name = _("آیتم منو")
        verbose_name_plural = _("منوها")
        unique_together = (("label", "location"),)

    def __str__(self):
        return f"{self.label} ({self.get_location_display()})"


class SocialLink(OrderedModel, TimeStampedModel):
    class Platform(models.TextChoices):
        INSTAGRAM = "instagram", "Instagram"
        BEHANCE = "behance", "Behance"
        PINTEREST = "pinterest", "Pinterest"
        TELEGRAM = "telegram", "Telegram"
        LINKEDIN = "linkedin", "LinkedIn"
        X = "x", "X / Twitter"
        YOUTUBE = "youtube", "YouTube"
        WHATSAPP = "whatsapp", "WhatsApp"
        WEBSITE = "website", _("وب‌سایت")

    platform = models.CharField(
        _("پلتفرم"), max_length=20, choices=Platform.choices, unique=True
    )
    label = models.CharField(_("عنوان نمایشی"), max_length=80, blank=True)
    url = models.URLField(_("نشانی"))
    is_active = models.BooleanField(_("فعال"), default=True)

    class Meta(OrderedModel.Meta):
        verbose_name = _("شبکه‌ی اجتماعی")
        verbose_name_plural = _("شبکه‌های اجتماعی")

    def __str__(self):
        return self.label or self.get_platform_display()
