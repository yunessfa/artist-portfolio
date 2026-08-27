"""Theme engine.

The legacy prototype had a three-dimensional theme system implemented in JS:
4 templates x 2 modes (day/night) x 4 seasons = 32 visual combinations, applied
by writing 21 CSS custom properties onto <html>.

That system is preserved here — but as real database rows, so the artist can
edit presets, create new ones, and the active theme survives refresh, server
restart and redeploy.
"""

from django.core.exceptions import ValidationError
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.utils.translation import gettext_lazy as _

from apps.core.models import GalleryLayout, OrderedModel, SingletonModel, TimeStampedModel

DEFAULT_EASING = "cubic-bezier(.16,1,.3,1)"


class ButtonStyle(models.TextChoices):
    SOFT = "soft", _("نرم")
    PILL = "pill", _("کپسولی")
    SHARP = "sharp", _("تیز")
    OUTLINE = "outline", _("خطی")


class CardStyle(models.TextChoices):
    SOFT = "soft", _("نرم")
    ELEVATED = "elevated", _("سایه‌دار")
    BORDERED = "bordered", _("قاب‌دار")
    BRUTAL = "brutal", _("گرافیکی")
    FLAT = "flat", _("تخت")


class CursorStyle(models.TextChoices):
    NONE = "none", _("غیرفعال")
    DOT = "dot", _("نقطه")
    RING = "ring", _("حلقه")
    CROSS = "cross", _("ضربدری")


class MotionStyle(models.TextChoices):
    MINIMAL = "minimal", _("مینیمال / آرام")
    ELEGANT = "elegant", _("لطیف / مجله‌ای")
    CINEMATIC = "cinematic", _("سینمایی / دراماتیک")
    EXPERIMENTAL = "experimental", _("تجربی / هنری")


