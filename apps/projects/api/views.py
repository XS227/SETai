"""API endpoints for projects (placeholder)."""

from rest_framework import generics
from apps.projects.models import Project
from .serializers import ProjectSerializer


class ProjectListCreateView(generics.ListCreateAPIView):
    queryset = Project.objects.all()
    serializer_class = ProjectSerializer
