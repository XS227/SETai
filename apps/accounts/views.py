from django.contrib.auth.decorators import login_required
from django.shortcuts import render
from apps.projects.models import WebsiteProject


@login_required
def dashboard(request):
    projects = WebsiteProject.objects.filter(user=request.user).order_by("-created_at")
    return render(request, "accounts/dashboard.html", {"projects": projects})
