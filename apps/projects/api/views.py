"""API endpoints for project change requests."""

from django.shortcuts import get_object_or_404
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

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


CONTENT_FILE_PATH = "site_content.json"


class ProposeChangeAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = CommandSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        project = get_object_or_404(
            WebsiteProject,
            id=serializer.validated_data["project_id"],
            user=request.user,
        )
        command = serializer.validated_data["command"]

        gh_conn = get_object_or_404(GithubConnection, user=request.user)
        gh = GitHubClient(gh_conn.access_token)
        before = gh.get_file_text(project.repo_full_name, CONTENT_FILE_PATH, project.default_branch)

        ai = simple_rule_based_parser(command)
        before_text, after_text = propose_content_json_update(before, ai.target_key, ai.new_value)

        cr = ChangeRequest.objects.create(project=project, user=request.user, command=command)
        ProposedFileChange.objects.create(
            change_request=cr,
            path=CONTENT_FILE_PATH,
            before_text=before_text,
            after_text=after_text,
        )

        return Response(ChangeRequestSerializer(cr).data, status=status.HTTP_201_CREATED)


class PublishChangeAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, change_request_id: int):
        cr = get_object_or_404(ChangeRequest, id=change_request_id, user=request.user)
        project = cr.project

        if cr.status != ChangeRequest.Status.PROPOSED:
            return Response(
                {"status": "invalid", "error": "Change request has already been processed."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        fc = cr.file_changes.first()
        if not fc:
            cr.status = ChangeRequest.Status.FAILED
            cr.error_message = "No file changes found to publish."
            cr.save(update_fields=["status", "error_message"])
            return Response(
                {"status": "failed", "error": cr.error_message},
                status=status.HTTP_400_BAD_REQUEST,
            )

        gh_conn = get_object_or_404(GithubConnection, user=request.user)
        gh = GitHubClient(gh_conn.access_token)

        try:
            # MVP assumes exactly 1 file change
            sha = gh.update_file(
                repo_full_name=project.repo_full_name,
                path=fc.path,
                branch=project.default_branch,
                new_content=fc.after_text,
                message=f"SETai: {cr.command[:72]}",
            )
            trigger_deploy(project.deploy_webhook_url)

            cr.status = ChangeRequest.Status.PUBLISHED
            cr.save(update_fields=["status"])
            return Response({"status": "published", "commit_sha": sha})
        except Exception as e:  # pragma: no cover - defensive
            cr.status = ChangeRequest.Status.FAILED
            cr.error_message = str(e)
            cr.save(update_fields=["status", "error_message"])
            return Response({"status": "failed", "error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
