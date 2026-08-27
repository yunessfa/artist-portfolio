"""Lightweight, privacy-respecting page-view counter.

We do NOT store IP addresses — only a salted daily hash, which is enough to
estimate unique visitors without keeping personal data.
"""

import hashlib
import re

from django.conf import settings
from django.utils import timezone

SKIP_PREFIXES = (
    "/static/",
    "/media/",
    "/django-admin/",
    "/healthz",
    "/favicon",
    "/robots.txt",
    "/sitemap.xml",
)

# Only count real page/API reads, not admin mutations
SKIP_API = re.compile(r"^/api/v1/(auth|dashboard|media|pages|page-sections)")

BOT_PATTERN = re.compile(
    r"bot|crawler|spider|crawling|slurp|bingpreview|facebookexternalhit|"
    r"headlesschrome|python-requests|curl|wget|monitor|uptime",
    re.IGNORECASE,
)


class PageViewMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        try:
            self._record(request, response)
        except Exception:
            # analytics must never break a request
            pass
        return response

    def _record(self, request, response) -> None:
        if request.method != "GET" or response.status_code >= 400:
            return

        path = request.path
        if path.startswith(SKIP_PREFIXES) or SKIP_API.match(path):
            return
        if getattr(request, "user", None) is not None and request.user.is_staff:
            return

        from .models import PageView

        user_agent = request.META.get("HTTP_USER_AGENT", "")[:300]
        raw_ip = (
            request.META.get("HTTP_X_FORWARDED_FOR", "").split(",")[0].strip()
            or request.META.get("REMOTE_ADDR", "")
        )
        today = timezone.localdate().isoformat()
        digest = hashlib.sha256(
            f"{settings.SECRET_KEY}:{today}:{raw_ip}:{user_agent}".encode()
        ).hexdigest()[:32]

        PageView.objects.create(
            path=path[:300],
            referrer=request.META.get("HTTP_REFERER", "")[:300],
            user_agent=user_agent,
            visitor_hash=digest,
            is_bot=bool(BOT_PATTERN.search(user_agent)) if user_agent else True,
        )
