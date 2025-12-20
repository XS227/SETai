from django.contrib import admin
from .models import WebsiteProject

from .models import ChangeRequest, ProposedFileChange, WebsiteProject

@admin.register(WebsiteProject)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ("name", "repo_full_name", "default_branch", "created_at")
    search_fields = ("name", "repo_full_name")
