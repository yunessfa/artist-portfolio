"""Import every piece of content and every visual preset from the legacy
single-file prototype into the database.

This command is fully **idempotent**: running it twice never duplicates rows.
It is what turns the old hardcoded JS arrays into real, editable CMS data:

    legacy `ni`  -> Theme + ThemeVariant   (4 presets x day/night)
    legacy `ui`  -> Season                 (4 seasons, MMDD windows)
    legacy `Pl`  -> Artist                 (singleton profile)
    legacy `no`  -> NavigationItem
    legacy `um`  -> Stat
    legacy `fi`  -> Category
    legacy `be`  -> Artwork + ArtworkImage
    legacy `oi`  -> Artist.spotlight_quote
    legacy `Nn`  -> Artist.biography + Medium
    legacy `si.*`-> Exhibition / Award / Education / CVEntry
    legacy `im`  -> Testimonial
    legacy `cm`  -> Service

The six images that were inlined as base64 data-URIs are read from
`backend/seed_assets/` and stored as real media-library files.
"""

from __future__ import annotations

from pathlib import Path

from django.core.files import File
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from apps.artist.models import (
    Artist,
    Award,
    CVEntry,
    CVSection,
    Education,
    Medium,
    Publication,
    Service,
    Stat,
    Testimonial,
    TimelineEntry,
)
from apps.artworks.models import (
    Artwork,
    ArtworkImage,
    Availability,
    Category,
    Collection,
    LayoutSpan,
)
from apps.core.models import (
    GalleryLayout,
    NavigationItem,
    PublishStatus,
    SiteSetting,
    SocialLink,
)
from apps.exhibitions.models import Exhibition
from apps.media_library.models import MediaAsset, MediaFolder
from apps.pagebuilder.models import Page, PageSection, SectionType
from apps.theming.models import (
    DEFAULT_EASING,
    ButtonStyle,
    CardStyle,
    CursorStyle,
    MotionStyle,
    Season,
    Theme,
    ThemeConfig,
    ThemeVariant,
)

SEED_ASSETS = Path(__file__).resolve().parents[4] / "seed_assets"

FONT_SERIF = "'Vazirmatn', 'Noto Naskh Arabic', Georgia, serif"
FONT_SANS = "'Vazirmatn', 'Noto Sans Arabic', Tahoma, sans-serif"
FONT_BODY = "'Vazirmatn', 'Noto Sans Arabic', Tahoma, system-ui, sans-serif"

