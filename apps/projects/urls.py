from django.urls import path
from .views import command_view, history_view, new_project, proposal_view, publish_view

urlpatterns = [
    path("new/", new_project, name="new_project"),
    path("<int:project_id>/command/", command_view, name="command"),
    path("proposal/<int:change_request_id>/", proposal_view, name="proposal"),
    path("publish/<int:change_request_id>/", publish_view, name="publish"),
    path("<int:project_id>/history/", history_view, name="history"),
]
