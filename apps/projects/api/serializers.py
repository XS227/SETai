"""Serializers for project resources (placeholder)."""

from rest_framework import serializers
from apps.projects.models import Project


class ProjectSerializer(serializers.ModelSerializer):
    class Meta:
        model = Project
        fields = ["id", "name", "repository_url", "created_at"]
