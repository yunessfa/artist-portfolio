"""Artist profile, biography, CV, testimonials and services."""

from django.db import models
from django.utils.translation import gettext_lazy as _

from apps.core.models import OrderedModel, SingletonModel, TimeStampedModel


class CVSection(models.TextChoices):
    EXHIBITIONS = "exhibitions", _("نمایشگاه‌ها")
    EDUCATION = "education", _("تحصیلات")
    AWARDS = "awards", _("جوایز")
    EXPERIENCE = "experience", _("تجربه‌ها")
    COLLABORATIONS = "collaborations", _("همکاری‌ها")
    PUBLICATIONS = "publications", _("مقالات و انتشارات")
    COLLECTIONS = "collections", _("مجموعه‌های میزبان")


class Artist(SingletonModel, TimeStampedModel):
    name = models.CharField(_("نام"), max_length=120, default="نام هنرمند")
    name_latin = models.CharField(_("نام لاتین"), max_length=120, blank=True)
    role = models.CharField(_("عنوان شغلی"), max_length=160, blank=True)
    role_en = models.CharField(_("عنوان انگلیسی"), max_length=160, blank=True)
    city = models.CharField(_("شهر"), max_length=120, blank=True)
    birth_year = models.CharField(_("سال تولد"), max_length=20, blank=True)

    # Hero — the legacy prototype animated three separate lines
    hero_line_1 = models.CharField(_("خط اول هیرو"), max_length=80, blank=True)
    hero_line_2 = models.CharField(_("خط دوم هیرو"), max_length=80, blank=True)
    hero_line_3 = models.CharField(_("خط سوم هیرو"), max_length=80, blank=True)
    hero_caption = models.TextField(_("توضیح هیرو"), blank=True)
    hero_cta_label = models.CharField(_("متن دکمه‌ی هیرو"), max_length=60, blank=True)
    hero_cta_url = models.CharField(_("لینک دکمه‌ی هیرو"), max_length=240, blank=True)

    about_title = models.CharField(_("عنوان درباره"), max_length=200, blank=True)
    biography = models.TextField(_("بیوگرافی"), blank=True)
    biography_en = models.TextField(_("بیوگرافی انگلیسی"), blank=True)
    statement = models.TextField(_("بیانیه‌ی هنری"), blank=True)
    philosophy = models.TextField(_("فلسفه‌ی کاری"), blank=True)

    spotlight_quote = models.TextField(_("نقل قول شاخص"), blank=True)
    spotlight_meta = models.CharField(_("منبع نقل قول"), max_length=200, blank=True)

    email = models.EmailField(_("ایمیل"), blank=True)
    phone = models.CharField(_("تلفن"), max_length=60, blank=True)
    studio_address = models.CharField(_("نشانی استودیو"), max_length=240, blank=True)

    portrait = models.ForeignKey(
        "media_library.MediaAsset",
        verbose_name=_("پرتره"),
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="artist_portraits",
    )
    studio_image = models.ForeignKey(
        "media_library.MediaAsset",
        verbose_name=_("تصویر استودیو"),
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="artist_studios",
    )
    cv_file = models.ForeignKey(
        "media_library.MediaAsset",
        verbose_name=_("فایل رزومه (PDF)"),
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="artist_cvs",
    )

    class Meta:
        verbose_name = _("هنرمند")
        verbose_name_plural = _("هنرمند")

    def __str__(self):
        return self.name

    @property
    def hero_lines(self) -> list[str]:
        return [
            line
            for line in (self.hero_line_1, self.hero_line_2, self.hero_line_3)
            if line
        ]


class _SimpleEntry(OrderedModel, TimeStampedModel):
    is_active = models.BooleanField(_("فعال"), default=True)

    class Meta(OrderedModel.Meta):
        abstract = True


class Medium(_SimpleEntry):
    """Materials the artist works with (legacy `Nn.media`)."""

    label = models.CharField(_("عنوان"), max_length=80, unique=True)
    label_en = models.CharField(_("عنوان انگلیسی"), max_length=80, blank=True)

    class Meta(_SimpleEntry.Meta):
        verbose_name = _("مدیوم کاری")
        verbose_name_plural = _("مدیوم‌های کاری")

    def __str__(self):
        return self.label


class Stat(_SimpleEntry):
    """The four counters shown under the hero."""

    value = models.CharField(_("عدد"), max_length=20)
    suffix = models.CharField(_("پسوند"), max_length=10, blank=True)
    label = models.CharField(_("عنوان"), max_length=120, unique=True)

    class Meta(_SimpleEntry.Meta):
        verbose_name = _("آمار")
        verbose_name_plural = _("آمارها")

    def __str__(self):
        return f"{self.value}{self.suffix} {self.label}"


