"""URLConf for security tests that wraps the real application URLs."""

from django.http import HttpResponse
from django.urls import path

from apidemo import urls as project_urls


def force_error_view(request):  # pragma: no cover - trivial test helper
    raise RuntimeError("Test-induced failure")


def friendly_server_error(request):  # pragma: no cover - trivial test helper
    return HttpResponse("Something went wrong.", status=500)


handler500 = friendly_server_error

urlpatterns = project_urls.urlpatterns + [
    path("_tests/force-error/", force_error_view, name="test-force-error"),
]
