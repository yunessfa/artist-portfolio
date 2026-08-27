from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from .auth_views import ChangePasswordView, LogoutView, MeView, ThrottledTokenView

urlpatterns = [
    path("token/", ThrottledTokenView.as_view(), name="token-obtain"),
    path("token/refresh/", TokenRefreshView.as_view(), name="token-refresh"),
    path("me/", MeView.as_view(), name="me"),
    path("logout/", LogoutView.as_view(), name="logout"),
    path("password/", ChangePasswordView.as_view(), name="change-password"),
]
