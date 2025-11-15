"""Test-only URLConf used by security tests to trigger controlled errors."""

from django.urls import path

from apidemo import urls as root_urls


def intentional_error_view(request):  # pragma: no cover - intentional crash
    raise RuntimeError("Intentional error for security tests")


urlpatterns = list(root_urls.urlpatterns) + [
    path("_tests/force-error/", intentional_error_view, name="security-force-error"),
]
