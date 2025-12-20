from django.contrib import admin
from django.urls import include, path
from apps.core.views import home

urlpatterns = [
    path("admin/", admin.site.urls),
    path("", home, name="home"),
    path("accounts/", include("allauth.urls")),
    path("i18n/", include("django.conf.urls.i18n")),
    path("", include("apps.accounts.urls")),
    path("projects/", include("apps.projects.urls")),
    path("api/projects/", include("apps.projects.api.urls")),
]
