"""Root URL configuration.

- /api/v1/...   REST API consumed by the React site and the admin panel
- /django-admin Django's own admin (kept as a safety net / power tool)
- /static       collected by collectstatic, served by WhiteNoise in production
- /media        uploaded files. Served by Django in every environment.

Why Django serves /media in production too: the host nginx vhost proxies
/media/ to this container, and the uploaded files live on a Docker volume that
only this container mounts. Before this, MEDIA was only wired up when
DEBUG=True, so every image uploaded from the admin panel returned 404 in
production — uploads "worked" but nothing was ever visible.
"""

from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path, re_path
from django.views.static import serve as static_serve

from apps.core.views import RobotsTxtView, SitemapView, health

admin.site.site_header = "مدیریت پورتفولیوی هنرمند"
admin.site.site_title = "پورتفولیوی هنرمند"
admin.site.index_title = "پنل مدیریت"

urlpatterns = [
    path("django-admin/", admin.site.urls),
    path("api/v1/", include("config.api_urls")),
    path("healthz", health, name="health"),
    path("robots.txt", RobotsTxtView.as_view(), name="robots"),
    path("sitemap.xml", SitemapView.as_view(), name="sitemap"),
]

media_url = str(settings.MEDIA_URL).lstrip("/")

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
else:
    # Uploaded media must stay reachable in production as well.
    urlpatterns += [
        re_path(
            r"^%s(?P<path>.*)$" % media_url,
            static_serve,
            {"document_root": str(settings.MEDIA_ROOT)},
            name="media",
        ),
    ]
