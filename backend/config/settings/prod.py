"""Production settings — docker-compose.prod.yml behind nginx.

Fails fast on missing secrets instead of silently running insecurely.
"""

from .base import *  # noqa: F401,F403
from .base import env, env_bool, env_int, env_list

DEBUG = False

SECRET_KEY = env("DJANGO_SECRET_KEY", "")
if not SECRET_KEY or SECRET_KEY == "insecure-dev-key-change-me":
    raise RuntimeError(
        "DJANGO_SECRET_KEY در محیط پروداکشن الزامی است. مقدار امن در .env قرار دهید."
    )

if not env("POSTGRES_PASSWORD", ""):
    raise RuntimeError("POSTGRES_PASSWORD در محیط پروداکشن الزامی است.")

ALLOWED_HOSTS = env_list("DJANGO_ALLOWED_HOSTS", "backend")
if ALLOWED_HOSTS == ["backend"]:
    import sys

    print(
        "⚠️  DJANGO_ALLOWED_HOSTS تنطیم نشده — دامنه‌ی واقعی را اضافه کنید.",
        file=sys.stderr,
    )

# --------------------------------------------------------------------------- #
# HTTPS / secure headers (nginx terminates TLS, so trust its proxy header)
# --------------------------------------------------------------------------- #
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
USE_X_FORWARDED_HOST = True

ENABLE_HTTPS = env_bool("ENABLE_HTTPS", True)
SECURE_SSL_REDIRECT = ENABLE_HTTPS
SESSION_COOKIE_SECURE = ENABLE_HTTPS
CSRF_COOKIE_SECURE = ENABLE_HTTPS
SECURE_HSTS_SECONDS = env_int("SECURE_HSTS_SECONDS", 31536000) if ENABLE_HTTPS else 0
SECURE_HSTS_INCLUDE_SUBDOMAINS = ENABLE_HTTPS
SECURE_HSTS_PRELOAD = ENABLE_HTTPS

CORS_ALLOWED_ORIGINS = env_list("CORS_ALLOWED_ORIGINS")
CSRF_TRUSTED_ORIGINS = env_list("CSRF_TRUSTED_ORIGINS")

ADMINS = [
    ("Site owner", email)
    for email in env_list("DJANGO_ADMIN_EMAILS")
]

CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
        "LOCATION": "artist-portfolio",
    }
}

LOGGING["root"]["level"] = env("LOG_LEVEL", "WARNING")  # noqa: F405
