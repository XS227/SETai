from django.urls import path
from .views import ProposeChangeAPIView, PublishChangeAPIView

urlpatterns = [
    path("propose/", ProposeChangeAPIView.as_view(), name="propose"),
    path("publish/<int:change_request_id>/", PublishChangeAPIView.as_view(), name="publish"),
]
