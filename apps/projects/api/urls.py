from django.urls import path
from .views import ProjectListCreateView

urlpatterns = [
    path("projects/", ProjectListCreateView.as_view(), name="api-projects"),
]