# --------------------------------------------------------------------------- #
# 1. Themes — the exact four presets from the legacy `ni` array
# --------------------------------------------------------------------------- #
THEMES = [
    {
        "key": "atelier",
        "name": "آتلیه",
        "name_en": "Atelier",
        "note": "خاکی، گرم، مجله‌ای",
        "swatch": ("#FBF8F4", "#B4552F", "#2A2521"),
        "font_display": FONT_SERIF,
        "display_weight": "600",
        "display_track": "-0.01em",
        "eyebrow_track": "0.18em",
        "radius": "14px",
        "radius_sm": "10px",
        "border_width": "1px",
        "motion_style": MotionStyle.ELEGANT,
        "button_style": ButtonStyle.SOFT,
        "card_style": CardStyle.SOFT,
        "cursor_style": CursorStyle.DOT,
        "gallery_layout": GalleryLayout.EDITORIAL,
        "animation_speed": 1.0,
        "parallax_intensity": 1.0,
        "day": {
            "bg": "#FBF8F4", "surface": "#FFFFFF", "surface_2": "#F4EEE6",
            "line": "#E6DED2", "text": "#2A2521", "muted": "#7A6F63",
            "accent": "#B4552F", "accent_soft": "#F7E7DD", "on_accent": "#FFFFFF",
            "shadow": "0 1px 2px rgba(42,37,33,.05), 0 18px 40px rgba(42,37,33,.07)",
        },
        "night": {
            "bg": "#17130F", "surface": "#201B15", "surface_2": "#282118",
            "line": "rgba(255,255,255,.14)", "text": "#F8F2EA",
            "muted": "rgba(248,242,234,.64)", "accent": "#E28A54",
            "accent_soft": "rgba(226,138,84,.16)", "on_accent": "#1B1510",
            "shadow": "0 1px 2px rgba(0,0,0,.4), 0 22px 48px rgba(0,0,0,.45)",
        },
    },
    {
        "key": "noir",
        "name": "گالری نوآر",
        "name_en": "Gallery Noir",
        "note": "مینیمال، برنجی، نمایشگاهی",
        "swatch": ("#0D0D0E", "#D9B54A", "#F7F7F5"),
        "font_display": FONT_SANS,
        "display_weight": "800",
        "display_track": "-0.03em",
        "eyebrow_track": "0.32em",
        "radius": "4px",
        "radius_sm": "3px",
        "border_width": "1px",
        "motion_style": MotionStyle.CINEMATIC,
        "button_style": ButtonStyle.SHARP,
        "card_style": CardStyle.BORDERED,
        "cursor_style": CursorStyle.RING,
        "gallery_layout": GalleryLayout.FULLSCREEN,
        "animation_speed": 1.15,
        "parallax_intensity": 1.25,
        "day": {
            "bg": "#F6F6F4", "surface": "#FFFFFF", "surface_2": "#ECECE8",
            "line": "#DEDEDA", "text": "#121211", "muted": "#6C6C66",
            "accent": "#9A7B18", "accent_soft": "#F2EAD1", "on_accent": "#FFFFFF",
            "shadow": "0 1px 2px rgba(18,18,17,.05), 0 20px 44px rgba(18,18,17,.08)",
        },
        "night": {
            "bg": "#0C0C0D", "surface": "#141416", "surface_2": "#1C1C1F",
            "line": "rgba(255,255,255,.16)", "text": "#FAFAF8",
            "muted": "rgba(250,250,248,.60)", "accent": "#E3C463",
            "accent_soft": "rgba(227,196,99,.14)", "on_accent": "#131310",
            "shadow": "0 1px 2px rgba(0,0,0,.5), 0 26px 60px rgba(0,0,0,.55)",
        },
    },
    {
        "key": "pastel",
        "name": "استودیو پاستل",
        "name_en": "Pastel Studio",
        "note": "نرم، لطیف، دلنشین",
        "swatch": ("#FBF7F6", "#6F9A7B", "#D98C9A"),
        "font_display": FONT_SANS,
        "display_weight": "700",
        "display_track": "-0.015em",
        "eyebrow_track": "0.16em",
        "radius": "22px",
        "radius_sm": "16px",
        "border_width": "1px",
        "motion_style": MotionStyle.MINIMAL,
        "button_style": ButtonStyle.PILL,
        "card_style": CardStyle.ELEVATED,
        "cursor_style": CursorStyle.DOT,
        "gallery_layout": GalleryLayout.MASONRY,
        "animation_speed": 0.9,
        "parallax_intensity": 0.8,
        "day": {
            "bg": "#FBF7F6", "surface": "#FFFFFF", "surface_2": "#F1EFE9",
            "line": "#E7E2DD", "text": "#2B302C", "muted": "#77807A",
            "accent": "#4F7A5E", "accent_soft": "#E6F0E8", "on_accent": "#FFFFFF",
            "shadow": "0 1px 2px rgba(43,48,44,.05), 0 20px 44px rgba(43,48,44,.07)",
        },
        "night": {
            "bg": "#171A18", "surface": "#1F2320", "surface_2": "#262B27",
            "line": "rgba(255,255,255,.14)", "text": "#F2F5F2",
            "muted": "rgba(242,245,242,.62)", "accent": "#8FBF9D",
            "accent_soft": "rgba(143,191,157,.15)", "on_accent": "#14201A",
            "shadow": "0 1px 2px rgba(0,0,0,.4), 0 24px 52px rgba(0,0,0,.45)",
        },
    },
    {
        "key": "brutal",
        "name": "بوم مدرن",
        "name_en": "Modern Canvas",
        "note": "پرکنتراست، گرافیکی، جسور",
        "swatch": ("#F1F0EA", "#D6452B", "#111111"),
        "font_display": FONT_SANS,
        "display_weight": "900",
        "display_track": "-0.04em",
        "eyebrow_track": "0.24em",
        "radius": "0px",
        "radius_sm": "0px",
        "border_width": "2px",
        "motion_style": MotionStyle.EXPERIMENTAL,
        "button_style": ButtonStyle.SHARP,
        "card_style": CardStyle.BRUTAL,
        "cursor_style": CursorStyle.CROSS,
        "gallery_layout": GalleryLayout.ASYMMETRIC,
        "animation_speed": 1.1,
        "parallax_intensity": 1.4,
        "day": {
            "bg": "#F1F0EA", "surface": "#FFFFFF", "surface_2": "#E4E2D8",
            "line": "#15150F", "text": "#15150F", "muted": "#5F5F55",
            "accent": "#C33F22", "accent_soft": "#F7DED6", "on_accent": "#FFFFFF",
            "shadow": "6px 6px 0 rgba(21,21,15,1)",
        },
        "night": {
            "bg": "#101010", "surface": "#181816", "surface_2": "#212120",
            "line": "rgba(255,255,255,.28)", "text": "#F7F7F1",
            "muted": "rgba(247,247,241,.62)", "accent": "#F0D64B",
            "accent_soft": "rgba(240,214,75,.14)", "on_accent": "#14140E",
            "shadow": "6px 6px 0 rgba(240,214,75,.35)",
        },
    },
]

# --------------------------------------------------------------------------- #
# 2. Seasons — legacy `ui`, including the exact MMDD windows from `ii()`
# --------------------------------------------------------------------------- #
SEASONS = [
    {
        "key": "spring", "name": "بهار", "name_en": "Spring", "icon": "❀",
        "word": "شکوفه", "particle": "petal",
        "start_code": 320, "end_code": 621,
        "day_s1": "#E9A6BE", "day_s2": "#9CC98C", "day_glow": "rgba(233,166,190,.30)",
        "night_s1": "#C97F9B", "night_s2": "#6E9C68", "night_glow": "rgba(201,127,155,.24)",
    },
    {
        "key": "summer", "name": "تابستان", "name_en": "Summer", "icon": "☀",
        "word": "نور", "particle": "mote",
        "start_code": 621, "end_code": 923,
        "day_s1": "#EFB03C", "day_s2": "#48B4C4", "day_glow": "rgba(239,176,60,.30)",
        "night_s1": "#D9962F", "night_s2": "#2E8794", "night_glow": "rgba(217,150,47,.22)",
    },
    {
        "key": "autumn", "name": "پاییز", "name_en": "Autumn", "icon": "❦",
        "word": "خاک", "particle": "leaf",
        "start_code": 923, "end_code": 1221,
        "day_s1": "#D0793A", "day_s2": "#9E4326", "day_glow": "rgba(208,121,58,.28)",
        "night_s1": "#BB6A32", "night_s2": "#7E351E", "night_glow": "rgba(187,106,50,.22)",
    },
    {
        "key": "winter", "name": "زمستان", "name_en": "Winter", "icon": "❄",
        "word": "سکوت", "particle": "snow",
        # wraps across the year end, exactly like the legacy `else` branch
        "start_code": 1221, "end_code": 320,
        "day_s1": "#87ADD6", "day_s2": "#BFD2E4", "day_glow": "rgba(135,173,214,.30)",
        "night_s1": "#6E93BC", "night_s2": "#8FA6BC", "night_glow": "rgba(110,147,188,.22)",
    },
]

