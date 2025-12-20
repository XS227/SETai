from django.contrib import admin
from .models import WebsiteProject


@admin.register(WebsiteProject)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ("name", "repo_full_name", "default_branch", "created_at")
    search_fields = ("name", "repo_full_name")
