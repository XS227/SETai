from django.contrib import admin
from .models import ChangeRequest, GithubConnection, ProposedFileChange, WebsiteProject


@admin.register(GithubConnection)
class GithubConnectionAdmin(admin.ModelAdmin):
    list_display = ("user", "github_login", "created_at")


@admin.register(WebsiteProject)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ("name", "repo_full_name", "default_branch", "created_at")
    search_fields = ("name", "repo_full_name")


@admin.register(ChangeRequest)
class ChangeRequestAdmin(admin.ModelAdmin):
    list_display = ("project", "user", "command", "status", "created_at")
    list_filter = ("status", "created_at")


@admin.register(ProposedFileChange)
class ProposedFileChangeAdmin(admin.ModelAdmin):
    list_display = ("change_request", "path", "created_at")
