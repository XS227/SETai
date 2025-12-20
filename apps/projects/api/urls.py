from django.urls import path
from .views import ProjectListCreateView, ProposeChangeAPIView, PublishChangeAPIView

urlpatterns = [
    path("", ProjectListCreateView.as_view(), name="projects"),
    path("propose/", ProposeChangeAPIView.as_view(), name="propose"),
    path("publish/<int:change_request_id>/", PublishChangeAPIView.as_view(), name="publish"),
]