# --------------------------------------------------------------------------- #
# 3. Content
# --------------------------------------------------------------------------- #
IMAGES = {
    "paintingAbstract": "خاطره‌ی خاک — بوم انتزاعی با لایه‌های رنگ روغن",
    "sculptureMarble": "مجسمه‌ی مرمر و برنز در نور طبیعی",
    "studio": "کارگاه هنرمند در ساعت پنج عصر",
    "portrait": "پرتره‌ی هنرمند در نیم‌سایه",
    "ceramic": "ظرف سرامیکی با لعاب ترک‌خورده",
    "bronzeNight": "مجسمه‌ی برنزی در نمای شبانه",
}

CATEGORIES = [
    ("painting", "نقاشی", "Painting"),
    ("sculpture", "مجسمه", "Sculpture"),
    ("ceramic", "سرامیک", "Ceramic"),
]

COLLECTIONS = [
    ("memory-of-soil", "خاطره‌ی خاک", "Memory of Soil",
     "مجموعه‌ای از بوم‌های خاکی که از حافظه‌ی زمین می‌آیند.", "۱۴۰۳", "paintingAbstract"),
    ("human-forms", "فرم‌های انسانی", "Human Forms",
     "جست‌وجوی فرم بدن در سنگ و برنز.", "۱۴۰۲", "sculptureMarble"),
    ("silence", "سکوت", "Silence",
     "آثاری که در سکوت کارگاه شکل گرفتند.", "۱۴۰۱", "bronzeNight"),
]

ARTWORKS = [
    {
        "slug": "stone-and-bronze", "title": "هم‌آغوشی سنگ و برنز",
        "title_en": "Stone and Bronze", "category": "sculpture",
        "collection": "human-forms", "year": "۱۴۰۲",
        "technique": "مرمر و برنز", "material": "مرمر، برنز",
        "dimensions": "۱۴۰ × ۶۰ × ۵۵ سانتی‌متر",
        "span": LayoutSpan.TALL, "image": "sculptureMarble", "featured": True,
        "excerpt": "دو متریال سرد که در یک فرم گرم به هم می‌رسند.",
        "concept": "سنگ می‌ماند، برنز می‌درخشد؛ این اثر لحظه‌ی برخورد این دو حافظه است.",
        "availability": Availability.NOT_FOR_SALE,
    },
    {
        "slug": "memory-of-soil-1", "title": "خاطره‌ی خاک ۱",
        "title_en": "Memory of Soil 1", "category": "painting",
        "collection": "memory-of-soil", "year": "۱۴۰۳",
        "technique": "رنگ روغن روی بوم", "material": "رنگ روغن، بوم",
        "dimensions": "۱۲۰ × ۹۰ سانتی‌متر",
        "span": LayoutSpan.NORMAL, "image": "paintingAbstract", "featured": True,
        "excerpt": "لایه‌لایه رنگ، مثل لایه‌های زمین.",
        "concept": "هر لایه رنگ یک سال است؛ بوم مثل برش عمودی خاک خوانده می‌شود.",
        "availability": Availability.AVAILABLE,
    },
    {
        "slug": "half-lit-face", "title": "چهره‌ی نیمه‌روشن",
        "title_en": "Half-lit Face", "category": "painting",
        "collection": "silence", "year": "۱۴۰۱",
        "technique": "رنگ روغن روی بوم", "material": "رنگ روغن، بوم",
        "dimensions": "۹۰ × ۷۰ سانتی‌متر",
        "span": LayoutSpan.TALL, "image": "portrait", "featured": False,
        "excerpt": "نوری که نیمی از صورت را انتخاب می‌کند.",
        "concept": "پرتره‌ای که در آن سایه به اندازه‌ی نور اهمیت دارد.",
        "availability": Availability.PRIVATE_COLLECTION,
    },
    {
        "slug": "cracked-glaze", "title": "لعاب ترک‌خورده",
        "title_en": "Cracked Glaze", "category": "ceramic",
        "collection": "memory-of-soil", "year": "۱۴۰۳",
        "technique": "سرامیک، لعاب کوره‌ای", "material": "سرامیک",
        "dimensions": "۴۵ × ۳۰ سانتی‌متر",
        "span": LayoutSpan.NORMAL, "image": "ceramic", "featured": False,
        "excerpt": "ترک، امضای کوره است.",
        "concept": "شکست لعاب را نقص نمی‌دانم؛ گفت‌وگوی آتش و خاک است.",
        "availability": Availability.AVAILABLE,
    },
    {
        "slug": "night-turn", "title": "پیچ شب",
        "title_en": "Night Turn", "category": "sculpture",
        "collection": "silence", "year": "۱۴۰۰",
        "technique": "برنز ریخته‌گری‌شده", "material": "برنز",
        "dimensions": "۸۰ × ۱۲۰ × ۵۰ سانتی‌متر",
        "span": LayoutSpan.WIDE, "image": "bronzeNight", "featured": True,
        "excerpt": "چرخشی که فقط در تاریکی دیده می‌شود.",
        "concept": "فرم در شب کامل می‌شود؛ نور روز جزئیات را از آن م����‌گیرد.",
        "availability": Availability.SOLD,
    },
    {
        "slug": "studio-at-five", "title": "کارگاه، ساعت پنج",
        "title_en": "Studio at Five", "category": "painting",
        "collection": "memory-of-soil", "year": "۱۴۰۲",
        "technique": "آکریلیک روی بوم", "material": "آکریلیک، بوم",
        "dimensions": "۱۵۰ × ۱۰۰ سانتی‌متر",
        "span": LayoutSpan.WIDE, "image": "studio", "featured": False,
        "excerpt": "نور مایل، گردوغبار، بوی تُرپانتین.",
        "concept": "ثبت همان ساعتی از روز که کار به خودی خود پیش می‌رود.",
        "availability": Availability.COMMISSION,
    },
]

