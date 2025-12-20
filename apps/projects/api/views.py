from django.shortcuts import get_object_or_404
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.projects.models import ChangeRequest, GithubConnection, ProposedFileChange, WebsiteProject
from apps.projects.services.ai_proposal import simple_rule_based_parser
from apps.projects.services.deploy import trigger_deploy
from apps.projects.services.diff_engine import propose_content_json_update
from apps.projects.services.github_client import GithubService
from .serializers import ChangeRequestSerializer, CommandSerializer, ProjectSerializer


class ProjectListCreateView(generics.ListCreateAPIView):
    serializer_class = ProjectSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return WebsiteProject.objects.filter(user=self.request.user).order_by("-created_at")

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class ProposeChangeAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = CommandSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        project = get_object_or_404(
            WebsiteProject, id=serializer.validated_data["project_id"], user=request.user
        )
        command = serializer.validated_data["command"].strip()

        gh_conn = get_object_or_404(GithubConnection, user=request.user)
        gh = GithubService(gh_conn.access_token)
        repo = gh.get_repo(project.repo_full_name)

        before = gh.get_file_text(repo, "site_content.json", project.default_branch)
        ai = simple_rule_based_parser(command)
        before_text, after_text = propose_content_json_update(before, ai.target_key, ai.new_value)

        cr = ChangeRequest.objects.create(project=project, user=request.user, command=command)
        ProposedFileChange.objects.create(
            change_request=cr,
            path="site_content.json",
            before_text=before_text,
            after_text=after_text,
        )
        return Response(ChangeRequestSerializer(cr).data, status=status.HTTP_201_CREATED)


class PublishChangeAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, change_request_id: int):
        cr = get_object_or_404(ChangeRequest, id=change_request_id, user=request.user)
        fc = cr.file_changes.first()
        project = cr.project

        gh_conn = get_object_or_404(GithubConnection, user=request.user)
        gh = GithubService(gh_conn.access_token)
        repo = gh.get_repo(project.repo_full_name)

        try:
            sha = gh.update_file(
                repo=repo,
                path=fc.path,
                branch=project.default_branch,
                new_content=fc.after_text,
                message=f"SETai: {cr.command[:72]}",
            )
            trigger_deploy(project.deploy_webhook_url)
            cr.status = ChangeRequest.Status.PUBLISHED
            cr.save(update_fields=["status"])
            return Response({"sha": sha, "status": cr.status})
        except Exception as exc:  # noqa: BLE001
            cr.status = ChangeRequest.Status.FAILED
            cr.error_message = str(exc)
            cr.save(update_fields=["status", "error_message"])
            return Response(
                {"error": cr.error_message, "status": cr.status},
                status=status.HTTP_400_BAD_REQUEST,
            )
