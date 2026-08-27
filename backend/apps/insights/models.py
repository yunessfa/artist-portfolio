"""Traffic insights that power the real numbers on the admin dashboard."""

from django.db import models
from django.utils.translation import gettext_lazy as _


class PageView(models.Model):
    path = models.CharField(_("مسیر"), max_length=300, db_index=True)
    referrer = models.CharField(_("منبع ورود"), max_length=300, blank=True)
    user_agent = models.CharField(_("مرورگر"), max_length=300, blank=True)
    visitor_hash = models.CharField(
        _("شناسه‌ی روزانه‌ی بازدیدکننده"), max_length=32, blank=True, db_index=True
    )
    is_bot = models.BooleanField(_("ربات"), default=False, db_index=True)
    created_at = models.DateTimeField(_("زمان"), auto_now_add=True, db_index=True)

    class Meta:
        verbose_name = _("بازدید صفحه")
        verbose_name_plural = _("بازدیدهای صفحه")
        ordering = ("-created_at",)
        indexes = [models.Index(fields=["-created_at", "is_bot"])]

    def __str__(self):
        return f"{self.path} @ {self.created_at:%Y-%m-%d %H:%M}"
