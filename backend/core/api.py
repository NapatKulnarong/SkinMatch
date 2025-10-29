import os
from datetime import date, datetime
from pathlib import Path
from typing import List, Optional
from uuid import uuid4
import uuid

try:
    import google.generativeai as genai  # type: ignore
except ModuleNotFoundError:  # pragma: no cover - optional dependency
    genai = None
from django.conf import settings
from django.contrib.auth import authenticate, get_user_model
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from django.db import IntegrityError, transaction
from django.db.models import Case, Count, IntegerField, Max, Q, When
from django.shortcuts import get_object_or_404
from ninja import File, ModelSchema, NinjaAPI, Schema
from ninja.errors import HttpError
from ninja.files import UploadedFile
from ninja.errors import HttpError
from ninja.files import UploadedFile

from .models import (
    UserProfile,
    SkinFactContentBlock,
    SkinFactTopic,
    SkinFactView,
)
from pydantic import ConfigDict, field_validator, model_validator

try:
    from pydantic import EmailStr as _EmailStr
except ImportError:  # pragma: no cover - fallback for limited environments
    EmailStr = str  # type: ignore
else:
    try:
        import email_validator  # noqa: F401
    except ImportError:  # pragma: no cover - fallback when email-validator missing
        EmailStr = str  # type: ignore
    else:
        EmailStr = _EmailStr  # type: ignore

from .auth import create_access_token, JWTAuth
from .google_auth import authenticate_google_id_token
from quiz.views import router as quiz_router

import google.generativeai as genai


api = NinjaAPI()
api.add_router("/quiz", quiz_router)
User = get_user_model()

if genai:
    genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))

# --------------- Schemas ---------------

class SignUpIn(Schema):
    first_name: str
    last_name: str
    username: str
    email: EmailStr
    password: str
    confirm_password: str
    date_of_birth: str | None = None # 'YYYY-MM-DD'
    gender: str | None = None #'male'|'female'|'prefer_not'

    @field_validator("password")
    @classmethod
    def strong(cls, v):
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v

class SignUpOut(Schema):
    ok: bool
    message: str

class LoginIn(Schema):
    identifier: Optional[str] = None
    email: Optional[str] = None
    password: str

    model_config = ConfigDict(populate_by_name=True)

    @model_validator(mode="after")
    def ensure_identifier(cls, values):
        identifier = (values.identifier or values.email or "").strip()
        if not identifier:
            raise ValueError("Identifier (email or username) is required")
        values.identifier = identifier
        return values

class tokenOut(Schema):
    ok: bool
    token: Optional[str] = None
    message: str

class GoogleLoginIn(Schema):
    id_token: str

class ProfileOut(Schema):
    """
    Unified profile response : user core fields + profile extras
    """
    model_config = ConfigDict(from_attributes=True)  # allow model instances
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    # profile
    u_id: uuid.UUID
    is_verified: bool
    created_at: datetime
    avatar_url: Optional[str] = None
    date_of_birth: Optional[date] = None
    gender: Optional[str] = None
    # user
    username: str
    email: Optional[str] = None
    is_staff: bool
    is_superuser: bool

class UserProfileSchema(ModelSchema):
    class Config:
        model = UserProfile
        model_fields = ['u_id', 'is_verified', 'created_at', 'avatar_url', 'date_of_birth', 'gender']


class ProfileUpdateIn(Schema):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    username: Optional[str] = None
    date_of_birth: Optional[str] = None
    gender: Optional[str] = None
    avatar_url: Optional[str] = None
    remove_avatar: Optional[bool] = None

class GenIn(Schema):
    prompt: str
    model: Optional[str] = "gemini-2.5-flash"

class GenOut(Schema):
    response: str

CANDIDATES = [
    "gemini-2.5-flash",       # current flash (usually free)
    "gemini-flash-latest",    # alias to current flash
    "gemini-2.0-flash",       # older flash
    "gemini-2.0-flash-001",   # older flash variant
]

def generate_text(prompt: str, temperature: float = 0.2) -> str:
    if genai is None:
        raise RuntimeError("google-generativeai SDK is not installed")

    last_err = None
    for name in CANDIDATES:
        try:
            model = genai.GenerativeModel(name)
            resp = model.generate_content(
                prompt,
                generation_config={"temperature": temperature},
            )
            return (resp.text or "").strip()
        except Exception as e:
            last_err = e
            continue
    raise last_err

class FactTopicSummary(Schema):
    id: uuid.UUID
    slug: str
    title: str
    subtitle: Optional[str] = None
    excerpt: Optional[str] = None
    section: str
    hero_image_url: Optional[str] = None
    hero_image_alt: Optional[str] = None
    view_count: int

