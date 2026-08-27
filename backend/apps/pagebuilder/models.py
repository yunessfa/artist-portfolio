"""Page builder: the homepage (and any other page) is a list of ordered,
toggleable sections stored in the database — not hardcoded JSX.

Each section type declares a small schema so the admin panel can render the
right form fields without any frontend deploy.
"""

from django.core.exceptions import ValidationError
from django.db import models
from django.utils.translation import gettext_lazy as _

from apps.core.models import (
    OrderedModel,
    PublishableModel,
    SEOModel,
    TimeStampedModel,
)


class SectionType(models.TextChoices):
    HERO = "hero", _("هیرو")
    STATS = "stats", _("آمارها")
    FEATURED_WORKS = "featured_works", _("آثار شاخص")
    GALLERY = "gallery", _("گالری کامل")
    COLLECTIONS = "collections", _("مجموعه‌ها")
    SPOTLIGHT = "spotlight", _("نقل قول / اسپات‌لایت")
    ABOUT = "about", _("درباره‌ی هنرمند")
    TIMELINE = "timeline", _("خط زمانی")
    EXHIBITIONS = "exhibitions", _("نمایشگاه‌ها")
    SERVICES = "services", _("خدمات")
    TESTIMONIALS = "testimonials", _("نقدها")
    QUOTE = "quote", _("نقل قول ساده")
    CTA = "cta", _("فراخوان به اقدام")
    CONTACT = "contact", _("تماس")
    RICH_TEXT = "rich_text", _("متن آزاد")
    IMAGE_BAND = "image_band", _("نوار تصویری")


# field name -> (type, label). Consumed by the admin panel form renderer.
SECTION_SCHEMA: dict[str, dict] = {
    SectionType.HERO: {
        "label": _("هیرو"),
        "description": _("تصویر بزرگ، نام هنرمند، شعار و دکمه‌ی اصلی"),
        "fields": {
            "show_scroll_hint": "boolean",
            "overlay_opacity": "number",
            "parallax": "boolean",
        },
        "uses": ["artist", "media"],
    },
    SectionType.STATS: {
        "label": _("آمارها"),
        "description": _("چهار عدد کلیدی از بخش هنرمند"),
        "fields": {"columns": "number"},
        "uses": ["stats"],
    },
    SectionType.FEATURED_WORKS: {
        "label": _("آثار شاخص"),
        "description": _("آثاری که به عنوان Featured علامت خورده‌اند"),
        "fields": {"limit": "number", "layout": "gallery_layout", "show_filters": "boolean"},
        "uses": ["artworks"],
    },
    SectionType.GALLERY: {
        "label": _("گالری کامل"),
        "description": _("همه‌ی آثار منتشرشده با فیلتر دسته‌بندی"),
        "fields": {"limit": "number", "layout": "gallery_layout", "show_filters": "boolean"},
        "uses": ["artworks", "categories"],
    },
    SectionType.COLLECTIONS: {
        "label": _("مجموعه‌ها"),
        "fields": {"limit": "number", "layout": "gallery_layout"},
        "uses": ["collections"],
    },
    SectionType.SPOTLIGHT: {
        "label": _("اسپات‌لایت"),
        "description": _("نقل قول هنرمند روی یک تصویر بزرگ"),
        "fields": {"align": "string", "parallax": "boolean"},
        "uses": ["artist", "media"],
    },
    SectionType.ABOUT: {
        "label": _("درباره"),
        "fields": {"show_mediums": "boolean", "image_side": "string"},
        "uses": ["artist", "mediums"],
    },
    SectionType.TIMELINE: {
        "label": _("خط زمانی"),
        "fields": {"limit": "number"},
        "uses": ["timeline"],
    },
    SectionType.EXHIBITIONS: {
        "label": _("نمایشگاه‌ها"),
        "fields": {"limit": "number", "state": "string"},
        "uses": ["exhibitions"],
    },
    SectionType.SERVICES: {
        "label": _("خدمات"),
        "fields": {"columns": "number"},
        "uses": ["services"],
    },
    SectionType.TESTIMONIALS: {
        "label": _("نقدها"),
        "fields": {"limit": "number", "autoplay": "boolean"},
        "uses": ["testimonials"],
    },
    SectionType.QUOTE: {
        "label": _("نقل قول"),
        "fields": {"quote": "text", "attribution": "string"},
        "uses": [],
    },
    SectionType.CTA: {
        "label": _("فراخوان"),
        "fields": {
            "button_label": "string",
            "button_url": "string",
            "style": "string",
        },
        "uses": [],
    },
    SectionType.CONTACT: {
        "label": _("تماس"),
        "fields": {"show_form": "boolean", "show_map": "boolean"},
        "uses": ["settings", "socials"],
    },
    SectionType.RICH_TEXT: {
        "label": _("متن آزاد"),
        "fields": {"body": "text", "max_width": "string"},
        "uses": [],
    },
    SectionType.IMAGE_BAND: {
        "label": _("نوار تصویری"),
        "fields": {"height": "string", "parallax": "boolean"},
        "uses": ["media"],
    },
}


