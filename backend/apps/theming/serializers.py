"""Theme serializers + the resolver that turns a Theme row into the exact set
of CSS custom properties the frontend writes onto <html>.

The two `detect_*` helpers are faithful ports of the legacy JS helpers so the
automatic day/night and seasonal behaviour is byte-for-byte identical.
"""

from datetime import datetime

from rest_framework import serializers

from .models import Season, Theme, ThemeConfig, ThemeVariant


# --------------------------------------------------------------------------- #
# Legacy logic, preserved
# --------------------------------------------------------------------------- #
def detect_season(seasons, now: datetime | None = None):
    """Port of the legacy `ii()` helper.

    code = month * 100 + day; spring [320,621), summer [621,923),
    autumn [923,1221), otherwise winter (the wrapping range).
    """
    from django.utils import timezone

    now = now or timezone.localtime()
    code = now.month * 100 + now.day

    fallback = None
    for season in seasons:
        start, end = season.start_code, season.end_code
        if start <= end:
            if start <= code < end:
                return season
        else:
            # wrapping window (winter: 1221 -> 320)
            fallback = season
            if code >= start or code < end:
                return season
    return fallback or (seasons[0] if seasons else None)


def detect_mode(now: datetime | None = None) -> str:
    """Port of the legacy `ci()` helper: 07:00–18:59 is day, else night."""
    from django.utils import timezone

    now = now or timezone.localtime()
    return "day" if 7 <= now.hour < 19 else "night"


# --------------------------------------------------------------------------- #
class ThemeVariantSerializer(serializers.ModelSerializer):
    class Meta:
        model = ThemeVariant
        fields = (
            "mode",
            "bg",
            "surface",
            "surface_2",
            "line",
            "text",
            "muted",
            "accent",
            "accent_soft",
            "on_accent",
            "shadow",
        )


class SeasonSerializer(serializers.ModelSerializer):
    class Meta:
        model = Season
        fields = (
            "id",
            "key",
            "name",
            "name_en",
            "icon",
            "word",
            "particle",
            "start_code",
            "end_code",
            "day_s1",
            "day_s2",
            "day_glow",
            "night_s1",
            "night_s2",
            "night_glow",
            "is_active",
            "order",
        )

    def tokens(self, mode: str) -> dict:
        instance = self.instance
        if mode == "night":
            return {
                "--season-1": instance.night_s1,
                "--season-2": instance.night_s2,
                "--season-glow": instance.night_glow,
            }
        return {
            "--season-1": instance.day_s1,
            "--season-2": instance.day_s2,
            "--season-glow": instance.day_glow,
        }


def season_tokens(season, mode: str) -> dict:
    if season is None:
        return {}
    if mode == "night":
        return {
            "--season-1": season.night_s1,
            "--season-2": season.night_s2,
            "--season-glow": season.night_glow,
        }
    return {
        "--season-1": season.day_s1,
        "--season-2": season.day_s2,
        "--season-glow": season.day_glow,
    }


def variant_tokens(variant) -> dict:
    if variant is None:
        return {}
    return {
        "--bg": variant.bg,
        "--surface": variant.surface,
        "--surface-2": variant.surface_2,
        "--line": variant.line,
        "--text": variant.text,
        "--muted": variant.muted,
        "--accent": variant.accent,
        "--accent-soft": variant.accent_soft,
        "--on-accent": variant.on_accent,
        "--shadow": variant.shadow,
    }