NAVIGATION = [
    ("نمونه‌کارها", "Works", "/artworks"),
    ("مجموعه‌ها", "Collections", "/collections"),
    ("نمایشگاه‌ها", "Exhibitions", "/exhibitions"),
    ("درباره من", "About", "/about"),
    ("رزومه", "CV", "/resume"),
    ("تماس", "Contact", "/contact"),
]

SOCIALS = [
    ("instagram", "اینستاگرام", "https://instagram.com/"),
    ("behance", "بی‌هنس", "https://behance.net/"),
    ("pinterest", "پینترست", "https://pinterest.com/"),
]

STATS = [
    ("۱۴", "+", "سال کار حرفه‌ای"),
    ("۲۱", "", "نمایشگاه گروهی و انفرادی"),
    ("۱۸۰", "+", "اثر خلق‌شده"),
    ("۹", "", "مجموعه‌ی خصوصی"),
]

MEDIUMS = [
    ("رنگ روغن", "Oil"),
    ("آکریلیک", "Acrylic"),
    ("مرمر", "Marble"),
    ("برنز", "Bronze"),
    ("سرامیک", "Ceramic"),
    ("گچ و مواد ترکیبی", "Plaster & mixed media"),
    ("طراحی با زغال", "Charcoal drawing"),
]

EXHIBITIONS = [
    ("نمایشگاه انفرادی «خاطره‌ی خاک»", "solo", "۱۴۰۳", "گالری نمونه", "تهران", "ایران"),
    ("نمایشگاه گروهی هنر معاصر", "group", "۱۴۰۲", "موزه‌ی هنرهای معاصر", "اصفهان", "ایران"),
    ("آرت‌فر بین‌المللی", "fair", "۱۴۰۱", "آرت‌فر دبی", "دبی", "امارات"),
    ("نمایشگاه دونفره «فرم و سکوت»", "duo", "۱۳۹۹", "گالری نمونه", "شیراز", "ایران"),
    ("نمایشگاه گروهی جوان", "group", "۱۳۹۷", "خانه‌ی هنرمندان ایران", "تهران", "ایران"),
]

# Real dates, covers and curators for the exhibitions above. Without dates the
# computed `state` of every exhibition collapses to "past", and without a cover
# the landing-page poster renders as an empty box -- both made the section look
# broken. Keyed by title so the tuples above stay usable by the CV seeder.
EXHIBITION_EXTRA = {
    "نمایشگاه انفرادی «خاطره‌ی خاک»": {
        "title_en": "Memory of Soil (Solo)",
        "start": "2024-10-04",
        "end": "2024-10-25",
        "curator": "کوراتور مهمان",
        "cover": "paintingAbstract",
    },
    "نمایشگاه گروهی هنر معاصر": {
        "title_en": "Contemporary Group Show",
        "start": "2023-05-12",
        "end": "2023-06-02",
        "curator": "تیم کوراتوری موزه",
        "cover": "sculptureMarble",
    },
    "آرت‌فر بین‌المللی": {
        "title_en": "International Art Fair",
        "start": "2022-11-16",
        "end": "2022-11-20",
        "curator": "",
        "cover": "bronzeNight",
    },
    "نمایشگاه دونفره «فرم و سکوت»": {
        "title_en": "Form and Silence (Duo)",
        "start": "2020-09-11",
        "end": "2020-09-30",
        "curator": "کوراتور گالری",
        "cover": "ceramic",
    },
    "نمایشگاه گروهی جوان": {
        "title_en": "Young Artists Group Show",
        "start": "2018-07-06",
        "end": "2018-07-19",
        "curator": "",
        "cover": "studio",
    },
}

AWARDS = [
    ("۱۴۰۳", "جایزه‌ی بخش مجسمه", "دوسالانه‌ی هنرهای تجسمی"),
    ("۱۴۰۱", "اقامت هنری سه‌ماهه", "مرکز هنری، ایتالیا"),
    ("۱۳۹۸", "تقدیر هیئت داوران", "جشنواره‌ی هنر معاصر"),
]

EDUCATION = [
    ("۱۳۹۶", "کارشناسی ارشد نقاشی", "دانشگاه هنر", "تهران"),
    ("۱۳۹۳", "کارشناسی مجسمه‌سازی", "دانشگاه هنر", "تهران"),
]

TIMELINE = [
    ("۱۳۹۳", "شروع مجسمه‌سازی", "اولین کارهای گچی و تجربه‌ی فرم در فضای دانشگاه."),
    ("۱۳۹۶", "ارشد نقاشی", "چرخش از حجم به سطح؛ آغاز کار جدی با رنگ روغن."),
    ("۱۴۰۰", "کارگاه شخصی", "راه‌اندازی کارگاه مستقل و تمرکز روی مجموعه‌ی خاک."),
    ("۱۴۰۳", "نمایشگاه انفرادی", "ارائه‌ی مجموعه‌ی «خاطره‌ی خاک» در گالری نمونه."),
]

