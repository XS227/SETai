"""API endpoints for project change requests."""

from rest_framework import generics
from apps.projects.models import WebsiteProject
from .serializers import ProjectSerializer

from apps.projects.models import (
    ChangeRequest,
    GithubConnection,
    ProposedFileChange,
    WebsiteProject,
)
from apps.projects.services.ai_proposal import simple_rule_based_parser
from apps.projects.services.deploy import trigger_deploy
from apps.projects.services.diff_engine import propose_content_json_update
from apps.projects.services.github_client import GitHubClient
from .serializers import ChangeRequestSerializer, CommandSerializer

class ProjectListCreateView(generics.ListCreateAPIView):
    queryset = WebsiteProject.objects.all()
    serializer_class = ProjectSerializer
