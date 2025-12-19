from django.conf import settings
from django.db import models


class GithubConnection(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    access_token = models.TextField()  # store encrypted in prod (KMS/Field encryption)
    github_login = models.CharField(max_length=200, blank=True, default="")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)


class WebsiteProject(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    name = models.CharField(max_length=200)
    repo_full_name = models.CharField(max_length=300)  # e.g. "XS227/SETai-site"
    default_branch = models.CharField(max_length=100, default="main")

    deploy_webhook_url = models.URLField(blank=True, default="")  # optional

    created_at = models.DateTimeField(auto_now_add=True)


class ChangeRequest(models.Model):
    class Status(models.TextChoices):
        PROPOSED = "proposed"
        PUBLISHED = "published"
        CANCELLED = "cancelled"
        FAILED = "failed"

    project = models.ForeignKey(WebsiteProject, on_delete=models.CASCADE)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    command = models.TextField()

    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PROPOSED)
    error_message = models.TextField(blank=True, default="")

    created_at = models.DateTimeField(auto_now_add=True)


class ProposedFileChange(models.Model):
    change_request = models.ForeignKey(ChangeRequest, on_delete=models.CASCADE, related_name="file_changes")
    path = models.CharField(max_length=500)

    before_text = models.TextField()
    after_text = models.TextField()

    created_at = models.DateTimeField(auto_now_add=True)
