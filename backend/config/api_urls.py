"""REST API v1 routes.

One router for CRUD resources + a handful of purpose-built endpoints.
`bootstrap/` is the single call the frontend makes on first paint: it returns
settings, the resolved theme, navigation, and all published content, so the
site renders without a waterfall of requests.
"""

from django.urls import include, path
from rest_framework.routers import DefaultRouter

from apps.artist.views import (
    AboutBundleView,
    ArtistViewSet,
    AwardViewSet,
    CVEntryViewSet,
    EducationViewSet,
    MediumViewSet,
    PublicationViewSet,
    ServiceViewSet,
    StatViewSet,
    TestimonialViewSet,
    TimelineEntryViewSet,
)
from apps.artworks.views import (
    ArtworkImageViewSet,
    ArtworkViewSet,
    CategoryViewSet,
    CollectionViewSet,
)
from apps.contact.views import ContactMessageViewSet
from apps.core.views import (
    NavigationItemViewSet,
    SiteSettingView,
    SocialLinkViewSet,
    bootstrap,
)
from apps.exhibitions.views import ExhibitionImageViewSet, ExhibitionViewSet
from apps.insights.views import DashboardStatsView
from apps.media_library.views import MediaAssetViewSet, MediaFolderViewSet
from apps.pagebuilder.views import PageSectionViewSet, PageViewSet
from apps.theming.views import ActiveThemeView, SeasonViewSet, ThemeViewSet

router = DefaultRouter()

# artworks
router.register("artworks", ArtworkViewSet, basename="artwork")
router.register("artwork-images", ArtworkImageViewSet, basename="artwork-image")
router.register("categories", CategoryViewSet, basename="category")
router.register("collections", CollectionViewSet, basename="collection")

# artist / cv
router.register("artists", ArtistViewSet, basename="artist")
router.register("education", EducationViewSet, basename="education")
router.register("awards", AwardViewSet, basename="award")
router.register("publications", PublicationViewSet, basename="publication")
router.register("timeline", TimelineEntryViewSet, basename="timeline")
router.register("cv-entries", CVEntryViewSet, basename="cv-entry")
router.register("mediums", MediumViewSet, basename="medium")
router.register("stats", StatViewSet, basename="stat")
router.register("testimonials", TestimonialViewSet, basename="testimonial")
router.register("services", ServiceViewSet, basename="service")

# exhibitions
router.register("exhibitions", ExhibitionViewSet, basename="exhibition")
router.register(
    "exhibition-images", ExhibitionImageViewSet, basename="exhibition-image"
)

# page builder
router.register("pages", PageViewSet, basename="page")
router.register("page-sections", PageSectionViewSet, basename="page-section")

# theming
router.register("themes", ThemeViewSet, basename="theme")
router.register("seasons", SeasonViewSet, basename="season")

# media library
router.register("media", MediaAssetViewSet, basename="media")
router.register("media-folders", MediaFolderViewSet, basename="media-folder")

# site chrome
router.register("navigation", NavigationItemViewSet, basename="navigation")
router.register("social-links", SocialLinkViewSet, basename="social-link")

# contact
router.register(
    "contact-messages", ContactMessageViewSet, basename="contact-message"
)

urlpatterns = [
    path("bootstrap/", bootstrap, name="bootstrap"),
    path("site-settings/", SiteSettingView.as_view(), name="site-settings"),
    path("theme/active/", ActiveThemeView.as_view(), name="active-theme"),
    path("about/", AboutBundleView.as_view(), name="about-bundle"),
    path("dashboard/stats/", DashboardStatsView.as_view(), name="dashboard-stats"),
    path("auth/", include("apps.core.auth_urls")),
    path("", include(router.urls)),
]