class FactContentBlockOut(Schema):
    order: int
    block_type: str
    heading: Optional[str] = None
    text: Optional[str] = None
    image_url: Optional[str] = None
    image_alt: Optional[str] = None


class FactTopicDetailOut(FactTopicSummary):
    content_blocks: List[FactContentBlockOut]
    updated_at: datetime

# --------------- Auth endpoints ---------------


@api.post("/ai/gemini/generate", response=GenOut, auth=JWTAuth())
def genai_generate(request, payload: GenIn):
    if genai is None:
        raise HttpError(503, "AI generation service is not available.")
    response_text = generate_text(payload.prompt)
    return {"response": response_text}

@api.post("/auth/token", response=tokenOut)
def token_login(request, payload: LoginIn):
    identifier = payload.identifier
    user_obj = (
        User.objects.filter(Q(username__iexact=identifier) | Q(email__iexact=identifier))
        .select_related("profile")
        .first()
    )
    if not user_obj:
        return {"ok": False, "message": "Invalid credentials"}

    user = authenticate(request, username=user_obj.get_username(), password=payload.password)
    if not user:
        return {"ok": False, "message": "Invalid credentials"}
    
    token = create_access_token(user)
    return {"ok": True, "token": token, "message": "Login successful"}

@api.post("/auth/oauth/google", response=tokenOut)
def google_login(request, payload: GoogleLoginIn):
    try:
        user, created, message = authenticate_google_id_token(payload.id_token)
    except ValueError as exc:
        return {"ok": False, "message": str(exc)}

    token = create_access_token(user)
    return {"ok": True, "token": token, "message": message}

@api.post("/auth/signup", response=SignUpOut)
@transaction.atomic
def signup(request, payload: SignUpIn):
    # basic checks
    if payload.password != payload.confirm_password:
        return {"ok": False, "message": "Passwords do not match"}
    
    # enforce uniqueness in code (case-insensitive)
    if User.objects.filter(username__iexact=payload.username).exists():
        return {"ok": False, "message": "Username already taken"}
    
    if User.objects.filter(email__iexact=str(payload.email)).exists():
        return {"ok": False, "message": "Email already in use"}
    
    # create user
    try:
        user = User.objects.create_user(
            username=payload.username,
            email=str(payload.email),
            password=payload.password,
            first_name=payload.first_name.strip(),
            last_name=payload.last_name.strip(),
        )
    except IntegrityError:
        # covers where a same-username user is created between the check and now
        return {"ok": False, "message": "Username already taken"}
    
    # create/update profile
    dob = None
    if payload.date_of_birth:
        try:
            dob = date.fromisoformat(payload.date_of_birth)
        except ValueError:
            parts = payload.date_of_birth.replace("-", "/").split("/")
            if len(parts) != 3:
                return {"ok": False, "message": "Date of birth must be in YYYY-MM-DD format."}

            try:
                if len(parts[0]) == 4:
                    year, month, day = map(int, parts)
                elif len(parts[2]) == 4:
                    day, month, year = map(int, parts)
                else:
                    raise ValueError
                dob = date(year, month, day)
            except ValueError:
                return {"ok": False, "message": "Date of birth must be in YYYY-MM-DD format."}
    gender_choice = None
    if payload.gender and payload.gender in dict(UserProfile.Gender.choices):
        gender_choice = payload.gender

    profile, _ = UserProfile.objects.get_or_create(user=user)

    profile_updates: list[str] = []
    if dob is not None and profile.date_of_birth != dob:
        profile.date_of_birth = dob
        profile_updates.append("date_of_birth")
    if gender_choice is not None and profile.gender != gender_choice:
        profile.gender = gender_choice
        profile_updates.append("gender")

    if profile_updates:
        profile.save(update_fields=profile_updates + ["updated_at"])
    return {"ok": True, "message": "Signup successful"}

@api.post("/auth/logout", response=tokenOut, auth=JWTAuth())
def token_logout(request):
    # Stateless JWT: nothing to revoke on the server by default
    # Client should delete stored token
    return {"ok": True, "token": None, "message": "Logged out (token discarded client-side)"}


def _absolute_avatar_url(raw_url: Optional[str], request) -> Optional[str]:
    if not raw_url:
        return None
    url = raw_url.strip()
    if not url:
        return None
    if url.startswith(("http://", "https://")):
        # Already absolute - fix backend hostname if present
        url = url.replace("http://backend:8000", "http://localhost:8000")
        url = url.replace("http://backend", "http://localhost:8000")
        return url
    
    if url.startswith("/"):
        absolute = request.build_absolute_uri(url) if request else url
    else:
        media_url = settings.MEDIA_URL.rstrip("/") + "/" + url.lstrip("/")
        absolute = request.build_absolute_uri(media_url) if request else media_url
    
    # Fix the hostname for browser access
    if isinstance(absolute, str):
        absolute = absolute.replace("http://backend:8000", "http://localhost:8000")
        absolute = absolute.replace("http://backend", "http://localhost:8000")
    
    return absolute