class Theme(OrderedModel, TimeStampedModel):
    key = models.SlugField(_("کلید"), max_length=40, unique=True)
    name = models.CharField(_("نام"), max_length=80)
    name_en = models.CharField(_("نام انگلیسی"), max_length=80, blank=True)
    note = models.CharField(_("توضیح کوتاه"), max_length=160, blank=True)
    is_active = models.BooleanField(_("قابل انتخاب"), default=True)
    is_builtin = models.BooleanField(_("پیش‌فرض سیستم"), default=False)

    swatch_1 = models.CharField(_("رنگ ۱"), max_length=9, default="#FFFFFF")
    swatch_2 = models.CharField(_("رنگ ۲"), max_length=9, default="#B4552F")
    swatch_3 = models.CharField(_("رنگ ۳"), max_length=9, default="#2A2521")

    font_display = models.CharField(_("فونت تیتر"), max_length=200)
    font_body = models.CharField(_("فونت متن"), max_length=200)
    display_weight = models.CharField(_("وزن تیتر"), max_length=10, default="700")
    display_track = models.CharField(_("فاصله‌ی حروف تیتر"), max_length=12, default="-0.02em")
    eyebrow_track = models.CharField(_("فاصله‌ی حروف ریز"), max_length=12, default="0.2em")
    body_size = models.CharField(_("اندازه‌ی متن"), max_length=12, default="16px")
    line_height = models.CharField(_("ارتفاع خط"), max_length=12, default="1.75")
    heading_scale = models.DecimalField(
        _("مقیاس تیترها"), max_digits=4, decimal_places=2, default=1.0
    )

    radius = models.CharField(_("گردی گوشه"), max_length=12, default="12px")
    radius_sm = models.CharField(_("گردی کوچک"), max_length=12, default="8px")
    border_width = models.CharField(_("ضخامت خط"), max_length=8, default="1px")
    container_width = models.CharField(_("عرض کانتینر"), max_length=12, default="1240px")
    section_spacing = models.CharField(_("فاصله‌ی بخش‌ها"), max_length=12, default="120px")
    grid_gap = models.CharField(_("فاصله‌ی گرید"), max_length=12, default="28px")

    button_style = models.CharField(
        _("سبک دکمه"), max_length=12, choices=ButtonStyle.choices, default=ButtonStyle.SOFT
    )
    card_style = models.CharField(
        _("سبک کارت"), max_length=12, choices=CardStyle.choices, default=CardStyle.SOFT
    )
    cursor_style = models.CharField(
        _("سبک نشانگر"), max_length=8, choices=CursorStyle.choices, default=CursorStyle.DOT
    )
    gallery_layout = models.CharField(
        _("چیدمان گالری"),
        max_length=20,
        choices=GalleryLayout.choices,
        default=GalleryLayout.EDITORIAL,
    )

    motion_style = models.CharField(
        _("سبک انیمیشن"),
        max_length=16,
        choices=MotionStyle.choices,
        default=MotionStyle.ELEGANT,
    )
    animation_speed = models.DecimalField(
        _("سرعت انیمیشن"),
        max_digits=3,
        decimal_places=2,
        default=1.0,
        validators=[MinValueValidator(0.2), MaxValueValidator(2.5)],
    )
    parallax_intensity = models.DecimalField(
        _("شدت پارالاکس"),
        max_digits=3,
        decimal_places=2,
        default=1.0,
        validators=[MinValueValidator(0.0), MaxValueValidator(2.0)],
    )
    reveal_preset = models.CharField(_("پریست ظاهرشدن"), max_length=24, default="fadeUp")
    hover_preset = models.CharField(_("پریست هور"), max_length=24, default="lift")
    page_transition = models.CharField(_("ترانزیشن صفحه"), max_length=24, default="fade")
    easing = models.CharField(_("منحنی حرکت"), max_length=80, default=DEFAULT_EASING)
    enable_particles = models.BooleanField(_("ذرات فصلی"), default=True)
    enable_grain = models.BooleanField(_("بافت دانه‌دار"), default=True)

    class Meta(OrderedModel.Meta):
        verbose_name = _("قالب (Theme)")
        verbose_name_plural = _("قالب‌ها (Themes)")

    def __str__(self):
        return self.name

    @property
    def swatch(self) -> list[str]:
        return [self.swatch_1, self.swatch_2, self.swatch_3]

    def duplicate(self):
        """Clone a preset (including both mode variants) for customisation."""
        variants = list(self.variants.all())
        base_key = f"{self.key}-copy"
        key, counter = base_key, 2
        while Theme.objects.filter(key=key).exists():
            key = f"{base_key}-{counter}"
            counter += 1

        clone = Theme.objects.get(pk=self.pk)
        clone.pk = None
        clone.key = key
        clone.name = f"{self.name} (کپی)"
        clone.is_builtin = False
        clone.order = (Theme.objects.count() or 0) + 1
        clone.save()
        for variant in variants:
            variant.pk = None
            variant.theme = clone
            variant.save()
        return clone

    def delete(self, *args, **kwargs):
        if self.is_builtin:
            raise ValidationError(_("قالب‌های پیش‌فرض قابل حذف نیستند."))
        return super().delete(*args, **kwargs)


class ThemeVariant(models.Model):
    """The 10 colour tokens for one mode (day or night) of a theme."""

    class Mode(models.TextChoices):
        DAY = "day", _("روز")
        NIGHT = "night", _("شب")

    theme = models.ForeignKey(
        Theme, on_delete=models.CASCADE, related_name="variants", verbose_name=_("قالب")
    )
    mode = models.CharField(_("حالت"), max_length=6, choices=Mode.choices)

    bg = models.CharField("--bg", max_length=40)
    surface = models.CharField("--surface", max_length=40)
    surface_2 = models.CharField("--surface-2", max_length=40)
    line = models.CharField("--line", max_length=40)
    text = models.CharField("--text", max_length=40)
    muted = models.CharField("--muted", max_length=40)
    accent = models.CharField("--accent", max_length=40)
    accent_soft = models.CharField("--accent-soft", max_length=60)
    on_accent = models.CharField("--on-accent", max_length=40)
    shadow = models.CharField("--shadow", max_length=200, blank=True)

    class Meta:
        verbose_name = _("حالت قالب")
        verbose_name_plural = _("حالت‌های قالب")
        unique_together = (("theme", "mode"),)
        ordering = ("theme", "mode")

    def __str__(self):
        return f"{self.theme.key} / {self.mode}"