TESTIMONIALS = [
    ("سطح‌ها در کار او مثل پوستِ زمین‌اند؛ چیزی زیرشان نفس می‌کشد.",
     "منتقد هنری", "مجله‌ی هنر معاصر"),
    ("مجسمه‌هایش سکوت را به فرم تبدیل می‌کنند.",
     "کیوراتور مستقل", "کاتالوگ نمایشگاه ۱۴۰۲"),
    ("همکاری حرفه‌ای، دقیق و کامل سر وقت.",
     "مجموعه‌دار خصوصی", "سفارش اثر اختصاصی"),
]

SERVICES = [
    ("سفارش اثر اختصاصی", "خلق اثر بر اساس فضا، ابعاد و مفهوم مورد نظر شما.", "✎"),
    ("فروش آثار موجود", "خرید آثار موجود در کارگاه همراه با گواهی اصالت.", "◈"),
    ("کارگاه و آموزش", "کلاس‌های حجم و نقاشی به‌صورت خصوصی و گروهی.", "◉"),
]

HOME_SECTIONS = [
    (SectionType.HERO, "", "", ""),
    (SectionType.STATS, "در یک نگاه", "مسیر کاری", ""),
    (SectionType.FEATURED_WORKS, "آثار شاخص", "انتخاب هنرمند",
     "گزیده‌ای از آثاری که مسیر کاری این سال‌ها را نشان می‌دهند."),
    (SectionType.COLLECTIONS, "مجموعه‌ها", "سه روایت موازی", ""),
    (SectionType.SPOTLIGHT, "", "", ""),
    (SectionType.ABOUT, "درباره", "دست‌ها، خاک، زمان", ""),
    (SectionType.EXHIBITIONS, "نمایشگاه‌ها", "حضورهای اخیر", ""),
    (SectionType.SERVICES, "همکاری", "چطور می‌توانیم کار کنیم", ""),
    (SectionType.TESTIMONIALS, "نقدها", "از نگاه دیگران", ""),
    (SectionType.CTA, "", "اثری در ذهن دارید؟",
     "برای سفارش اثر اختصاصی یا بازدید از کارگاه پیام بدهید."),
    (SectionType.CONTACT, "تماس", "گفت‌وگو را شروع کنیم", ""),
]