def _serialize_profile_response(user, profile: UserProfile, request=None) -> dict:
    return {
        "u_id": profile.u_id,
        "is_verified": profile.is_verified,
        "created_at": profile.created_at,
        "avatar_url": _absolute_avatar_url(profile.avatar_url, request),
        "date_of_birth": profile.date_of_birth,
        "gender": profile.gender,
        "username": user.get_username(),
        "email": user.email,
        "is_staff": user.is_staff,
        "is_superuser": user.is_superuser,
        "first_name": user.first_name or None,
        "last_name": user.last_name or None,
    }


@api.get("/auth/me", response=ProfileOut, auth=JWTAuth())
def me_view(request):
    # request.auth is the authenticated User object (from JWTAuth)
    user: User = request.auth
    profile, _ = UserProfile.objects.select_related("user").get_or_create(user=user)
    return _serialize_profile_response(user, profile, request)


@api.put("/auth/me", response=ProfileOut, auth=JWTAuth())
def update_profile(request, payload: ProfileUpdateIn):
    user: User = request.auth
    profile, _ = UserProfile.objects.select_related("user").get_or_create(user=user)

    updates_user = {}
    updates_profile = {}

    if payload.first_name is not None:
        updates_user["first_name"] = payload.first_name.strip()
    if payload.last_name is not None:
        updates_user["last_name"] = payload.last_name.strip()
    if payload.username is not None:
        new_username = payload.username.strip()
        if not new_username:
            raise HttpError(400, "Username cannot be blank")
        exists = User.objects.exclude(id=user.id).filter(username__iexact=new_username).exists()
        if exists:
            raise HttpError(400, "Username already taken")
        updates_user["username"] = new_username
    if payload.date_of_birth is not None:
        dob_value = payload.date_of_birth.strip()
        if dob_value == "":
            updates_profile["date_of_birth"] = None
        else:
            try:
                updates_profile["date_of_birth"] = date.fromisoformat(dob_value)
            except ValueError as exc:
                raise HttpError(400, "Date of birth must be in YYYY-MM-DD format.") from exc
    if payload.gender is not None:
        gender_value = payload.gender.strip()
        if gender_value == "":
            updates_profile["gender"] = None
        elif gender_value not in dict(UserProfile.Gender.choices):
            raise HttpError(400, "Invalid gender selection")
        else:
            updates_profile["gender"] = gender_value
    if payload.avatar_url is not None:
        updates_profile["avatar_url"] = payload.avatar_url.strip()
    if payload.remove_avatar:
        updates_profile["avatar_url"] = ""

    if updates_user:
        for field, value in updates_user.items():
            setattr(user, field, value)
        user.save(update_fields=list(updates_user.keys()))

    if updates_profile:
        for field, value in updates_profile.items():
            setattr(profile, field, value)
        profile.save(update_fields=list(updates_profile.keys()) + ["updated_at"])

    return _serialize_profile_response(user, profile, request)


@api.post("/auth/me/avatar", response=ProfileOut, auth=JWTAuth())
def upload_avatar(request, file: UploadedFile = File(...)):
    user: User = request.auth
    profile, _ = UserProfile.objects.select_related("user").get_or_create(user=user)

    original_name = Path(file.name or "")
    ext = original_name.suffix.lower()
    allowed_ext = {".jpg", ".jpeg", ".png", ".gif", ".webp"}
    if ext not in allowed_ext:
        raise HttpError(400, "Unsupported file type. Please upload PNG, JPG, GIF, or WEBP.")

    filename = f"profiles/{uuid4().hex}{ext}"
    saved_path = default_storage.save(filename, ContentFile(file.read()))
    storage_url = default_storage.url(saved_path)
    profile.avatar_url = storage_url
    profile.save(update_fields=["avatar_url", "updated_at"])

    return _serialize_profile_response(user, profile, request)

@api.get("/users", response=List[ProfileOut], auth=JWTAuth())
def list_users(request, limit: int = 50, offset: int = 0):
    qs = (UserProfile.objects
          .select_related("user")
          .order_by("created_at")[offset:offset+limit])
    return [_serialize_profile_response(p.user, p, request) for p in qs]

@api.get("/hello")
def api_root(request):
    return {"message": "Welcome to the API!"}

# -----------------------------skin fact---------------------------------------------

