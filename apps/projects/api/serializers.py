"""Serializers for project resources."""

from rest_framework import serializers
from apps.projects.models import WebsiteProject, ChangeRequest, ProposedFileChange


class ProjectSerializer(serializers.ModelSerializer):
    class Meta:
        model = WebsiteProject
        fields = ["id", "name", "repo_full_name", "default_branch", "deploy_webhook_url"]


class CommandSerializer(serializers.Serializer):
    project_id = serializers.IntegerField()
    command = serializers.CharField()


class ProposedFileChangeSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProposedFileChange
        fields = ["id", "path", "before_text", "after_text"]


class ChangeRequestSerializer(serializers.ModelSerializer):
    file_changes = ProposedFileChangeSerializer(many=True)

    class Meta:
        model = ChangeRequest
        fields = ["id", "command", "status", "created_at", "file_changes"]
