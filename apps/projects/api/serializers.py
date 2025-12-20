from rest_framework import serializers

from apps.projects.models import ChangeRequest, ProposedFileChange, WebsiteProject


class CommandSerializer(serializers.Serializer):
    project_id = serializers.IntegerField()
    command = serializers.CharField()


class ProposedFileChangeSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProposedFileChange
        fields = ["path", "before_text", "after_text", "created_at"]


class ChangeRequestSerializer(serializers.ModelSerializer):
    file_changes = ProposedFileChangeSerializer(read_only=True, many=True)

    class Meta:
        model = ChangeRequest
        fields = ["id", "command", "status", "error_message", "created_at", "file_changes"]


class ProjectSerializer(serializers.ModelSerializer):
    class Meta:
        model = WebsiteProject
        fields = ["id", "name", "repo_full_name", "default_branch", "deploy_webhook_url", "created_at"]