@api.get("/facts/topics/popular", response=List[FactTopicSummary])
def popular_facts(request, limit: int = 5):
    limit = max(1, min(limit, 10))
    base_qs = SkinFactTopic.objects.filter(is_published=True)
    topics: List[SkinFactTopic] = []

    user = getattr(request, "user", None)
    if user and user.is_authenticated:
        viewed = (
            SkinFactView.objects.filter(user=user, topic__is_published=True)
            .values("topic_id")
            .annotate(total=Count("id"), last_view=Max("viewed_at"))
            .order_by("-total", "-last_view")[:limit]
        )
        topic_id_order = [row["topic_id"] for row in viewed]
        if topic_id_order:
            order_case = Case(
                *[When(id=topic_id, then=position) for position, topic_id in enumerate(topic_id_order)],
                output_field=IntegerField(),
            )
            topics = list(
                base_qs.filter(id__in=topic_id_order).order_by(order_case)
            )

    if len(topics) < limit:
        fallback = (
            base_qs.exclude(id__in=[topic.id for topic in topics])
            .order_by("-view_count", "-updated_at")[: limit - len(topics)]
        )
        topics.extend(list(fallback))

    return [_serialize_fact_topic_summary(topic, request) for topic in topics]


@api.get("/facts/topics/section/{section}", response=List[FactTopicSummary])
def facts_by_section(request, section: str, limit: int = 12, offset: int = 0):
    valid_sections = {choice.value for choice in SkinFactTopic.Section}
    section_key = section.lower()
    if section_key not in valid_sections:
        raise HttpError(404, "Unknown section")

    limit = max(1, min(limit, 50))
    qs = (
        SkinFactTopic.objects.filter(section=section_key, is_published=True)
        .order_by("-updated_at", "-created_at")
    )
    topics = qs[offset : offset + limit]
    return [_serialize_fact_topic_summary(topic, request) for topic in topics]


@api.get("/facts/topics/{slug}", response=FactTopicDetailOut)
def fact_topic_detail(request, slug: str):
    topic = get_object_or_404(
        SkinFactTopic.objects.prefetch_related("content_blocks").filter(is_published=True),
        slug=slug,
    )

    user = getattr(request, "user", None)
    anon_key = request.headers.get("X-Client-ID") or request.META.get("REMOTE_ADDR", "")
    SkinFactView.objects.create(
        topic=topic,
        user=user if user and user.is_authenticated else None,
        anonymous_key=(anon_key or "")[:64],
    )
    topic.refresh_from_db(fields=["view_count", "updated_at"])

    blocks = [_serialize_fact_block(block, request) for block in topic.content_blocks.all()]
    return FactTopicDetailOut(
        id=topic.id,
        slug=topic.slug,
        title=topic.title,
        subtitle=topic.subtitle or None,
        excerpt=topic.excerpt or None,
        section=topic.section,
        hero_image_url=_resolve_media_url(request, topic.hero_image),
        hero_image_alt=topic.hero_image_alt or None,
        view_count=topic.view_count,
        updated_at=topic.updated_at,
        content_blocks=blocks,
    )


def _serialize_fact_topic_summary(topic: SkinFactTopic, request) -> FactTopicSummary:
    return FactTopicSummary(
        id=topic.id,
        slug=topic.slug,
        title=topic.title,
        subtitle=topic.subtitle or None,
        excerpt=topic.excerpt or None,
        section=topic.section,
        hero_image_url=_resolve_media_url(request, topic.hero_image),
        hero_image_alt=topic.hero_image_alt or None,
        view_count=topic.view_count,
    )


def _serialize_fact_block(block: SkinFactContentBlock, request) -> FactContentBlockOut:
    return FactContentBlockOut(
        order=block.order,
        block_type=block.block_type,
        heading=block.heading or None,
        text=block.text or None,
        image_url=_resolve_media_url(request, block.image),
        image_alt=block.image_alt or None,
    )


def _resolve_media_url(request, image_field) -> Optional[str]:
    if not image_field:
        return None

    try:
        relative_url = image_field.url  # e.g. "/media/facts/hero/myimg.jpg"
    except ValueError:
        return None

    if not request:
        # fallback: just return relative
        return relative_url

    # Build something like "http://backend:8000/media/facts/hero/myimg.jpg"
    absolute = request.build_absolute_uri(relative_url)

    # Important bit:
    # When the frontend (running in your browser on macOS at http://localhost:3000)
    # calls the backend container, Django thinks its own host is "backend:8000".
    # But the browser cannot resolve "backend". It ONLY knows "localhost:8000".
    absolute = absolute.replace("http://backend:8000", "http://localhost:8000")
    absolute = absolute.replace("http://backend", "http://localhost:8000")

    return absolute


# ------------------------------------------------------------------------------------
