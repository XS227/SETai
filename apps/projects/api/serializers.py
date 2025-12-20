"""Serializers for project change request endpoints."""

from rest_framework import serializers

from apps.projects.models import ChangeRequest, ProposedFileChange


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
        fields = [
            "id",
            "project",
            "command",
            "status",
            "error_message",
            "created_at",
            "file_changes",
        ]
