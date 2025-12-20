"""Serializers for project resources (placeholder)."""

from rest_framework import serializers
from apps.projects.models import WebsiteProject


class ProjectSerializer(serializers.ModelSerializer):
    class Meta:
        model = WebsiteProject
        fields = ["id", "name", "repo_full_name", "default_branch", "deploy_webhook_url", "created_at"]
