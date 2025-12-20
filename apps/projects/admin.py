from django.contrib import admin

from .models import ChangeRequest, ProposedFileChange, WebsiteProject


@admin.register(WebsiteProject)
class WebsiteProjectAdmin(admin.ModelAdmin):
    list_display = ("name", "repo_full_name", "default_branch", "user", "created_at")
    search_fields = ("name", "repo_full_name")
    list_select_related = ("user",)


class ProposedFileChangeInline(admin.TabularInline):
    model = ProposedFileChange
    extra = 0


@admin.register(ChangeRequest)
class ChangeRequestAdmin(admin.ModelAdmin):
    list_display = ("id", "project", "user", "status", "created_at")
    search_fields = ("command",)
    list_filter = ("status",)
    list_select_related = ("project", "user")
    inlines = [ProposedFileChangeInline]
