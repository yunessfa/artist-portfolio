from rest_framework import viewsets
from rest_framework.generics import RetrieveUpdateAPIView
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.mixins import ReorderMixin
from apps.core.permissions import ReadOnlyOrStaff

from .models import (
    Artist,
    Award,
    CVEntry,
    Education,
    Medium,
    Publication,
    Service,
    Stat,
    Testimonial,
    TimelineEntry,
)
from .serializers import (
    ArtistSerializer,
    AwardSerializer,
    CVEntrySerializer,
    CVSerializer,
    EducationSerializer,
    MediumSerializer,
    PublicationSerializer,
    ServiceSerializer,
    StatSerializer,
    TestimonialSerializer,
    TimelineEntrySerializer,
)


class ArtistViewSet(viewsets.ModelViewSet):
    """Singleton, but exposed as a viewset so the router stays uniform."""

    queryset = Artist.objects.all()
    serializer_class = ArtistSerializer
    permission_classes = [ReadOnlyOrStaff]

    def get_object(self):
        return Artist.load()

    def list(self, request, *args, **kwargs):
        return Response(self.get_serializer(Artist.load()).data)


class _ActiveOrderedViewSet(ReorderMixin, viewsets.ModelViewSet):
    permission_classes = [ReadOnlyOrStaff]
    model = None

    def get_queryset(self):
        queryset = self.model.objects.all()
        if not (self.request.user and self.request.user.is_staff):
            queryset = queryset.filter(is_active=True)
        return queryset


class MediumViewSet(_ActiveOrderedViewSet):
    model = Medium
    serializer_class = MediumSerializer


class StatViewSet(_ActiveOrderedViewSet):
    model = Stat
    serializer_class = StatSerializer


class EducationViewSet(_ActiveOrderedViewSet):
    model = Education
    serializer_class = EducationSerializer


class AwardViewSet(_ActiveOrderedViewSet):
    model = Award
    serializer_class = AwardSerializer


class PublicationViewSet(_ActiveOrderedViewSet):
    model = Publication
    serializer_class = PublicationSerializer


class TimelineEntryViewSet(_ActiveOrderedViewSet):
    model = TimelineEntry
    serializer_class = TimelineEntrySerializer


class TestimonialViewSet(_ActiveOrderedViewSet):
    model = Testimonial
    serializer_class = TestimonialSerializer


class ServiceViewSet(_ActiveOrderedViewSet):
    model = Service
    serializer_class = ServiceSerializer


class CVEntryViewSet(_ActiveOrderedViewSet):
    model = CVEntry
    serializer_class = CVEntrySerializer
    filterset_fields = ["section"]

    def list(self, request, *args, **kwargs):
        if request.query_params.get("grouped") == "1":
            return Response(CVSerializer(None, context={"request": request}).data)
        return super().list(request, *args, **kwargs)


class AboutBundleView(APIView):
    """One request for the whole About page."""

    permission_classes = [ReadOnlyOrStaff]

    def get(self, request):
        context = {"request": request}
        return Response(
            {
                "artist": ArtistSerializer(Artist.load(), context=context).data,
                "mediums": MediumSerializer(
                    Medium.objects.filter(is_active=True), many=True, context=context
                ).data,
                "stats": StatSerializer(
                    Stat.objects.filter(is_active=True), many=True, context=context
                ).data,
                "timeline": TimelineEntrySerializer(
                    TimelineEntry.objects.filter(is_active=True),
                    many=True,
                    context=context,
                ).data,
                "education": EducationSerializer(
                    Education.objects.filter(is_active=True), many=True, context=context
                ).data,
                "awards": AwardSerializer(
                    Award.objects.filter(is_active=True), many=True, context=context
                ).data,
                "publications": PublicationSerializer(
                    Publication.objects.filter(is_active=True),
                    many=True,
                    context=context,
                ).data,
                "testimonials": TestimonialSerializer(
                    Testimonial.objects.filter(is_active=True),
                    many=True,
                    context=context,
                ).data,
                "services": ServiceSerializer(
                    Service.objects.filter(is_active=True), many=True, context=context
                ).data,
                "cv": CVSerializer(None, context=context).data,
            }
        )
