"""JWT auth for the admin panel, with login throttling."""

from django.contrib.auth import password_validation
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView


class LoginThrottle(AnonRateThrottle):
    scope = "login"


class ThrottledTokenView(TokenObtainPairView):
    throttle_classes = [LoginThrottle]


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        return Response(
            {
                "id": user.pk,
                "username": user.get_username(),
                "email": user.email,
                "firstName": user.first_name,
                "lastName": user.last_name,
                "isStaff": user.is_staff,
                "isSuperuser": user.is_superuser,
                "lastLogin": user.last_login,
            }
        )


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        from django.contrib.auth import logout

        logout(request)
        return Response(status=status.HTTP_204_NO_CONTENT)


class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        current = request.data.get("currentPassword") or ""
        new = request.data.get("newPassword") or ""
        user = request.user

        if not user.check_password(current):
            return Response(
                {"detail": "رمز فعلی نادرست است."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            password_validation.validate_password(new, user)
        except Exception as exc:
            return Response(
                {"detail": list(getattr(exc, "messages", [str(exc)]))},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user.set_password(new)
        user.save(update_fields=["password"])
        return Response({"detail": "رمز عبور به‌روز شد."})
