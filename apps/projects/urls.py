from django.urls import include, path
from . import views


app_name = "projects"

urlpatterns = [
    path("api/", include("apps.projects.api.urls")),
    path("connect/", views.connect_repo, name="connect-repo"),
    path("command/", views.command, name="command"),
    path("proposal/", views.proposal, name="proposal"),
    path("history/", views.history, name="history"),
]
