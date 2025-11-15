"""
URL configuration for apidemo project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
"""

from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.http import JsonResponse
from core.api import api, api_urlpatterns
from core.views import GoogleOAuthCallbackView

def health_check(request):
    return JsonResponse({"status": "ok"})

api_patterns, api_app_name, api_namespace = api_urlpatterns

urlpatterns = [
    path("admin/", admin.site.urls),
    path(
        "api/v1/",
        include((api_patterns, api_app_name), namespace=api_namespace),
    ),
    path(
        "api/",
        include((api_patterns, api_app_name), namespace=f"{api_namespace}-legacy"),
    ),
    path("api/auth/google/callback", GoogleOAuthCallbackView.as_view(), name="google_oauth_callback"),
    path("healthz/", health_check),
    path("accounts/", include("allauth.urls")),
    path("", include("core.urls")),
]

# Serve static and media files during development
if settings.DEBUG:
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