class ThemeSerializer(serializers.ModelSerializer):
    variants = ThemeVariantSerializer(many=True, read_only=True)
    swatch = serializers.ListField(child=serializers.CharField(), read_only=True)
    tokens = serializers.SerializerMethodField()
    motion = serializers.SerializerMethodField()

    class Meta:
        model = Theme
        fields = (
            "id",
            "key",
            "name",
            "name_en",
            "note",
            "is_active",
            "is_builtin",
            "order",
            "swatch",
            "swatch_1",
            "swatch_2",
            "swatch_3",
            "font_display",
            "font_body",
            "display_weight",
            "display_track",
            "eyebrow_track",
            "body_size",
            "line_height",
            "heading_scale",
            "radius",
            "radius_sm",
            "border_width",
            "container_width",
            "section_spacing",
            "grid_gap",
            "button_style",
            "card_style",
            "cursor_style",
            "gallery_layout",
            "motion_style",
            "animation_speed",
            "parallax_intensity",
            "reveal_preset",
            "hover_preset",
            "page_transition",
            "easing",
            "enable_particles",
            "enable_grain",
            "variants",
            "tokens",
            "motion",
        )
        read_only_fields = ("is_builtin",)

    def get_tokens(self, obj) -> dict:
        """Mode-independent tokens (typography, spacing, motion scalars)."""
        return {
            "--radius": obj.radius,
            "--radius-sm": obj.radius_sm,
            "--border-w": obj.border_width,
            "--font-display": obj.font_display,
            "--font-body": obj.font_body,
            "--display-weight": obj.display_weight,
            "--display-track": obj.display_track,
            "--eyebrow-track": obj.eyebrow_track,
            "--body-size": obj.body_size,
            "--line-height": obj.line_height,
            "--container-w": obj.container_width,
            "--section-space": obj.section_spacing,
            "--grid-gap": obj.grid_gap,
            "--ease": obj.easing,
            "--anim-scale": str(obj.animation_speed),
            "--parallax-scale": str(obj.parallax_intensity),
        }

    def get_motion(self, obj) -> dict:
        return {
            "style": obj.motion_style,
            "animationSpeed": float(obj.animation_speed),
            "parallaxIntensity": float(obj.parallax_intensity),
            "revealPreset": obj.reveal_preset,
            "hoverPreset": obj.hover_preset,
            "pageTransition": obj.page_transition,
            "easing": obj.easing,
            "particles": obj.enable_particles,
            "grain": obj.enable_grain,
        }


class ThemeConfigSerializer(serializers.ModelSerializer):
    resolved = serializers.SerializerMethodField()
    active_theme_key = serializers.CharField(
        source="active_theme.key", read_only=True, default=""
    )

    class Meta:
        model = ThemeConfig
        fields = (
            "active_theme",
            "active_theme_key",
            "mode_strategy",
            "season_strategy",
            "fixed_season",
            "allow_visitor_override",
            "overrides",
            "resolved",
            "updated_at",
        )

    def get_resolved(self, obj) -> dict:
        return resolve_theme(obj, context=self.context)


# --------------------------------------------------------------------------- #
def resolve_theme(config: ThemeConfig, context=None, mode: str | None = None,
                  season_key: str | None = None) -> dict:
    """Compute the final CSS variable set for the current request.

    Returns everything the frontend needs to paint the first frame with the
    correct theme — no flash, no reload.
    """
    theme = config.active_theme or Theme.objects.filter(is_active=True).first()
    if theme is None:
        return {}

    # --- mode ------------------------------------------------------------- #
    if mode not in {"day", "night"}:
        if config.mode_strategy in {"day", "night"}:
            mode = config.mode_strategy
        elif config.mode_strategy == "system":
            mode = "system"
        else:
            mode = detect_mode()
    effective_mode = detect_mode() if mode == "system" else mode

    variant = theme.variants.filter(mode=effective_mode).first()

    # --- season ----------------------------------------------------------- #
    season = None
    seasons = list(Season.objects.filter(is_active=True))
    if config.season_strategy == "fixed":
        season = config.fixed_season
    elif config.season_strategy == "auto":
        if season_key:
            season = next((s for s in seasons if s.key == season_key), None)
        season = season or detect_season(seasons)

    tokens = {}
    tokens.update(ThemeSerializer(theme).get_tokens(theme))
    tokens.update(variant_tokens(variant))
    tokens.update(season_tokens(season, effective_mode))

    # admin-level customisation always wins
    overrides = config.overrides or {}
    if isinstance(overrides, dict):
        tokens.update(
            {
                key: value
                for key, value in overrides.items()
                if isinstance(key, str) and key.startswith("--")
            }
        )

    return {
        "themeKey": theme.key,
        "themeName": theme.name,
        "mode": effective_mode,
        "modeStrategy": config.mode_strategy,
        "season": season.key if season else None,
        "seasonWord": season.word if season else "",
        "seasonIcon": season.icon if season else "",
        "seasonParticle": season.particle if season else "",
        "seasonStrategy": config.season_strategy,
        "allowVisitorOverride": config.allow_visitor_override,
        "dataAttributes": {
            "data-template": theme.key,
            "data-mode": effective_mode,
            "data-season": season.key if season else "none",
        },
        "colorScheme": "dark" if effective_mode == "night" else "light",
        "tokens": tokens,
        "motion": ThemeSerializer(theme).get_motion(theme),
        "galleryLayout": theme.gallery_layout,
        "cursorStyle": theme.cursor_style,
        "buttonStyle": theme.button_style,
        "cardStyle": theme.card_style,
    }