class Education(_SimpleEntry):
    year = models.CharField(_("سال"), max_length=20, blank=True)
    degree = models.CharField(_("مدرک / دوره"), max_length=200)
    institution = models.CharField(_("مرکز آموزشی"), max_length=200, blank=True)
    city = models.CharField(_("شهر"), max_length=120, blank=True)
    description = models.TextField(_("توضیح"), blank=True)

    class Meta(_SimpleEntry.Meta):
        verbose_name = _("تحصیلات")
        verbose_name_plural = _("تحصیلات")

    def __str__(self):
        return self.degree


class Award(_SimpleEntry):
    year = models.CharField(_("سال"), max_length=20, blank=True)
    title = models.CharField(_("عنوان جایزه"), max_length=200)
    issuer = models.CharField(_("اهداکننده"), max_length=200, blank=True)
    description = models.TextField(_("توضیح"), blank=True)

    class Meta(_SimpleEntry.Meta):
        verbose_name = _("جایزه")
        verbose_name_plural = _("جوایز")

    def __str__(self):
        return self.title


class Publication(_SimpleEntry):
    year = models.CharField(_("سال"), max_length=20, blank=True)
    title = models.CharField(_("عنوان"), max_length=240)
    publisher = models.CharField(_("ناشر / رسانه"), max_length=200, blank=True)
    author = models.CharField(_("نویسنده"), max_length=200, blank=True)
    url = models.URLField(_("لینک"), blank=True)

    class Meta(_SimpleEntry.Meta):
        verbose_name = _("انتشار")
        verbose_name_plural = _("انتشارات")

    def __str__(self):
        return self.title


class TimelineEntry(_SimpleEntry):
    """Scroll-animated biography timeline on the About page."""

    year = models.CharField(_("سال"), max_length=20, blank=True)
    title = models.CharField(_("عنوان"), max_length=200)
    body = models.TextField(_("متن"), blank=True)
    image = models.ForeignKey(
        "media_library.MediaAsset",
        verbose_name=_("تصویر"),
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="timeline_entries",
    )

    class Meta(_SimpleEntry.Meta):
        verbose_name = _("مقطع زمانی")
        verbose_name_plural = _("خط زمانی")

    def __str__(self):
        return f"{self.year} — {self.title}"


class Testimonial(_SimpleEntry):
    text = models.TextField(_("متن نقد"))
    author = models.CharField(_("نویسنده"), max_length=160, unique=True)
    source = models.CharField(_("منبع"), max_length=200, blank=True)
    url = models.URLField(_("لینک"), blank=True)
    avatar = models.ForeignKey(
        "media_library.MediaAsset",
        verbose_name=_("تصویر"),
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="testimonial_avatars",
    )

    class Meta(_SimpleEntry.Meta):
        verbose_name = _("نقد")
        verbose_name_plural = _("نقدها")

    def __str__(self):
        return self.author


class Service(_SimpleEntry):
    title = models.CharField(_("عنوان"), max_length=160, unique=True)
    description = models.TextField(_("توضیح"), blank=True)
    icon = models.CharField(_("نشانه"), max_length=8, blank=True)
    cta_label = models.CharField(_("متن دکمه"), max_length=60, blank=True)
    cta_url = models.CharField(_("لینک دکمه"), max_length=240, blank=True)

    class Meta(_SimpleEntry.Meta):
        verbose_name = _("خدمت / همکاری")
        verbose_name_plural = _("خدمات و همکاری‌ها")

    def __str__(self):
        return self.title


class CVEntry(_SimpleEntry):
    """Fully dynamic CV rows: the artist can add any section row from admin."""

    section = models.CharField(
        _("بخش"), max_length=20, choices=CVSection.choices, db_index=True
    )
    year = models.CharField(_("سال"), max_length=20, blank=True)
    title = models.CharField(_("عنوان"), max_length=240)
    place = models.CharField(_("محل / مرجع"), max_length=240, blank=True)
    description = models.TextField(_("توضیح"), blank=True)
    url = models.URLField(_("لینک"), blank=True)

    class Meta(_SimpleEntry.Meta):
        verbose_name = _("ردیف رزومه")
        verbose_name_plural = _("رزومه")
        ordering = ("section", "order", "id")
        unique_together = (("section", "title"),)

    def __str__(self):
        return f"{self.get_section_display()}: {self.title}"
