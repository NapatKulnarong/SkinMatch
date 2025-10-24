import uuid
from typing import Tuple

from django.conf import settings
from django.contrib.auth import get_user_model
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token as google_id_token

User = get_user_model()


def authenticate_google_id_token(id_token: str) -> Tuple[User, bool, str]:
    allowed_client_ids = [
        cid for cid in getattr(settings, "GOOGLE_OAUTH_CLIENT_IDS", []) if cid
    ]
    if not allowed_client_ids:
        single = getattr(settings, "GOOGLE_OAUTH_CLIENT_ID", "")
        if single:
            allowed_client_ids.append(single)

    if not allowed_client_ids:
        raise ValueError("Google login is not configured")

    try:
        idinfo = google_id_token.verify_oauth2_token(
            id_token,
            google_requests.Request(),
            audience=allowed_client_ids,
        )
    except ValueError as exc:
        raise ValueError("Invalid Google token") from exc

    sub = idinfo.get("sub")
    email = (idinfo.get("email") or "").lower()
    if not sub or not email:
        raise ValueError("Google account payload missing required fields")

    user = None
    created = False

    from .models import UserProfile  # local import to avoid circular

    try:
        profile = UserProfile.objects.select_related("user").get(google_sub=sub)
        user = profile.user
    except UserProfile.DoesNotExist:
        user = User.objects.filter(email__iexact=email).first()

    if not user:
        base_username = idinfo.get("name") or email.split("@")[0]
        username = _generate_unique_username(base_username)
        from django.utils.crypto import get_random_string

        password = get_random_string(32)
        user = User.objects.create_user(
            username=username,
            email=email,
            password=password,
            first_name=idinfo.get("given_name", ""),
            last_name=idinfo.get("family_name", ""),
        )
        created = True

    profile, _ = UserProfile.objects.get_or_create(user=user)
    if not profile.google_sub:
        profile.google_sub = sub
    if idinfo.get("email_verified") and not profile.is_verified:
        profile.is_verified = True
    profile.save()

    if not user.email:
        user.email = email
        user.save(update_fields=["email"])

    message = "Account created via Google" if created else "Login successful"
    return user, created, message


def _generate_unique_username(base: str) -> str:
    from django.utils.text import slugify

    candidate = slugify(base) or "user"
    original = candidate
    suffix = 1
    while User.objects.filter(username__iexact=candidate).exists():
        candidate = f"{original}-{suffix}"
        suffix += 1
    return candidate
