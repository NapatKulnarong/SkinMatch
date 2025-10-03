# core/auth.py
from __future__ import annotations

try:
    import jwt
except ImportError as exc:  # pragma: no cover - dependency guard
    jwt = None  # type: ignore[assignment]
    _jwt_import_error = exc
else:
    _jwt_import_error = None
from datetime import datetime, timedelta, timezone
from django.conf import settings
from django.contrib.auth import get_user_model
from ninja.security import HttpBearer

User = get_user_model()

def _now_utc():
    return datetime.now(timezone.utc)

def create_access_token(user: User) -> str:
    """
    Create a signed JWT access token with user_id and exp.
    """
    if jwt is None:  # pragma: no cover - runtime guard
        raise RuntimeError("PyJWT is not installed. Please add 'PyJWT' to your environment.") from _jwt_import_error
    payload = {
        "sub": str(user.id),
        "user_id": user.id,
        "iat": int(_now_utc().timestamp()),
        "exp": int((_now_utc() + settings.JWT_ACCESS_TTL).timestamp()),
        "type": "access",
    }
    # PyJWT returns str in recent versions
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)

def decode_token(token: str) -> dict | None:
    if jwt is None:  # pragma: no cover - runtime guard
        raise RuntimeError("PyJWT is not installed. Please add 'PyJWT' to your environment.") from _jwt_import_error
    try:
        return jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM],
            options={"require": ["exp", "iat"]},
        )
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None

class JWTAuth(HttpBearer):
    """
    Ninja auth that expects: Authorization: Bearer <token>
    Sets request.auth to the authenticated User (or None).
    """
    def authenticate(self, request, token: str):
        data = decode_token(token)
        if not data or data.get("type") != "access":
            return None
        try:
            user = User.objects.get(id=data["user_id"])
        except User.DoesNotExist:
            return None
        return user  # returning a User marks auth success
