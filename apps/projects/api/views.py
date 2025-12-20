"""API endpoints for projects."""

from rest_framework import generics
from apps.projects.models import WebsiteProject
from .serializers import ProjectSerializer


class ProjectListCreateView(generics.ListCreateAPIView):
    queryset = WebsiteProject.objects.all()
    serializer_class = ProjectSerializer