class Page(PublishableModel, SEOModel, TimeStampedModel):
    class Kind(models.TextChoices):
        HOME = "home", _("صفحه‌ی اصلی")
        STANDARD = "standard", _("صفحه‌ی معمولی")
        LANDING = "landing", _("لندینگ")

    slug = models.SlugField(
        _("شناسه‌ی نشانی"), max_length=120, unique=True, allow_unicode=True
    )
    title = models.CharField(_("عنوان"), max_length=200)
    title_en = models.CharField(_("عنوان انگلیسی"), max_length=200, blank=True)
    kind = models.CharField(
        _("نوع"), max_length=10, choices=Kind.choices, default=Kind.STANDARD
    )
    is_locked = models.BooleanField(
        _("قفل‌شده (غیرقابل حذف)"), default=False
    )

    class Meta:
        verbose_name = _("صفحه")
        verbose_name_plural = _("صفحات")
        ordering = ("slug",)

    def __str__(self):
        return self.title

    def delete(self, *args, **kwargs):
        if self.is_locked:
            raise ValidationError(_("این صفحه قفل است و قابل حذف نیست."))
        return super().delete(*args, **kwargs)


class PageSection(OrderedModel, TimeStampedModel):
    page = models.ForeignKey(
        Page, verbose_name=_("صفحه"), on_delete=models.CASCADE, related_name="sections"
    )
    section_type = models.CharField(
        _("نوع بخش"), max_length=20, choices=SectionType.choices
    )

    eyebrow = models.CharField(_("ریزعنوان"), max_length=120, blank=True)
    heading = models.CharField(_("عنوان"), max_length=240, blank=True)
    subheading = models.CharField(_("زیرعنوان"), max_length=300, blank=True)
    body = models.TextField(_("متن"), blank=True)

    image = models.ForeignKey(
        "media_library.MediaAsset",
        verbose_name=_("تصویر"),
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="page_sections",
    )
    settings = models.JSONField(_("تنطیمات"), default=dict, blank=True)

    is_enabled = models.BooleanField(_("فعال"), default=True, db_index=True)
    background = models.CharField(
        _("پس‌زمینه"),
        max_length=10,
        choices=(
            ("default", _("پیش‌فرض")),
            ("surface", _("سطح")),
            ("surface2", _("سطح دوم")),
            ("accent", _("رنگ تأکیدی")),
        ),
        default="default",
    )
    spacing = models.CharField(
        _("فاصله"),
        max_length=10,
        choices=(
            ("compact", _("فشرده")),
            ("normal", _("عادی")),
            ("spacious", _("باز")),
        ),
        default="normal",
    )

    class Meta(OrderedModel.Meta):
        verbose_name = _("بخش صفحه")
        verbose_name_plural = _("بخش‌های صفحه")

    def __str__(self):
        return f"{self.page_id} / {self.get_section_type_display()}"

    @property
    def schema(self) -> dict:
        return SECTION_SCHEMA.get(self.section_type, {})

    def duplicate(self):
        clone = PageSection.objects.get(pk=self.pk)
        clone.pk = None
        clone.order = (self.page.sections.count() or 0) + 1
        clone.is_enabled = False
        clone.save()
        return clone
