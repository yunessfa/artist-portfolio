# پورتفولیوی هنرمند — Artist Portfolio CMS

یک **CMS واقعی و آماده‌ی Production** برای وب‌سایت شخصی یک نقاش و مجسمه‌ساز.
نسخه‌ی قبلی یک فایل HTML تک‌فایله (۶۰۵ کیلوبایت، تصاویر base64، داده‌های hardcode شده در JS) بود؛
این نسخه همان تجربه‌ی بصری را حفظ کرده اما روی یک معماری واقعی نشسته است:
**Django REST Framework + PostgreSQL + React/Vite + Docker + Nginx**.

> هرچه در سایت دیده می‌شود — آثار، مجموعه‌ها، نمایشگاه‌ها، رزومه، منوها، بخش‌های صفحه‌ی اصلی،
> قالب‌ها و حتی فصل‌ها — از دیتابیس می‌آید و از پنل مدیریت قابل ویرایش است.

---

## فهرست

1. [معرفی و امکانات](#۱-معرفی-و-امکانات)
2. [Stack فنی](#۲-stack-فنی)
3. [ساختار پروژه](#۳-ساختار-پروژه)
4. [پیش‌نیازها](#۴-پیشنیازها)
5. [اجرای محلی (بدون Docker)](#۵-اجرای-محلی-بدون-docker)
6. [اجرا با Docker](#۶-اجرا-با-docker)
7. [متغیرهای محیطی](#۷-متغیرهای-محیطی)
8. [مدل داده](#۸-مدل-داده)
9. [مستندات API](#۹-مستندات-api)
10. [سیستم قالب (Theme Engine)](#۱۰-سیستم-قالب-theme-engine)
11. [پنل مدیریت](#۱۱-پنل-مدیریت)
12. [Deploy روی VPS](#۱۲-deploy-روی-vps)
13. [پشتیبان‌گیری و بازیابی](#۱۳-پشتیبانگیری-و-بازیابی)
14. [به‌روزرسانی و Rollback](#۱۴-بهروزرسانی-و-rollback)
15. [عیب‌یابی](#۱۵-عیبیابی)

---

## ۱. معرفی و امکانات

### آثار هنری
- فیلدهای کامل: عنوان فارسی/انگلیسی، دسته‌بندی، مجموعه، سال، تکنیک، متریال، ابعاد، وضعیت اثر،
  قیمت (با کلید نمایش/عدم نمایش)، توضیح کوتاه، توضیح کامل، داستان/Concept، یادداشت هنرمند.
- چند تصویر با نقش مشخص (`main` / `detail` / `context` / `process`)، Alt Text مستقل، تصویر کاور.
- آثار مرتبط (دستی + تکمیل خودکار از همان مجموعه/دسته)، Previous/Next بر اساس ترتیب دلخواه هنرمند.
- مشخصات اختصاصی مجسمه: متریال، ارتفاع/عرض/عمق، وزن، ادیشن، ریخته‌گری، پاتینا، محل نگهداری، مناسب فضای باز.
- Draft / Publish / Unpublish / Feature / Duplicate واقعی (کپی شامل تصاویر و مشخصات مجسمه).
- SEO مستقل برای هر اثر + Structured Data استاندارد `schema.org/VisualArtwork`.

### مجموعه‌ها، نمایشگاه‌ها، رزومه
- مجموعه با کاور، متن هنرمند، سال، ترتیب و Featured.
- نمایشگاه با نوع (انفرادی/دونفره/گروهی/آرت‌فر/اقامت/دوسالانه)، تاریخ، محل، شهر، کشور، کیوراتور، گالری تصاویر.
  وضعیت **پیش‌رو / در جریان / گذشته** از تاریخ محاسبه می‌شود، پس هرگز کهنه نمی‌شود.
- رزومه‌ی کاملاً داینامیک: هنرمند می‌تواند هر ردیفی را در هر بخشی (نمایشگاه، تحصیلات، جوایز، تجربه،
  همکاری، انتشارات، مجموعه‌های میزبان) اضافه/حذف/مرتب کند.

### کتابخانه‌ی رسانه
- آپلود واقعی روی دیسک (پایان base64 در HTML)، Drag & Drop و آپلود چندتایی.
- تولید خودکار نسخه‌های **WebP + AVIF** در عرض‌های ۴۰۰/۸۰۰/۱۲۸۰/۱۹۲۰ و `srcset` آماده.
- استخراج ابعاد، رنگ غالب و **LQIP** (پلیس‌هولدر بلور، برای جلوگیری از Layout Shift).
- اعتبارسنجی حجم، پسوند و **MIME واقعی از magic bytes** (نه فقط هدر مرورگر).
- پوشه‌بندی، جستجو، شمارش استفاده و اندپوینت «فایل‌های بی‌استفاده».

### Page Builder
صفحه‌ی اصلی مجموعه‌ای از بخش‌های مرتب و قابل خاموش/روشن کردن است (نه JSX هاردکد):
`hero, stats, featured_works, gallery, collections, spotlight, about, timeline, exhibitions,
services, testimonials, quote, cta, contact, rich_text, image_band`.
هر نوع بخش schema کوچک خودش را اعلام می‌کند تا پنل مدیریت فرمش را بدون Deploy جدید بسازد.

### سایر
- فرم تماس با Backend واقعی، Rate Limiting، Honeypot، هش شدن IP و ایمیل اطلاع‌رسانی.
- آمار بازدید داخلی (بدون سرویس بیرونی) برای داشبورد.
- `robots.txt` و `sitemap.xml` داینامیک با `lastmod` واقعی.
- ساختار آماده‌ی دو زبانه (فارسی/انگلیسی) و مدیریت درست RTL/LTR.

---

## ۲. Stack فنی

| لایه | انتخاب | دلیل |
|---|---|---|
| Backend | Django 5 + DRF | Admin آماده، ORM قوی، مایگریشن مطمئن، اکوسیستم امنیتی بالغ |
| Database | PostgreSQL 16 | JSONB برای تنظیمات بخش‌ها و توکن‌های قالب، ایندکس‌های جدی |
| تصاویر | Pillow + pillow-avif-plugin | تولید WebP/AVIF در خود Backend |
| Frontend | React + Vite + TypeScript + Tailwind | Build سریع، Type Safety، کنترل کامل روی توکن‌های CSS |
| انیمیشن | Motion (ادامه‌ی همان کتابخانه‌ی نسخه‌ی قبل) + GSAP فقط جای لازم | حفظ حس نسخه‌ی فعلی |
| Smooth Scroll | Lenis | جانشین مدرن و سبک Locomotive Scroll نسخه‌ی قبل |
| Web server | Nginx | Reverse proxy، فایل استاتیک، کش، SSL |
| اجرا | Docker + Docker Compose | تکرارپذیری و همزیستی با پروژه‌های دیگر روی یک VPS |

**چرا Vite جای Next.js؟** سایت یک SPA گالری‌محور با محتوای مدیریت‌شده از API است و SEO آن با
متاتگ‌های سروری + `sitemap.xml` + Structured Data پوشش داده می‌شود؛ افزودن SSR در این مرحله
پیچیدگی عملیاتی (Node در Production) را بدون سود واقعی اضافه می‌کرد.

---

## ۳. ساختار پروژه

```
artist-portfolio/
├── backend/
│   ├── config/
│   │   ├── settings/{base,dev,prod}.py   # تنظیمات لایه‌ای
│   │   ├── urls.py                       # django-admin, api, healthz, robots, sitemap
│   │   └── api_urls.py                   # روتر DRF (۲۵ مسیر) + اندپوینت‌های ویژه
│   ├── apps/
│   │   ├── core/          # مدل‌های پایه، تنظیمات سایت، منو، شبکه‌های اجتماعی، bootstrap
│   │   ├── media_library/ # MediaAsset/Variant/Folder + تولید WebP/AVIF + اعتبارسنجی
│   │   ├── theming/       # Theme, ThemeVariant, Season, ThemeConfig (Theme Engine)
│   │   ├── artworks/      # Category, Collection, Artwork, ArtworkImage, SculptureDetail
│   │   ├── artist/        # Artist, Medium, Stat, Education, Award, Timeline, CVEntry ...
│   │   ├── exhibitions/   # Exhibition, ExhibitionImage
│   │   ├── pagebuilder/   # Page, PageSection, SECTION_SCHEMA
│   │   ├── contact/       # ContactMessage + throttling + honeypot
│   │   └── insights/      # PageView + آمار داشبورد
│   ├── seed_assets/       # ۶ تصویر استخراج‌شده از نسخه‌ی قبلی
│   ├── Dockerfile         # multi-stage، کاربر غیر root، HEALTHCHECK
│   ├── entrypoint.sh      # wait-for-db → migrate → collectstatic → superuser → seed
│   └── requirements.txt
├── frontend/              # React + Vite (سایت عمومی و پنل مدیریت)
├── nginx/                 # dev.conf, prod.conf, snippets, certs
├── ops/                   # backup.sh, restore.sh, deploy.sh, rollback.sh, init-ssl.sh
├── docs/                  # LEGACY-ANALYSIS.md و مستندات معماری
├── docker-compose.yml     # توسعه
├── docker-compose.prod.yml# Production (دو حالت: standalone / behind-proxy)
├── Makefile               # make help
├── .env.example
└── README.md
```

---

## ۴. پیش‌نیازها

- **با Docker (پیشنهادی):** Docker Engine 24+ و Docker Compose v2.
- **بدون Docker:** Python 3.12+، PostgreSQL 16، Node.js 20+، و کتابخانه‌های سیستمی
  `libpq`, `libmagic`, `libjpeg`, `libwebp`.

---

## ۵. اجرای محلی (بدون Docker)

```bash
# ۱) کد و تنظیمات
git clone <repo-url> artist-portfolio && cd artist-portfolio
cp .env.example .env          # مقادیر را ویرایش کنید (حداقل SECRET_KEY و رمز دیتابیس)

# ۲) دیتابیس
createdb artistportfolio      # یا از psql: CREATE DATABASE artistportfolio;

# ۳) Backend
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
export DJANGO_SETTINGS_MODULE=config.settings.dev
python manage.py migrate
python manage.py seed_legacy          # وارد کردن محتوا و قالب‌های نسخه‌ی قبلی
python manage.py createsuperuser
python manage.py runserver 0.0.0.0:8000

# ۴) Frontend (ترمینال دوم)
cd frontend
npm install
npm run dev                            # http://localhost:5173
```

- سایت: `http://localhost:5173`
- API: `http://localhost:8000/api/v1/`
- ادمین جنگو: `http://localhost:8000/django-admin/`

---

## ۶. اجرا با Docker

```bash
cp .env.example .env      # POSTGRES_PASSWORD و DJANGO_SECRET_KEY را حتماً تغییر دهید
make up                   # معادل: docker compose up -d --build
make logs                 # مشاهده‌ی لاگ‌ها
```

سپس سایت روی `http://localhost:8080` بالا می‌آید (تنها پورتی که منتشر می‌شود).

### دستورهای پرکاربرد

```bash
make help              # فهرست همه‌ی دستورها
make up / down / restart
make logs              # لاگ همه‌ی سرویس‌ها
make ps                # وضعیت کانتینرها
make shell             # bash داخل کانتینر backend
make dbshell           # psql داخل کانتینر postgres
make migrate
make makemigrations
make superuser         # ساخت کاربر مدیر
make seed              # وارد کردن محتوای نسخه‌ی قبلی (idempotent)
make collectstatic
make test
make build             # ساخت مجدد ایمیج‌ها
make backup            # پشتیبان دیتابیس + مدیا
make deploy            # زنجیره‌ی کامل Deploy
make clean             # پاک کردن کش‌ها (به Volume دست نمی‌زند)
```

### داده‌ی پایدار

| Volume | محتوا |
|---|---|
| `postgres_data` | دیتابیس PostgreSQL |
| `media_data` | فایل‌های آپلودشده و نسخه‌های WebP/AVIF |
| `static_data` | فایل‌های استاتیک جنگو |
| `frontend_dist` | خروجی Build فرانت (فقط Production) |

همه **Named Volume** هستند، پس `docker compose down` داده را از بین نمی‌برد.
فقط `docker compose down -v` آن‌ها را حذف می‌کند — این دستور را در Production اجرا نکنید.

---

## ۷. متغیرهای محیطی

همه‌ی مقادیر حساس از `.env` خوانده می‌شوند و `.env` در `.gitignore` است.
نمونه‌ی کامل و توضیح‌دار در `.env.example` قرار دارد. مهم‌ترین‌ها:

| کلید | توضیح |
|---|---|
| `DJANGO_SECRET_KEY` | **الزامی**. یک رشته‌ی تصادفی طولانی |
| `DJANGO_DEBUG` | در Production باید `0` باشد |
| `DJANGO_ALLOWED_HOSTS` | دامنه‌های مجاز، با کاما |
| `POSTGRES_*` | نام، کاربر، رمز، هاست و پورت دیتابیس |
| `MAX_UPLOAD_SIZE_MB` | سقف حجم آپلود (پیش‌فرض ۲۵) |
| `THROTTLE_CONTACT_PER_HOUR` | سقف ارسال فرم تماس برای هر IP |
| `DJANGO_SUPERUSER_*` | ساخت خودکار کاربر مدیر در اولین اجرا |
| `SEED_ON_START` | اگر `1` باشد، در اولین بالا آمدن محتوای نسخه‌ی قبلی وارد می‌شود |
| `EDGE_NETWORK` | نام شبکه‌ی مشترک Docker برای Reverse Proxy مرکزی |
| `PUBLIC_DOMAIN` | دامنه‌ی سایت (برای Nginx و SSL) |
| `HOST_HTTP_PORT` | پورت میزبان؛ اگر پورت ۸۰ اشغال است تغییرش دهید |

تولید یک کلید امن:

```bash
python3 -c "import secrets; print(secrets.token_urlsafe(64))"
```

---

## ۸. مدل داده

```
SiteSetting (singleton)      تنظیمات کلی، SEO پیش‌فرض، حالت تعمیر
NavigationItem               منوی header / mobile / footer با ترتیب و والد
SocialLink                   شبکه‌های اجتماعی

MediaFolder ─┬─ MediaAsset ──── MediaVariant   (WebP/AVIF در چند عرض)

Theme ──── ThemeVariant (day | night)          ۱۰ توکن رنگ برای هر حالت
Season                                          ۴ فصل با بازه‌ی MMDD
ThemeConfig (singleton)                         قالب فعال + استراتژی + overrides

Artist (singleton)  Medium  Stat  Education  Award  Publication
TimelineEntry  Testimonial  Service  CVEntry

Category ─┐
Collection ┼─ Artwork ─┬─ ArtworkImage ── MediaAsset
           │           └─ SculptureDetail (1:1)
           └─ Artwork.related_artworks (M2M به خودش)

Exhibition ── ExhibitionImage        وضعیت زمانی محاسبه‌شده
Exhibition.artworks (M2M)

Page ── PageSection                  Page Builder
ContactMessage                       پیام‌های فرم تماس
PageView                             آمار بازدید داخلی
```

مدل‌های انتزاعی مشترک در `apps/core/models.py`:
`TimeStampedModel`, `OrderedModel`, `PublishableModel`, `SEOModel`, `SluggedModel`, `SingletonModel`.
به همین دلیل ترتیب، انتشار، SEO و Slug در همه‌ی موجودیت‌ها یکسان رفتار می‌کنند.

---

## ۹. مستندات API

پیشوند همه: `/api/v1/`

### عمومی (خواندنی)

| مسیر | توضیح |
|---|---|
| `GET bootstrap/` | **یک درخواست برای اولین رندر**: تنظیمات، هنرمند، قالب resolve‌شده، قالب‌ها، فصل‌ها، منو، شبکه‌های اجتماعی، دسته‌ها، آمارها، آثار شاخص و درخت بخش‌های صفحه‌ی اصلی |
| `GET theme/active/` | قالب فعال با همه‌ی توکن‌های CSS |
| `GET artworks/` | فهرست آثار؛ فیلتر: `category`, `collection`, `availability`, `is_featured`؛ `search`, `ordering` |
| `GET artworks/{slug}/` | جزئیات اثر + تصاویر + آثار مرتبط + قبلی/بعدی + SEO + Structured Data |
| `GET artworks/featured/` | آثار شاخص |
| `GET collections/` , `collections/{slug}/` | مجموعه‌ها |
| `GET exhibitions/?state=upcoming\|current\|past` | نمایشگاه‌ها |
| `GET about/` | یک درخواست برای کل صفحه‌ی «درباره» |
| `GET cv-entries/?grouped=1` | رزومه، گروه‌بندی‌شده بر اساس بخش |
| `GET pages/{slug}/` | صفحه با بخش‌های فعالش |
| `POST contact-messages/` | ارسال فرم تماس (محدودشده با Rate Limit) |

### احراز هویت

| مسیر | توضیح |
|---|---|
| `POST auth/token/` | گرفتن JWT (`username`, `password`) — دارای Throttle |
| `POST auth/token/refresh/` | تازه‌سازی توکن |
| `GET auth/me/` | کاربر جاری |
| `POST auth/logout/` | باطل کردن Refresh Token |
| `POST auth/password/` | تغییر رمز |

### مدیریتی (نیازمند کاربر staff)

- CRUD کامل روی: `artworks`, `artwork-images`, `categories`, `collections`, `artists`,
  `education`, `awards`, `publications`, `timeline`, `cv-entries`, `mediums`, `stats`,
  `testimonials`, `services`, `exhibitions`, `exhibition-images`, `pages`, `page-sections`,
  `themes`, `seasons`, `media`, `media-folders`, `navigation`, `social-links`, `contact-messages`.
- اکشن‌های مشترک:
  - `POST {resource}/reorder/` — ذخیره‌ی ترتیب Drag & Drop (`{"ids": [...]}`) در یک کوئری
  - `POST {resource}/{id}/publish/` و `/unpublish/`
  - `POST {resource}/{id}/duplicate/`
  - `POST {resource}/{id}/toggle-feature/`
- ویژه:
  - `POST themes/{key}/activate/` — فعال کردن قالب و **ذخیره در دیتابیس**
  - `GET themes/{key}/preview/?mode=night&season=winter` — پیش‌نمایش بدون فعال‌سازی
  - `PATCH theme/active/` — Theme Customizer (استراتژی‌ها و بازنویسی توکن‌ها)
  - `POST media/` — آپلود یک یا چند فایل
  - `POST media/{id}/regenerate/` — ساخت مجدد نسخه‌های تصویر
  - `GET media/unused/` — فایل‌های بی‌استفاده
  - `GET dashboard/stats/` — آمار واقعی داشبورد
  - `GET pages/section-catalog/` — کاتالوگ انواع بخش برای Page Builder

---

## ۱۰. سیستم قالب (Theme Engine)

نسخه‌ی قبلی یک سیستم سه‌بعدی داشت که در JS پیاده شده بود:
**۴ قالب × ۲ حالت (روز/شب) × ۴ فصل = ۳۲ ترکیب بصری**، که با نوشتن ۲۱ متغیر CSS اعمال می‌شد.
این سیستم **حفظ شده** اما به رکورد دیتابیس تبدیل شده است.

### چهار قالب موجود (دقیقاً از خود پروژه استخراج شده، نه حدس)

| کلید | نام | حس | رنگ‌های شاخص |
|---|---|---|---|
| `atelier` | آتلیه | خاکی، گرم، مجله‌ای | `#FBF8F4` · `#B4552F` · `#2A2521` |
| `noir` | گالری نوآر | مینیمال، برنجی، نمایشگاهی | `#0D0D0E` · `#D9B54A` · `#F7F7F5` |
| `pastel` | استودیو پاستل | نرم، لطیف، دلنشین | `#FBF7F6` · `#6F9A7B` · `#D98C9A` |
| `brutal` | بوم مدرن | پرکنتراست، گرافیکی، جسور | `#F1F0EA` · `#D6452B` · `#111111` |

هر قالب فقط رنگ نیست؛ شامل **فونت تیتر/متن، وزن و Tracking، شعاع گوشه، ضخامت خط، سایه،
فاصله‌ها، سبک دکمه، سبک کارت، سبک نشانگر، چیدمان گالری، سبک انیمیشن، سرعت انیمیشن و شدت پارالاکس** است.
مثلاً `brutal` سایه‌ی آفست ۶ پیکسلی و شعاع صفر دارد، در حالی که `pastel` شعاع ۲۲ پیکسل و انیمیشن آرام‌تر دارد.

### چهار فصل

| کلید | نام | نشانه | واژه | ذره |
|---|---|---|---|---|
| `spring` | بهار | ❀ | شکوفه | petal |
| `summer` | تابستان | ☀ | نور | mote |
| `autumn` | پاییز | ❦ | خاک | leaf |
| `winter` | زمستان | ❄ | سکوت | snow |

تشخیص خودکار فصل با همان منطق نسخه‌ی قبلی انجام می‌شود (`code = ماه×۱۰۰ + روز`،
بازه‌های ۳۲۰–۶۲۱–۹۲۳–۱۲۲۱) و تشخیص روز/شب هم با همان قاعده‌ی `۷ ≤ ساعت < ۱۹`.

### رفتار
- قالب فعال در `ThemeConfig` (دیتابیس) ذخیره می‌شود؛ پس **بعد از Refresh، Restart و Deploy باقی می‌ماند**.
- تغییر قالب **بدون Reload و بدون Flash** است: فقط متغیرهای CSS روی `<html>` بازنویسی می‌شوند
  و `data-template` / `data-mode` / `data-season` عوض می‌شوند.
- هنرمند می‌تواند قالب را از پنل Duplicate کند و نسخه‌ی شخصی‌سازی‌شده بسازد؛ قالب‌های پیش‌فرض قابل حذف نیستند.
- `allow_visitor_override` تعیین می‌کند بازدیدکننده اجازه‌ی تغییر حالت/فصل داشته باشد یا نه.

---

## ۱۱. پنل مدیریت

دو مسیر مدیریتی وجود دارد:

1. **`/django-admin/`** — ادمین جنگو، کامل تنظیم‌شده با نام‌های فارسی، پیش‌نمایش تصویر،
   Inline برای تصاویر آثار و مشخصات مجسمه، اکشن‌های گروهی انتشار/پیش‌نویس/کپی.
   همیشه در دسترس است و برای کارهای سریع و اضطراری عالی است.
2. **پنل اختصاصی (`/admin-panel/` در فرانت‌اند)** — داشبورد آماری، مدیریت آثار با
   Drag & Drop، کتابخانه‌ی رسانه، گالری قالب‌ها با پیش‌نمایش زنده، Theme Customizer و Page Builder.

ورود اولیه: نام کاربری `admin` و رمزی که در `.env` برای `DJANGO_SUPERUSER_PASSWORD` گذاشته‌اید.
این کاربر در اولین اجرای کانتینر ساخته می‌شود و اگر از قبل باشد رمزش تغییر نمی‌کند
(مگر `DJANGO_SUPERUSER_FORCE_RESET=1`). **بعد از اولین ورود رمز را عوض کنید.**

---

## ۱۲. Deploy روی VPS

این پروژه با فرض این‌که روی سرور شما **چند پروژه‌ی Docker دیگر هم اجرا می‌شود** طراحی شده:
هیچ سرویسی پورت میزبان را بی‌دلیل اشغال نمی‌کند. Postgres و Backend فقط داخل شبکه‌ی
Docker قابل دسترسی هستند.

### حالت A — این پروژه صاحب پورت‌های ۸۰/۴۴۳ است

```bash
# ۱) کد
cd /srv && git clone <repo-url> artist-portfolio && cd artist-portfolio

# ۲) تنظیمات
cp .env.example .env && nano .env
#   DJANGO_DEBUG=0
#   DJANGO_SETTINGS_MODULE=config.settings.prod
#   DJANGO_SECRET_KEY=<کلید تصادفی>
#   POSTGRES_PASSWORD=<رمز قوی>
#   PUBLIC_DOMAIN=example.com
#   DJANGO_ALLOWED_HOSTS=example.com,www.example.com
#   CSRF_TRUSTED_ORIGINS=https://example.com
#   VITE_SITE_URL=https://example.com

# ۳) شبکه‌ی مشترک (یک‌بار برای همیشه)
docker network create edge || true

# ۴) گواهی SSL
./ops/init-ssl.sh

# ۵) اجرا
docker compose -f docker-compose.prod.yml --profile standalone up -d --build

# ۶) بررسی
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f backend
```

مایگریشن، `collectstatic`، ساخت کاربر مدیر و (در صورت `SEED_ON_START=1`) وارد کردن محتوا
همه در `entrypoint.sh` خودکار انجام می‌شوند.

### حالت B — یک Reverse Proxy مرکزی از قبل پورت‌های ۸۰/۴۴۳ را دارد (توصیه‌شده برای سرور چندپروژه‌ای)

```bash
docker network create edge || true

# nginx و certbot این پروژه بالا نمی‌آیند (پروفایل standalone را فعال نکنید)
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml run --rm frontend-build
```

سپس در Proxy مرکزی خود، دامنه را به `backend:8000` روی شبکه‌ی `edge` هدایت کنید و
`/media/`، `/static/` و فایل‌های Build فرانت را از همان Volumeها سرو کنید.
هیچ پورتی روی میزبان اشغال نمی‌شود و تضادی با پروژه‌های دیگر پیش نمی‌آید.

---

## ۱۳. پشتیبان‌گیری و بازیابی

```bash
# پشتیبان کامل: دیتابیس (فرمت custom) + آرشیو مدیا
./ops/backup.sh
# خروجی: backups/db-YYYYmmdd-HHMMSS.dump و backups/media-YYYYmmdd-HHMMSS.tar.gz
# فایل‌های قدیمی‌تر از ۳۰ روز خودکار پاک می‌شوند

# بازیابی
./ops/restore.sh backups/db-20260825-2130.dump backups/media-20260825-2130.tar.gz
```

پشتیبان‌گیری شبانه با cron:

```bash
crontab -e
0 3 * * * cd /srv/artist-portfolio && ./ops/backup.sh >> /var/log/ap-backup.log 2>&1
```

> پشتیبان‌ها را به یک مقصد خارج از سرور (S3، Backblaze، سرور دوم) هم منتقل کنید.
> پشتیبانی که فقط روی همان سرور است، پشتیبان نیست.

---

## ۱۴. به‌روزرسانی و Rollback

```bash
./ops/deploy.sh
```

این اسکریپت به ترتیب: پشتیبان می‌گیرد → `git pull` → Build ایمیج‌ها → Build فرانت →
`up -d` (مایگریشن در entrypoint) → و تا سالم شدن `/healthz` صبر می‌کند.
اگر سالم نشد، لاگ‌ها را نشان می‌دهد و با کد خطا خارج می‌شود.

بازگشت به نسخه‌ی قبل:

```bash
./ops/rollback.sh v1.2.0 backups/db-20260825-0300.dump
```

نکته: مایگریشن‌های دیتابیس به‌طور خودکار برگشت‌پذیر نیستند؛ برای همین `deploy.sh` **قبل از**
هر تغییری پشتیبان می‌گیرد.

---

## ۱۵. عیب‌یابی

| نشانه | علت و راه‌حل |
|---|---|
| `POSTGRES_PASSWORD is required` | در `.env` مقدار ندارد؛ Compose عمداً جلوی اجرا را می‌گیرد |
| Backend بالا نمی‌آید و لاگ `waiting for postgres` دارد | Postgres آماده نیست؛ `docker compose logs postgres` را ببینید (اغلب Volume با رمز قدیمی) |
| خطای ۴۰۰ Bad Request در Production | دامنه در `DJANGO_ALLOWED_HOSTS` نیست |
| خطای CSRF در ورود | `CSRF_TRUSTED_ORIGINS` باید شامل `https://دامنه` باشد (با پروتکل) |
| تصاویر ۴۰۴ می‌دهند | Volume `media_data` به Nginx وصل نیست، یا `collectstatic` اجرا نشده |
| نسخه‌های AVIF ساخته نمی‌شوند | `pillow-avif-plugin` نصب نشده؛ ایمیج را دوباره Build کنید (سایت با WebP کار می‌کند) |
| نوع فایل مجاز تشخیص داده نمی‌شود | `libmagic1` در ایمیج نیست؛ سیستم به هدر مرورگر برمی‌گردد که مطمئن نیست |
| پورت ۸۰۸۰ اشغال است | `HOST_HTTP_PORT` را در `.env` عوض کنید |
| CSS بعد از Deploy عوض نشده | کش مرورگر؛ فایل‌های `assets/` هش‌دار هستند، `index.html` با `no-cache` سرو می‌شود |
| انیمیشن‌ها اجرا نمی‌شوند | یا `prefers-reduced-motion` سیستم فعال است، یا `?qa=1` در URL است |
| بعد از `down -v` داده‌ها رفت | `-v` تمام Volumeها را پاک می‌کند؛ از `restore.sh` استفاده کنید |

بررسی سلامت سرویس:

```bash
curl -s http://localhost:8080/healthz     # {"status":"ok","database":"ok"}
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs --tail=100 backend
```

---

## چک‌لیست امنیتی Production

- [ ] `DJANGO_DEBUG=0` و `DJANGO_SETTINGS_MODULE=config.settings.prod`
- [ ] `DJANGO_SECRET_KEY` تصادفی و منحصربه‌فرد
- [ ] رمز قوی برای PostgreSQL و **تغییر رمز کاربر admin بعد از اولین ورود**
- [ ] HTTPS فعال + HSTS + کوکی‌های `Secure`
- [ ] `DJANGO_ALLOWED_HOSTS` و `CORS_ALLOWED_ORIGINS` محدود به دامنه‌ی خودتان
- [ ] `SEED_ON_START=0` بعد از اولین اجرا
- [ ] پشتیبان‌گیری شبانه فعال و **یک‌بار تست بازیابی انجام‌شده**
- [ ] `.env` هرگز Commit نشده باشد
