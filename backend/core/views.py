from urllib.parse import urlencode, urlparse, urlunparse, parse_qsl

import requests
from django.conf import settings
from django.contrib.auth import logout
from django.http import HttpResponse, HttpResponseRedirect
from django.shortcuts import redirect
from django.views import View

from .auth import create_access_token
from .google_auth import authenticate_google_id_token


def home(request):
    return HttpResponse("")


def logout_view(request):
    logout(request)
    return redirect("/")


class GoogleOAuthCallbackView(View):
    token_endpoint = "https://oauth2.googleapis.com/token"
    frontend_origin = getattr(settings, "FRONTEND_ORIGIN")
    account_redirect = getattr(settings, "FRONTEND_ACCOUNT_URL", f"{frontend_origin}/account")
    login_redirect = getattr(settings, "FRONTEND_LOGIN_URL", f"{frontend_origin}/login")

    def get(self, request, *args, **kwargs):
        if "error" in request.GET:
            return self._redirect_with_error(request, request.GET.get("error", "google_error"))

        code = request.GET.get("code")
        if not code:
            return self._redirect_with_error(request, "missing_code")

        client_id = getattr(settings, "GOOGLE_OAUTH_CLIENT_ID", "")
        client_secret = getattr(settings, "GOOGLE_OAUTH_CLIENT_SECRET", "")
        if not client_id or not client_secret:
            return self._redirect_with_error(request, "server_not_configured")

        redirect_uri = getattr(
            settings,
            "GOOGLE_OAUTH_REDIRECT_URI",
            request.build_absolute_uri(request.path),
        )

        token_response = requests.post(
            self.token_endpoint,
            data={
                "code": code,
                "client_id": client_id,
                "client_secret": client_secret,
                "redirect_uri": redirect_uri,
                "grant_type": "authorization_code",
            },
            timeout=10,
        )

        if token_response.status_code != 200:
            return self._redirect_with_error(request, "token_exchange_failed")

        token_payload = token_response.json()
        id_token = token_payload.get("id_token")
        if not id_token:
            return self._redirect_with_error(request, "missing_id_token")

        try:
            user, created, _ = authenticate_google_id_token(id_token)
        except ValueError:
            return self._redirect_with_error(request, "invalid_token")

        jwt_token = create_access_token(user)
        params = {
            "token": jwt_token,
            "provider": "google",
            "status": "new" if created else "ok",
        }
        return HttpResponseRedirect(self._build_frontend_redirect(params))

    def _redirect_with_error(self, request, error_code: str):
        params = {"error": error_code, "provider": "google"}
        return HttpResponseRedirect(self._build_frontend_redirect(params))

    def _build_frontend_redirect(self, params: dict) -> str:
        base = self.login_redirect if params.get("error") else self.account_redirect
        parsed = urlparse(base)
        existing = dict(parse_qsl(parsed.query))
        existing.update(params)
        new_query = urlencode(existing)
        return urlunparse(parsed._replace(query=new_query))