class Command(BaseCommand):
    help = "وارد کردن محتوا و قالب‌های نسخه‌ی قبلی سایت (idempotent)"

    def add_arguments(self, parser):
        parser.add_argument(
            "--skip-media",
            action="store_true",
            help="از وارد کردن تصاویر seed_assets صرف‌نظر کن",
        )

    # ------------------------------------------------------------------ #
    @transaction.atomic
    def handle(self, *args, **options):
        self.now = timezone.now()
        self.stdout.write(self.style.MIGRATE_HEADING("seeding legacy content"))

        self.seed_themes()
        self.seed_seasons()
        self.seed_theme_config()
        self.media = {} if options["skip_media"] else self.seed_media()
        self.seed_site()
        self.seed_navigation()
        self.seed_artist()
        self.seed_taxonomy()
        self.seed_artworks()
        self.seed_exhibitions()
        self.seed_cv()
        self.seed_pages()

        self.stdout.write(self.style.SUCCESS("\n✓ seeding finished"))

    # ------------------------------------------------------------------ #
    def seed_themes(self):
        for order, preset in enumerate(THEMES, start=1):
            theme, created = Theme.objects.update_or_create(
                key=preset["key"],
                defaults={
                    "name": preset["name"],
                    "name_en": preset["name_en"],
                    "note": preset["note"],
                    "is_builtin": True,
                    "is_active": True,
                    "order": order,
                    "swatch_1": preset["swatch"][0],
                    "swatch_2": preset["swatch"][1],
                    "swatch_3": preset["swatch"][2],
                    "font_display": preset["font_display"],
                    "font_body": FONT_BODY,
                    "display_weight": preset["display_weight"],
                    "display_track": preset["display_track"],
                    "eyebrow_track": preset["eyebrow_track"],
                    "radius": preset["radius"],
                    "radius_sm": preset["radius_sm"],
                    "border_width": preset["border_width"],
                    "motion_style": preset["motion_style"],
                    "button_style": preset["button_style"],
                    "card_style": preset["card_style"],
                    "cursor_style": preset["cursor_style"],
                    "gallery_layout": preset["gallery_layout"],
                    "animation_speed": preset["animation_speed"],
                    "parallax_intensity": preset["parallax_intensity"],
                    "easing": DEFAULT_EASING,
                },
            )
            for mode in (ThemeVariant.Mode.DAY, ThemeVariant.Mode.NIGHT):
                ThemeVariant.objects.update_or_create(
                    theme=theme,
                    mode=mode,
                    defaults=preset["day" if mode == ThemeVariant.Mode.DAY else "night"],
                )
            self._report("theme", theme.key, created)

    def seed_seasons(self):
        for order, preset in enumerate(SEASONS, start=1):
            data = dict(preset)
            key = data.pop("key")
            season, created = Season.objects.update_or_create(
                key=key, defaults={**data, "order": order, "is_active": True}
            )
            self._report("season", season.key, created)

    def seed_theme_config(self):
        config = ThemeConfig.load()
        if config.active_theme is None:
            config.active_theme = Theme.objects.filter(key="atelier").first()
        config.mode_strategy = ThemeConfig.ModeStrategy.AUTO
        config.season_strategy = ThemeConfig.SeasonStrategy.AUTO
        # Visitors never pick a theme, font or palette: the design owns that.
        config.allow_visitor_override = False
        config.save()
        self.stdout.write(f"  theme config -> {config.active_theme}")

    # ------------------------------------------------------------------ #
    def seed_media(self) -> dict[str, MediaAsset]:
        folder, _created = MediaFolder.objects.get_or_create(name="آثار (وارد‌شده)")
        assets: dict[str, MediaAsset] = {}

        if not SEED_ASSETS.exists():
            self.stdout.write(
                self.style.WARNING(f"  ! seed_assets not found at {SEED_ASSETS}")
            )
            return assets

        for name, alt in IMAGES.items():
            path = SEED_ASSETS / f"{name}.webp"
            if not path.exists():
                self.stdout.write(self.style.WARNING(f"  ! missing {path.name}"))
                continue

            existing = MediaAsset.objects.filter(title=name).first()
            if existing:
                assets[name] = existing
                self._report("media", name, False)
                continue

            asset = MediaAsset(
                title=name,
                alt_text=alt,
                kind=MediaAsset.Kind.IMAGE,
                folder=folder,
                mime_type="image/webp",
            )
            with path.open("rb") as handle:
                asset.file.save(f"{name}.webp", File(handle), save=True)
            assets[name] = asset
            self._report("media", name, True)
        return assets

    def _asset(self, name: str):
        return self.media.get(name)

    # ------------------------------------------------------------------ #
    def seed_site(self):
        settings_obj = SiteSetting.load()
        settings_obj.site_name = settings_obj.site_name or "نام هنرمند"
        settings_obj.site_name_en = settings_obj.site_name_en or "ARTIST NAME"
        settings_obj.tagline = settings_obj.tagline or "نقاش و مجسمه‌ساز"
        settings_obj.description = (
            settings_obj.description
            or "پورتفولیوی آثار نقاشی و مجسمه‌سازی؛ مجموعه‌ها، نمایشگاه‌ها و رزومه‌ی هنری."
        )
        settings_obj.email = settings_obj.email or "hello@example.com"
        settings_obj.phone = settings_obj.phone or "۰۹۱۲ ۰۰۰ ۰۰۰۰"
        settings_obj.address = settings_obj.address or "تهران، ایران"
        settings_obj.studio_note = (
            settings_obj.studio_note or "استودیو: کارگاه شماره ۳، خیابان نمونه"
        )
        settings_obj.default_gallery_layout = GalleryLayout.EDITORIAL
        settings_obj.default_seo_title = (
            settings_obj.default_seo_title or "نام هنرمند — نقاش و مجسمه‌ساز"
        )
        settings_obj.default_seo_description = (
            settings_obj.default_seo_description or settings_obj.description
        )
        if not settings_obj.default_og_image_id:
            settings_obj.default_og_image = self._asset("paintingAbstract")
        settings_obj.save()
        self.stdout.write("  site settings -> ok")

    def seed_navigation(self):
        for order, (label, label_en, url) in enumerate(NAVIGATION, start=1):
            for location in (
                NavigationItem.Location.HEADER,
                NavigationItem.Location.MOBILE,
                NavigationItem.Location.FOOTER,
            ):
                NavigationItem.objects.update_or_create(
                    label=label,
                    location=location,
                    defaults={
                        "label_en": label_en,
                        "url": url,
                        "order": order,
                        "is_active": True,
                    },
                )
        for order, (platform, label, url) in enumerate(SOCIALS, start=1):
            SocialLink.objects.update_or_create(
                platform=platform,
                defaults={"label": label, "url": url, "order": order, "is_active": True},
            )
        self.stdout.write(
            f"  navigation -> {len(NAVIGATION)} items x 3 locations, "
            f"{len(SOCIALS)} socials"
        )

    # ------------------------------------------------------------------ #
    def seed_artist(self):
        artist = Artist.load()
        artist.name = artist.name if artist.name != "نام هنرمند" else "نام هنرمند"
        artist.name_latin = artist.name_latin or "ARTIST NAME"
        artist.role = artist.role or "نقاش و مجسمه‌ساز"
        artist.role_en = artist.role_en or "Painter & Sculptor"
        artist.city = artist.city or "تهران، ایران"

        artist.hero_line_1 = artist.hero_line_1 or "دست‌ها"
        artist.hero_line_2 = artist.hero_line_2 or "خاک را"
        artist.hero_line_3 = artist.hero_line_3 or "به یاد می‌آورند"
        artist.hero_caption = artist.hero_caption or (
            "نقاشی و مجسمه‌سازی با تمرکز بر حافظه‌ی متریال؛ خاک، سنگ، برنز و رنگ."
        )
        artist.hero_cta_label = artist.hero_cta_label or "دیدن آثار"
        artist.hero_cta_url = artist.hero_cta_url or "/artworks"

        artist.about_title = artist.about_title or "دست‌ها، خاک، زمان"
        artist.biography = artist.biography or (
            "کار من از حجم شروع شد و به سطح رسید. سال‌ها با گچ و سنگ کار کردم و بعد "
            "فهمیدم همان جست‌وجوی فرم را می‌توا��م روی بوم هم ادامه بدهم. امروز بین "
            "کارگاه مجسمه و سه‌پایه‌ی نقاشی رفت‌وآمد می‌کنم و هر دو را بخشی از یک "
            "پرسش می‌دانم: متریال چه چیزی را به یاد می‌آورد؟"
        )
        artist.statement = artist.statement or (
            "آثارم دربا��ه‌ی حافظه‌ی مواد است؛ درباره‌ی این‌که خاک، سنگ و رنگ چه چیزی "
            "از زمان را در خود نگه می‌دارند."
        )
        artist.philosophy = artist.philosophy or (
            "اثر باید در سکوت خوانده شود. اگر برای توضیح دادنش به کلمات زیادی نیاز "
            "باشد، هنوز تمام نشده است."
        )
        artist.spotlight_quote = artist.spotlight_quote or (
            "هیچ اثری تمام نمی‌شود؛ فقط لحظه‌ای می‌رسد که باید دست کشید."
        )
        artist.spotlight_meta = artist.spotlight_meta or (
            "از یادداشت‌های کارگاه، زمستان ۱۴۰۲"
        )

        artist.email = artist.email or "hello@example.com"
        artist.phone = artist.phone or "۰۹۱۲ ۰۰۰ ۰۰۰۰"
        artist.studio_address = artist.studio_address or (
            "استودیو: کارگاه شماره ۳، خیابان نمونه"
        )
        if not artist.portrait_id:
            artist.portrait = self._asset("portrait")
        if not artist.studio_image_id:
            artist.studio_image = self._asset("studio")
        artist.save()

        for order, (value, suffix, label) in enumerate(STATS, start=1):
            Stat.objects.update_or_create(
                label=label,
                defaults={"value": value, "suffix": suffix, "order": order},
            )
        for order, (label, label_en) in enumerate(MEDIUMS, start=1):
            Medium.objects.update_or_create(
                label=label, defaults={"label_en": label_en, "order": order}
            )
        for order, (text, author, source) in enumerate(TESTIMONIALS, start=1):
            Testimonial.objects.update_or_create(
                author=author,
                defaults={"text": text, "source": source, "order": order},
            )
        for order, (title, description, icon) in enumerate(SERVICES, start=1):
            Service.objects.update_or_create(
                title=title,
                defaults={
                    "description": description,
                    "icon": icon,
                    "order": order,
                    "cta_label": "گفت‌وگو",
                    "cta_url": "/contact",
                },
            )
        for order, (year, title, body) in enumerate(TIMELINE, start=1):
            TimelineEntry.objects.update_or_create(
                title=title, defaults={"year": year, "body": body, "order": order}
            )
        self.stdout.write("  artist profile, stats, mediums, services -> ok")

    # ------------------------------------------------------------------ #
    def seed_taxonomy(self):
        for order, (key, label, label_en) in enumerate(CATEGORIES, start=1):
            Category.objects.update_or_create(
                key=key,
                defaults={"label": label, "label_en": label_en, "order": order},
            )

        for order, (slug, title, title_en, description, year, cover) in enumerate(
            COLLECTIONS, start=1
        ):
            Collection.objects.update_or_create(
                slug=slug,
                defaults={
                    "title": title,
                    "title_en": title_en,
                    "description": description,
                    "year": year,
                    "cover": self._asset(cover),
                    "status": PublishStatus.PUBLISHED,
                    "published_at": self.now,
                    "is_featured": order <= 2,
                    "order": order,
                },
            )
        self.stdout.write(
            f"  taxonomy -> {len(CATEGORIES)} categories, {len(COLLECTIONS)} collections"
        )

    def seed_artworks(self):
        categories = {item.key: item for item in Category.objects.all()}
        collections = {item.slug: item for item in Collection.objects.all()}

        for order, data in enumerate(ARTWORKS, start=1):
            asset = self._asset(data["image"])
            artwork, created = Artwork.objects.update_or_create(
                slug=data["slug"],
                defaults={
                    "title": data["title"],
                    "title_en": data["title_en"],
                    "category": categories.get(data["category"]),
                    "collection": collections.get(data["collection"]),
                    "year": data["year"],
                    "technique": data["technique"],
                    "material": data["material"],
                    "medium": data["technique"],
                    "dimensions": data["dimensions"],
                    "excerpt": data["excerpt"],
                    "description": data["concept"],
                    "concept": data["concept"],
                    "availability": data["availability"],
                    "layout_span": data["span"],
                    "hero_image": asset,
                    "is_featured": data["featured"],
                    "status": PublishStatus.PUBLISHED,
                    "published_at": self.now,
                    "order": order,
                },
            )
            if asset is not None:
                ArtworkImage.objects.update_or_create(
                    artwork=artwork,
                    image=asset,
                    defaults={
                        "role": ArtworkImage.Role.MAIN,
                        "is_cover": True,
                        "order": 1,
                    },
                )
            self._report("artwork", artwork.slug, created)

        # a few related-work links so the detail page has real content
        by_slug = {item.slug: item for item in Artwork.objects.all()}
        pairs = [
            ("stone-and-bronze", ["night-turn", "half-lit-face"]),
            ("memory-of-soil-1", ["cracked-glaze", "studio-at-five"]),
            ("night-turn", ["stone-and-bronze", "half-lit-face"]),
        ]
        for slug, related in pairs:
            source = by_slug.get(slug)
            if source is None:
                continue
            source.related_artworks.set(
                [by_slug[item] for item in related if item in by_slug]
            )

    def seed_exhibitions(self):
        for order, (title, kind, year, venue, city, country) in enumerate(
            EXHIBITIONS, start=1
        ):
            extra = EXHIBITION_EXTRA.get(title, {})
            Exhibition.objects.update_or_create(
                title=title,
                defaults={
                    "title_en": extra.get("title_en", ""),
                    "kind": kind,
                    "year_label": year,
                    "venue": venue,
                    "city": city,
                    "country": country,
                    "start_date": extra.get("start") or None,
                    "end_date": extra.get("end") or None,
                    "curator": extra.get("curator", ""),
                    "cover": self._asset(extra.get("cover", "")),
                    "description": f"{title} — {venue}، {city}.",
                    "status": PublishStatus.PUBLISHED,
                    "published_at": self.now,
                    "is_featured": order == 1,
                    "order": order,
                },
            )
        self.stdout.write(f"  exhibitions -> {len(EXHIBITIONS)}")

    def seed_cv(self):
        for order, (year, title, issuer) in enumerate(AWARDS, start=1):
            Award.objects.update_or_create(
                title=title, defaults={"year": year, "issuer": issuer, "order": order}
            )
            CVEntry.objects.update_or_create(
                section=CVSection.AWARDS,
                title=title,
                defaults={"year": year, "place": issuer, "order": order},
            )

        for order, (year, degree, institution, city) in enumerate(EDUCATION, start=1):
            Education.objects.update_or_create(
                degree=degree,
                defaults={
                    "year": year,
                    "institution": institution,
                    "city": city,
                    "order": order,
                },
            )
            CVEntry.objects.update_or_create(
                section=CVSection.EDUCATION,
                title=degree,
                defaults={"year": year, "place": f"{institution}، {city}", "order": order},
            )

        for order, (title, kind, year, venue, city, country) in enumerate(
            EXHIBITIONS, start=1
        ):
            CVEntry.objects.update_or_create(
                section=CVSection.EXHIBITIONS,
                title=title,
                defaults={
                    "year": year,
                    "place": f"{venue}، {city}، {country}",
                    "order": order,
                },
            )

        Publication.objects.update_or_create(
            title="گفت‌وگو درباره‌ی حافظه‌ی متریال",
            defaults={
                "year": "۱۴۰۲",
                "publisher": "مجله‌ی هنر معاصر",
                "author": "منتقد هنری",
                "order": 1,
            },
        )
        CVEntry.objects.update_or_create(
            section=CVSection.PUBLICATIONS,
            title="گفت‌وگو درباره‌ی حافظه‌ی متریال",
            defaults={"year": "۱۴۰۲", "place": "مجله‌ی هنر معاصر", "order": 1},
        )
        self.stdout.write("  cv (awards, education, exhibitions, publications) -> ok")

    # ------------------------------------------------------------------ #
    def seed_pages(self):
        home, _created = Page.objects.update_or_create(
            slug="home",
            defaults={
                "title": "صفحه‌ی اصلی",
                "title_en": "Home",
                "kind": Page.Kind.HOME,
                "is_locked": True,
                "status": PublishStatus.PUBLISHED,
                "published_at": self.now,
            },
        )

        for order, (section_type, eyebrow, heading, body) in enumerate(
            HOME_SECTIONS, start=1
        ):
            settings_payload: dict = {}
            if section_type == SectionType.HERO:
                settings_payload = {
                    "show_scroll_hint": True,
                    "parallax": True,
                    "overlay_opacity": 0.28,
                }
            elif section_type == SectionType.FEATURED_WORKS:
                settings_payload = {
                    "limit": 6,
                    "layout": GalleryLayout.EDITORIAL,
                    "show_filters": True,
                }
            elif section_type == SectionType.COLLECTIONS:
                settings_payload = {"limit": 3, "layout": GalleryLayout.LARGE_CARDS}
            elif section_type == SectionType.SPOTLIGHT:
                settings_payload = {"align": "center", "parallax": True}
            elif section_type == SectionType.ABOUT:
                settings_payload = {"show_mediums": True, "image_side": "start"}
            elif section_type == SectionType.EXHIBITIONS:
                settings_payload = {"limit": 4, "state": ""}
            elif section_type == SectionType.STATS:
                settings_payload = {"columns": 4}
            elif section_type == SectionType.SERVICES:
                settings_payload = {"columns": 3}
            elif section_type == SectionType.TESTIMONIALS:
                settings_payload = {"limit": 3, "autoplay": True}
            elif section_type == SectionType.CTA:
                settings_payload = {
                    "button_label": "تماس با من",
                    "button_url": "/contact",
                    "style": "accent",
                }
            elif section_type == SectionType.CONTACT:
                settings_payload = {"show_form": True, "show_map": False}

            image = None
            if section_type == SectionType.HERO:
                image = self._asset("paintingAbstract")
            elif section_type == SectionType.SPOTLIGHT:
                image = self._asset("bronzeNight")
            elif section_type == SectionType.ABOUT:
                image = self._asset("studio")

            PageSection.objects.update_or_create(
                page=home,
                section_type=section_type,
                defaults={
                    "eyebrow": eyebrow,
                    "heading": heading,
                    "body": body,
                    "image": image,
                    "settings": settings_payload,
                    "is_enabled": True,
                    "order": order,
                },
            )

        for slug, title, title_en in (
            ("about", "درباره من", "About"),
            ("resume", "رزومه هنری", "CV"),
            ("contact", "تماس", "Contact"),
        ):
            Page.objects.update_or_create(
                slug=slug,
                defaults={
                    "title": title,
                    "title_en": title_en,
                    "kind": Page.Kind.STANDARD,
                    "is_locked": True,
                    "status": PublishStatus.PUBLISHED,
                    "published_at": self.now,
                },
            )
        self.stdout.write(f"  pages -> home ({len(HOME_SECTIONS)} sections) + 3 pages")

    # ------------------------------------------------------------------ #
    def _report(self, kind: str, name: str, created: bool):
        verb = "created" if created else "updated"
        self.stdout.write(f"  {kind:<8} {verb:<8} {name}")