class Season(OrderedModel, TimeStampedModel):
    """Seasonal accent layer, ported from the legacy `ui` array.

    start_code / end_code are MMDD integers (month*100 + day) — exactly the
    comparison the original JS `ii()` helper used.
    """

    key = models.SlugField(_("کلید"), max_length=20, unique=True)
    name = models.CharField(_("نام"), max_length=40)
    name_en = models.CharField(_("نام انگلیسی"), max_length=40, blank=True)
    icon = models.CharField(_("نشانه"), max_length=8, blank=True)
    word = models.CharField(_("واژه‌ی فصل"), max_length=40, blank=True)
    particle = models.CharField(_("نوع ذره"), max_length=20, blank=True)

    start_code = models.PositiveSmallIntegerField(_("شروع (MMDD)"), default=101)
    end_code = models.PositiveSmallIntegerField(_("پایان (MMDD)"), default=1231)

    day_s1 = models.CharField("--season-1 (روز)", max_length=40)
    day_s2 = models.CharField("--season-2 (روز)", max_length=40)
    day_glow = models.CharField("--season-glow (روز)", max_length=60)
    night_s1 = models.CharField("--season-1 (شب)", max_length=40)
    night_s2 = models.CharField("--season-2 (شب)", max_length=40)
    night_glow = models.CharField("--season-glow (شب)", max_length=60)

    is_active = models.BooleanField(_("فعال"), default=True)

    class Meta(OrderedModel.Meta):
        verbose_name = _("فصل")
        verbose_name_plural = _("فصل‌ها")

    def __str__(self):
        return f"{self.icon} {self.name}".strip()


class ThemeConfig(SingletonModel, TimeStampedModel):
    """The live theme configuration — this is what makes the active theme
    persist across refresh, restart and deployment.
    """

    class ModeStrategy(models.TextChoices):
        AUTO = "auto", _("خودکار (ساعت روز)")
        SYSTEM = "system", _("هماهنگ با سیستم کاربر")
        DAY = "day", _("همیشه روز")
        NIGHT = "night", _("همیشه شب")

    class SeasonStrategy(models.TextChoices):
        AUTO = "auto", _("خودکار (تاریخ)")
        FIXED = "fixed", _("فصل ثابت")
        OFF = "off", _("غیرفعال")

    active_theme = models.ForeignKey(
        Theme,
        verbose_name=_("قالب فعال"),
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="active_configs",
    )
    mode_strategy = models.CharField(
        _("روش انتخاب روز/شب"),
        max_length=8,
        choices=ModeStrategy.choices,
        default=ModeStrategy.AUTO,
    )
    season_strategy = models.CharField(
        _("روش انتخاب فصل"),
        max_length=8,
        choices=SeasonStrategy.choices,
        default=SeasonStrategy.AUTO,
    )
    fixed_season = models.ForeignKey(
        Season,
        verbose_name=_("فصل ثابت"),
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="fixed_configs",
    )
    allow_visitor_override = models.BooleanField(
        _("اجازه‌ی تغییر قالب توسط بازدیدکننده"), default=True
    )
    overrides = models.JSONField(
        _("بازنویسی توکن‌ها"), default=dict, blank=True
    )

    class Meta:
        verbose_name = _("تنطیمات قالب")
        verbose_name_plural = _("تنطیمات قالب")

    def __str__(self):
        return _("تنطیمات قالب سایت")
