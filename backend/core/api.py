import logging
import os
from datetime import date, datetime
from pathlib import Path
from typing import List, Optional
from urllib.parse import quote
from uuid import uuid4
import uuid

try:
    import google.generativeai as genai  # type: ignore
except ModuleNotFoundError:  # pragma: no cover - optional dependency
    genai = None
from django.conf import settings
from django.contrib.auth import authenticate, get_user_model
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.tokens import default_token_generator
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from django.core.mail import send_mail
from django.db import DatabaseError, IntegrityError, transaction
from django.db.models import Case, Count, IntegerField, Max, Q, When
from django.shortcuts import get_object_or_404
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from django.utils import timezone
from django.core.exceptions import ValidationError
from ninja import File, ModelSchema, NinjaAPI, Schema
from ninja.errors import HttpError
from ninja.files import UploadedFile

from .models import (
    UserProfile,
    SkinProfile,
    SkinFactContentBlock,
    SkinFactTopic,
    SkinFactView,
    NewsletterSubscriber,
    SkinProfile,
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

from .auth import create_access_token, JWTAuth, decode_token
from .google_auth import authenticate_google_id_token
from quiz.views import router as quiz_router, _resolve_request_user
from quiz.models import QuizSession, Product
from .models import WishlistItem
from .environment import fetch_environment_alerts, EnvironmentServiceError


logger = logging.getLogger(__name__)

from .api_scan import scan_router
from .api_scan_text import scan_text_router

if genai:
    genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))

api = NinjaAPI(version=getattr(settings, "API_VERSION_DEFAULT", "v1"), title="SkinMatch API")
api.add_router("/quiz", quiz_router)
api.add_router("/scan", scan_router)
api.add_router("/scan-text", scan_text_router)
User = get_user_model()
DEFAULT_LATITUDE = 13.7563
DEFAULT_LONGITUDE = 100.5018
DEFAULT_LOCATION_LABEL = "Bangkok"

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
    accept_terms_of_service: bool
    accept_privacy_policy: bool

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
    """Content block - either text (content) OR image"""
    order: int
    content: Optional[str] = None  # Markdown content (if text block)
    image_url: Optional[str] = None  # Image URL (if image block)
    image_alt: Optional[str] = None  # Image alt text (if image block)


class FactTopicDetailOut(FactTopicSummary):
    content_blocks: List[FactContentBlockOut]
    updated_at: datetime


class UVSummaryOut(Schema):
    index: float
    max_index: float
    level: str
    level_label: str
    message: str


class AirQualitySummaryOut(Schema):
    pm25: float
    pm10: float
    aqi: int
    level: str
    level_label: str
    message: str


class AlertItemOut(Schema):
    id: str
    category: str
    severity: str
    title: str
    message: str
    tips: List[str]
    valid_until: datetime


class EnvironmentAlertResponse(Schema):
    generated_at: datetime
    latitude: float
    longitude: float
    location_label: Optional[str] = None
    uv: UVSummaryOut
    air_quality: AirQualitySummaryOut
    alerts: List[AlertItemOut]
    source_name: str
    source_url: str
    refresh_minutes: int


class NewsletterSubscribeIn(Schema):
    email: EmailStr
    source: Optional[str] = None


class NewsletterSubscribeOut(Schema):
    ok: bool
    message: str
    already_subscribed: bool = False


class SendTermsEmailIn(Schema):
    email: EmailStr
    terms_body: str

    @field_validator("terms_body")
    @classmethod
    def body_not_empty(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("Terms body is required.")
        return cleaned


class SendTermsEmailOut(Schema):
    ok: bool

# --------------- Newsletter ---------------


def _get_newsletter_welcome_email_html(email: str = "") -> str:
    """Generate HTML email template for newsletter welcome email."""
    
    # Use FRONTEND_ORIGIN for development, or SITE_URL for production
    site_url = (
        getattr(settings, "SITE_URL", None) 
        or os.environ.get("SITE_URL") 
        or getattr(settings, "FRONTEND_ORIGIN", "http://localhost:3000")
        or "http://localhost:3000"
    ).rstrip("/")
    unsubscribe_url = f"{site_url}/newsletter/unsubscribe"
    if email:
        unsubscribe_url += f"?email={quote(email)}"
    
    return f"""
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SkinMatch Weekly Tips</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background: #f0f4f0; line-height: 1.6;">
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background: #f0f4f0; padding: 40px 20px;">
        <tr>
            <td align="center">
                <!-- Main Container - matches rounded-[32px] and shadow-[10px_12px_0_rgba(0,0,0,0.22)] -->
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width: 600px; background: linear-gradient(to bottom right, #fff1d6, #ffe9c8, #f4f1df); border-radius: 32px; border: 2px solid #000000; box-shadow: 10px 12px 0 rgba(0,0,0,0.22); overflow: hidden;">
                    
                    <!-- Header Section -->
                    <tr>
                        <td style="padding: 40px 40px 20px 40px; text-align: center;">
                            <p style="margin: 0 0 8px 0; color: #3c4c3f; font-size: 11px; font-weight: 600; letter-spacing: 1.5px; text-transform: uppercase;">Personalized Skincare Insights</p>
                            <h1 style="margin: 0 0 8px 0; color: #101b27; font-size: 36px; font-weight: 800; letter-spacing: -1px; line-height: 1.1;">SkinMatch</h1>
                            <p style="margin: 0; color: #2d3a2f; font-size: 14px; line-height: 1.4; font-style: italic;">"Your skin, Your match, Your best care!"</p>
                        </td>
                    </tr>

                    <!-- Welcome Card - matches rounded-3xl and shadow-[8px_8px_0_0_rgba(0,0,0,0.25)] -->
                    <tr>
                        <td style="padding: 30px 40px;">
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background: #FFFFFF; border: 2px solid #000000; border-radius: 24px; box-shadow: 8px 8px 0 0 rgba(0,0,0,0.25);">
                                <tr>
                                    <td style="padding: 30px;">
                                        <h2 style="margin: 0 0 16px 0; color: #101b27; font-size: 24px; font-weight: 800; line-height: 1.2;">Welcome to SkinMatch weekly skincare tips!</h2>
                                        <p style="margin: 0; color: #2d3a2f; font-size: 16px; line-height: 1.7;">Thanks for subscribing to SkinMatch. Each week you'll receive ingredient insights, product routines, and community wins tailored for healthy, happy skin.</p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- What You'll Get Section -->
                    <tr>
                        <td style="padding: 0 40px 30px 40px;">
                            <h3 style="margin: 0 0 18px 0; color: #101b27; font-size: 20px; font-weight: 800;">What you'll get every week:</h3>
                            
                            <!-- Feature 1 - matches design patterns -->
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 12px; background: #E7EFC7; border: 2px solid #000000; border-radius: 16px;">
                                <tr>
                                    <td style="padding: 20px;">
                                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                            <tr>
                                                <td width="45" valign="top">
                                                    <div style="width: 38px; height: 38px; background: #FFFFFF; border: 2px solid #000000; border-radius: 50%; text-align: center; line-height: 38px; font-size: 20px;">🔬</div>
                                                </td>
                                                <td valign="top" style="padding-left: 12px;">
                                                    <h4 style="margin: 0 0 6px 0; color: #101b27; font-size: 16px; font-weight: 700;">Ingredient Deep Dives</h4>
                                                    <p style="margin: 0; color: #2d3a2f; font-size: 14px; line-height: 1.6;">Discover what's really inside your favorite products and how ingredients work with your unique skin type.</p>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>

                            <!-- Feature 2 -->
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 12px; background: #FFFAEC; border: 2px solid #000000; border-radius: 16px;">
                                <tr>
                                    <td style="padding: 20px;">
                                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                            <tr>
                                                <td width="45" valign="top">
                                                    <div style="width: 38px; height: 38px; background: #FFFFFF; border: 2px solid #000000; border-radius: 50%; text-align: center; line-height: 38px; font-size: 20px;">✨</div>
                                                </td>
                                                <td valign="top" style="padding-left: 12px;">
                                                    <h4 style="margin: 0 0 6px 0; color: #101b27; font-size: 16px; font-weight: 700;">Personalized Product Routines</h4>
                                                    <p style="margin: 0; color: #2d3a2f; font-size: 14px; line-height: 1.6;">Build your perfect skincare routine with recommendations tailored to your goals and sensitivities.</p>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>

                            <!-- Feature 3 -->
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background: #D6F4ED; border: 2px solid #000000; border-radius: 16px;">
                                <tr>
                                    <td style="padding: 20px;">
                                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                            <tr>
                                                <td width="45" valign="top">
                                                    <div style="width: 38px; height: 38px; background: #FFFFFF; border: 2px solid #000000; border-radius: 50%; text-align: center; line-height: 38px; font-size: 20px;">💬</div>
                                                </td>
                                                <td valign="top" style="padding-left: 12px;">
                                                    <h4 style="margin: 0 0 6px 0; color: #101b27; font-size: 16px; font-weight: 700;">Community Success Stories</h4>
                                                    <p style="margin: 0; color: #2d3a2f; font-size: 14px; line-height: 1.6;">Get inspired by real results from the SkinMatch community and share your own glow-up journey.</p>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- CTA Button - matches shadow-[0_6px_0_rgba(0,0,0,0.35)] -->
                    <tr>
                        <td style="padding: 0 40px 35px 40px;" align="center">
                            <a href="{site_url}" style="display: inline-block; background: #fef9ef; color: #2d4a2b; text-decoration: none; padding: 14px 32px; border-radius: 30px; font-weight: 700; font-size: 15px; border: 2px solid #000000; box-shadow: 0 6px 0 rgba(0,0,0,0.35);">
                                Explore Your Dashboard →
                            </a>
                        </td>
                    </tr>

                    <!-- Closing Message -->
                    <tr>
                        <td style="padding: 0 40px 40px 40px;">
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background: rgba(255, 255, 255, 0.7); border: 2px solid #000000; border-radius: 16px;">
                                <tr>
                                    <td style="padding: 25px; text-align: center;">
                                        <p style="margin: 0 0 8px 0; color: #101b27; font-size: 16px; line-height: 1.6;">We're excited to share the glow with you!</p>
                                        <p style="margin: 0; color: #2d3a2f; font-size: 14px; font-weight: 600;">- The SkinMatch Team</p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="padding: 30px 40px; background: #fef9ef; border-top: 2px solid #000000;">
                            <p style="margin: 0 0 10px 0; color: #3c4c3f; font-size: 12px; line-height: 1.6; text-align: center;">
                                You're receiving this email because you subscribed to SkinMatch weekly skincare tips.
                            </p>
                            <p style="margin: 0 0 16px 0; text-align: center; font-size: 12px;">
                                <a href="{site_url}/newsletter/preferences" style="color: #2d4a2b; text-decoration: underline; margin: 0 8px;">Update preferences</a>
                                <span style="color: #3c4c3f;">|</span>
                                <a href="{unsubscribe_url}" style="color: #2d4a2b; text-decoration: underline; margin: 0 8px;">Unsubscribe</a>
                            </p>
                            <p style="margin: 0; color: #3c4c3f; font-size: 11px; text-align: center;">
                                © 2025 SkinMatch. All rights reserved.
                            </p>
                        </td>
                    </tr>

                </table>
            </td>
        </tr>
    </table>
</body>
</html>
    """.strip()


@api.post("/newsletter/subscribe", response=NewsletterSubscribeOut)
def subscribe_newsletter(request, payload: NewsletterSubscribeIn):
    email_value = str(payload.email or "").strip().lower()
    if not email_value:
        raise HttpError(400, "Email address is required.")

    source_value = (payload.source or "").strip()[:80]
    metadata = {
        "user_agent": (request.headers.get("User-Agent") or "")[:200],
        "referer": (request.headers.get("Referer") or "")[:200],
        "ip": request.META.get("REMOTE_ADDR"),
    }

    try:
        subscriber, created = NewsletterSubscriber.objects.get_or_create(
            email=email_value,
            defaults={
                "source": source_value,
                "metadata": metadata,
            },
        )
    except IntegrityError:
        created = False
        subscriber = NewsletterSubscriber.objects.filter(email=email_value).first()
    except DatabaseError as exc:
        logger.exception("Newsletter table unavailable during subscribe: %s", exc)
        raise HttpError(503, "Newsletter sign-ups are temporarily unavailable. Please try again soon.")

    if subscriber is None:
        logger.error("Newsletter subscription failed to persist for %s", email_value)
        raise HttpError(500, "We couldn't save your subscription. Please try again soon.")

    if created:
        try:
            sender = getattr(settings, "DEFAULT_FROM_EMAIL", None) or "no-reply@skinmatch.local"
            plain_message = (
                "Thanks for subscribing to SkinMatch. Each week you'll receive ingredient insights, "
                "product routines, and community wins tailored for healthy, happy skin.\n\n"
                "We're excited to share the glow with you!\n"
                "- The SkinMatch Team"
            )
            send_mail(
                subject="Welcome to SkinMatch weekly skincare tips!",
                message=plain_message,
                html_message=_get_newsletter_welcome_email_html(email_value),
                from_email=sender,
                recipient_list=[email_value],
                fail_silently=False,
            )
        except Exception as exc:
            logger.warning("Unable to send newsletter confirmation email: %s", exc)

        return {
            "ok": True,
            "message": "Thanks! You're now subscribed to weekly skincare tips.",
            "already_subscribed": False,
        }

    updated = False
    if source_value and subscriber and subscriber.source != source_value:
        subscriber.source = source_value
        updated = True
    if subscriber and metadata and metadata != subscriber.metadata:
        merged_metadata = dict(subscriber.metadata or {})
        merged_metadata.update({k: v for k, v in metadata.items() if v})
        if merged_metadata != subscriber.metadata:
            subscriber.metadata = merged_metadata
            updated = True
    if subscriber and updated:
        subscriber.save(update_fields=["source", "metadata"])

    return {
        "ok": True,
        "message": "You're already subscribed. Thanks for staying with us!",
        "already_subscribed": True,
    }


class NewsletterUnsubscribeIn(Schema):
    email: EmailStr


class NewsletterUnsubscribeOut(Schema):
    ok: bool
    message: str


@api.post("/newsletter/unsubscribe", response=NewsletterUnsubscribeOut)
def unsubscribe_newsletter(request, payload: NewsletterUnsubscribeIn):
    """Unsubscribe an email from the newsletter."""
    email_value = str(payload.email or "").strip().lower()
    if not email_value:
        raise HttpError(400, "Email address is required.")

    try:
        subscriber = NewsletterSubscriber.objects.filter(email=email_value).first()
        if subscriber:
            subscriber.delete()
            logger.info("Unsubscribed email: %s", email_value)
            return {
                "ok": True,
                "message": "You have been successfully unsubscribed from SkinMatch weekly skincare tips.",
            }
        else:
            # Return success even if not found (don't reveal if email exists)
            return {
                "ok": True,
                "message": "You have been successfully unsubscribed from SkinMatch weekly skincare tips.",
            }
    except Exception as exc:
        logger.exception("Error unsubscribing email %s: %s", email_value, exc)
        raise HttpError(500, "We couldn't process your unsubscribe request. Please try again soon.")


class SendTermsEmailIn(Schema):
    email: EmailStr
    terms_body: str

    @field_validator("terms_body")
    @classmethod
    def body_not_empty(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("Terms body is required.")
        return cleaned

class SendTermsEmailOut(Schema):
    ok: bool


class PasswordResetRequestIn(Schema):
    email: EmailStr


class PasswordResetRequestOut(Schema):
    ok: bool


class PasswordResetConfirmIn(Schema):
    uid: str
    token: str
    new_password: str


class PasswordResetConfirmOut(Schema):
    ok: bool

class PasswordChangeIn(Schema):
    current_password: str
    new_password: str


class PasswordChangeOut(Schema):
    ok: bool


def _stamp_last_login(user: User) -> None:
    user.last_login = timezone.localtime(timezone.now())
    user.save(update_fields=["last_login"])

# --------------- Auth endpoints ---------------

@api.get("/healthz")
def healthz(request):
    return {"status": "ok"}

@api.post("/ai/gemini/generate", response=GenOut, auth=JWTAuth())
def genai_generate(request, payload: GenIn):
    if genai is None:
        raise HttpError(503, "AI generation service is not available.")
    response_text = generate_text(payload.prompt)
    return {"response": response_text}

@api.post("/legal/send-terms", response=SendTermsEmailOut)
def send_terms_email(request, payload: SendTermsEmailIn):
    subject = "SkinMatch Terms of Service"
    from_email = getattr(settings, "DEFAULT_FROM_EMAIL", "no-reply@skinmatch.local")

    try:
        send_mail(subject, payload.terms_body, from_email, [payload.email])
    except Exception:
        logger.exception("Failed to send terms email to %s", payload.email)
        raise HttpError(500, "We couldn't send the terms right now. Please try again later.")

    return {"ok": True}

@api.post("/auth/password/forgot", response=PasswordResetRequestOut)
def password_reset_request(request, payload: PasswordResetRequestIn):
    try:
        user = User.objects.get(email__iexact=str(payload.email))
    except User.DoesNotExist:
        # Always return ok to avoid revealing which emails exist
        return {"ok": True}

    token = default_token_generator.make_token(user)
    uid = urlsafe_base64_encode(force_bytes(user.pk))
    frontend_origin = getattr(settings, "FRONTEND_ORIGIN", "http://localhost:3000").rstrip("/")
    reset_url = f"{frontend_origin}/reset-password?uid={uid}&token={token}"

    subject = "SkinMatch Password Reset"
    message = "\n".join(
        [
            "We received a request to reset your SkinMatch password.",
            "If you made this request, click the link below (or copy and paste it into your browser) to set a new password:",
            "",
            reset_url,
            "",
            "If you didn't request a password reset, you can safely ignore this email.",
            "",
            "— The SkinMatch Team",
        ]
    )
    from_email = getattr(settings, "DEFAULT_FROM_EMAIL", "SkinMatch <no-reply@skinmatch.local>")

    try:
        send_mail(subject, message, from_email, [str(payload.email)])
    except Exception:
        logger.exception("Failed to send password reset email to %s", payload.email)
        raise HttpError(500, "We couldn't send the reset link. Please try again later.")

    return {"ok": True}


@api.post("/auth/password/reset", response=PasswordResetConfirmOut)
def password_reset_confirm(request, payload: PasswordResetConfirmIn):
    try:
        uid = force_str(urlsafe_base64_decode(payload.uid))
        user = User.objects.get(pk=uid)
    except (ValueError, User.DoesNotExist, TypeError, OverflowError):
        raise HttpError(400, "Invalid or expired reset link.")

    if not default_token_generator.check_token(user, payload.token):
        raise HttpError(400, "Invalid or expired reset link.")

    try:
        validate_password(payload.new_password, user=user)
    except ValidationError as exc:
        raise HttpError(400, " ".join(exc.messages))

    user.set_password(payload.new_password)
    user.save(update_fields=["password"])

    return {"ok": True}


@api.post("/auth/password/change", response=PasswordChangeOut, auth=JWTAuth())
def password_change(request, payload: PasswordChangeIn):
    user = request.auth
    if user is None:
        raise HttpError(401, "Authentication required.")

    if not user.check_password(payload.current_password):
        raise HttpError(400, "Current password is incorrect.")

    if payload.current_password == payload.new_password:
        raise HttpError(400, "New password must be different from the current password.")

    try:
        validate_password(payload.new_password, user=user)
    except ValidationError as exc:
        raise HttpError(400, " ".join(exc.messages))

    user.set_password(payload.new_password)
    user.save(update_fields=["password"])

    return {"ok": True}

@api.post("/auth/token", response=tokenOut)
def token_login(request, payload: LoginIn):
    identifier = payload.identifier
    user_obj = (
        User.objects.filter(Q(username__iexact=identifier) | Q(email__iexact=identifier))
        .select_related("profile")
        .first()
    )
    if not user_obj:
        return {"ok": False, "message": "We couldn't find an account with that email or username."}

    user = authenticate(request, username=user_obj.get_username(), password=payload.password)
    if not user:
        return {"ok": False, "message": "The password you entered is incorrect."}
    
    _stamp_last_login(user)
    token = create_access_token(user)
    return {"ok": True, "token": token, "message": "Login successful"}

@api.post("/auth/oauth/google", response=tokenOut)
def google_login(request, payload: GoogleLoginIn):
    try:
        user, created, message = authenticate_google_id_token(payload.id_token)
    except ValueError as exc:
        return {"ok": False, "message": str(exc)}

    _stamp_last_login(user)
    token = create_access_token(user)
    return {"ok": True, "token": token, "message": message}

@api.post("/auth/signup", response=SignUpOut)
@transaction.atomic
def signup(request, payload: SignUpIn):
    # basic checks
    if payload.password != payload.confirm_password:
        return {"ok": False, "message": "Passwords do not match"}

    if not payload.accept_terms_of_service:
        return {"ok": False, "message": "You must accept the Terms of Service to create an account."}

    if not payload.accept_privacy_policy:
        return {"ok": False, "message": "You must accept the Privacy Policy to create an account."}

    # enforce uniqueness in code (case-insensitive)
    if User.objects.filter(username__iexact=payload.username).exists():
        return {"ok": False, "message": "Username already taken"}
    
    if User.objects.filter(email__iexact=str(payload.email)).exists():
        return {"ok": False, "message": "Email already in use"}
    
    # Validate password using Django's password validators
    # Create a temporary user object for validation (username/email similarity checks)
    temp_user = User(
        username=payload.username,
        email=str(payload.email),
        first_name=payload.first_name.strip(),
        last_name=payload.last_name.strip(),
    )
    try:
        validate_password(payload.password, user=temp_user)
    except ValidationError as exc:
        # Join all validation error messages
        error_message = " ".join(exc.messages)
        return {"ok": False, "message": error_message}
    
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

    acceptance_timestamp = timezone.now()
    if payload.accept_terms_of_service and profile.terms_accepted_at is None:
        profile.terms_accepted_at = acceptance_timestamp
        profile_updates.append("terms_accepted_at")

    if payload.accept_privacy_policy and profile.privacy_policy_accepted_at is None:
        profile.privacy_policy_accepted_at = acceptance_timestamp
        profile_updates.append("privacy_policy_accepted_at")

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


# --------------- Environment alerts ---------------


@api.get("/alerts/environment", response=EnvironmentAlertResponse)
def get_environment_alerts(
    request,
    latitude: float | None = None,
    longitude: float | None = None,
):
    lat, lon, inferred_label = _normalize_coordinates(latitude, longitude)

    user = None
    try:
        user = _resolve_request_user_object(request)
    except Exception as exc:  # pragma: no cover - defensive
        logger.warning("[environment] Failed to resolve request user: %s", exc)

    keywords: list[str] = []
    if user:
        try:
            keywords = _keywords_for_user(user)
        except Exception as exc:  # pragma: no cover - defensive
            logger.warning("[environment] Failed to build keywords for user %s: %s", getattr(user, "id", None), exc)

    try:
        payload = fetch_environment_alerts(
            latitude=lat,
            longitude=lon,
            keywords=keywords,
            location_label=inferred_label,
        )
    except EnvironmentServiceError as exc:
        raise HttpError(503, str(exc))
    return payload


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
def facts_by_section(request, section: str, limit: int = 12, offset: int = 0, session_id: Optional[str] = None):
    """Get topics for a specific section, optionally personalized based on COMPLETED quiz results."""
    valid_sections = {choice.value for choice in SkinFactTopic.Section}
    section_key = section.lower()
    if section_key not in valid_sections:
        raise HttpError(404, "Unknown section")

    limit = max(1, min(limit, 50))
    user = _resolve_request_user(request)
    
    # Get profile data for personalization ONLY from COMPLETED quiz sessions
    profile_data: dict | None = None
    
    # If session_id is provided (for anonymous users), use that
    if session_id:
        try:
            session_uuid = uuid.UUID(session_id)
            latest_session = (
                QuizSession.objects.filter(
                    id=session_uuid,
                    completed_at__isnull=False  # MUST be completed
                ).first()
            )
            if latest_session and isinstance(latest_session.profile_snapshot, dict):
                profile_data = latest_session.profile_snapshot
                logger.debug(f"[facts_by_section] Using completed anonymous session: {session_uuid}")
        except (ValueError, TypeError):
            logger.debug(f"[facts_by_section] Invalid session_id: {session_id}")
    
    # For logged-in users, try SkinProfile first, then fall back to latest completed session
    if not profile_data and user:
        latest_profile = (
            SkinProfile.objects.filter(user=user, is_latest=True)
            .order_by("-created_at")
            .first()
        )
        if latest_profile:
            profile_data = {
                "primary_concerns": latest_profile.primary_concerns or [],
                "secondary_concerns": latest_profile.secondary_concerns or [],
                "eye_area_concerns": latest_profile.eye_area_concerns or [],
            }
            logger.debug(f"[facts_by_section] Using SkinProfile for user {user.id}")
        else:
            latest_session = (
                QuizSession.objects.filter(
                    user=user, 
                    completed_at__isnull=False  # MUST be completed
                )
                .order_by("-completed_at", "-started_at")
                .first()
            )
            if latest_session and isinstance(latest_session.profile_snapshot, dict):
                profile_data = latest_session.profile_snapshot
                logger.debug(f"[facts_by_section] Using completed session for user {user.id}")
    
    # Base query for the section
    qs = SkinFactTopic.objects.filter(section=section_key, is_published=True)
    
    # If we have profile data from COMPLETED quiz, personalize the results
    if profile_data:
        keywords = _concern_keywords_from_profile(profile_data)
        if keywords:
            # Build keyword filter
            keyword_q = Q()
            for kw in keywords:
                keyword_q |= (
                    Q(title__icontains=kw)
                    | Q(subtitle__icontains=kw)
                    | Q(excerpt__icontains=kw)
                )
            # Get topics matching keywords first, then others
            matching = list(qs.filter(keyword_q).order_by("-updated_at", "-created_at"))
            non_matching = list(
                qs.exclude(id__in=[t.id for t in matching])
                .order_by("-view_count", "-updated_at", "-created_at")
            )
            topics = matching + non_matching
            logger.debug(f"[facts_by_section] Personalized: {len(matching)} matching, {len(non_matching)} others")
        else:
            topics = list(qs.order_by("-view_count", "-updated_at", "-created_at"))
            logger.debug(f"[facts_by_section] No keywords, using default order")
    else:
        # No completed quiz, just order by popularity
        topics = list(qs.order_by("-view_count", "-updated_at", "-created_at"))
        logger.debug(f"[facts_by_section] No completed quiz, using popularity order")
    
    # Apply pagination
    paginated = topics[offset : offset + limit]
    return [_serialize_fact_topic_summary(topic, request) for topic in paginated]


@api.get("/facts/topics/recommended", response=List[FactTopicSummary])
def recommended_facts(request, limit: int = 4, session_id: Optional[str] = None):
    """Personalized Skin Facts based on COMPLETED quiz only.
    
    Works for both authenticated and anonymous users.
    For anonymous users, pass session_id to get recommendations based on their completed quiz.
    Returns empty list if no completed quiz found (frontend will show fallback).
    """
    user = _resolve_request_user(request)
    limit = max(1, min(limit, 8))
    
    logger.debug(f"[recommended_facts] user={user}, session_id={session_id}, limit={limit}")

    # Get profile data from COMPLETED quiz session only
    profile_data: dict | None = None
    latest_session: QuizSession | None = None
    
    # If session_id is provided (for anonymous users), use that
    if session_id:
        try:
            session_uuid = uuid.UUID(session_id)
            latest_session = (
                QuizSession.objects.filter(
                    id=session_uuid,
                    completed_at__isnull=False  # MUST be completed
                ).first()
            )
            if latest_session and isinstance(latest_session.profile_snapshot, dict):
                profile_data = latest_session.profile_snapshot
                logger.debug(f"[recommended_facts] Found completed anonymous session: {session_uuid}")
        except (ValueError, TypeError):
            logger.debug(f"[recommended_facts] Invalid session_id: {session_id}")
    
    # For logged-in users, get their latest COMPLETED session
    if not profile_data and user:
        # Try to get from SkinProfile (persisted profile with is_latest=True)
        latest_profile = (
            SkinProfile.objects.filter(user=user, is_latest=True)
            .order_by("-created_at")
            .first()
        )
        if latest_profile:
            profile_data = {
                "primary_concerns": latest_profile.primary_concerns or [],
                "secondary_concerns": latest_profile.secondary_concerns or [],
                "eye_area_concerns": latest_profile.eye_area_concerns or [],
            }
            logger.debug(f"[recommended_facts] Using SkinProfile for user {user.id}")
        else:
            # Fall back to latest completed session's profile_snapshot
            latest_session = (
                QuizSession.objects.filter(
                    user=user, 
                    completed_at__isnull=False  # MUST be completed
                )
                .order_by("-completed_at", "-started_at")
                .first()
            )
            if latest_session and isinstance(latest_session.profile_snapshot, dict):
                profile_data = latest_session.profile_snapshot
                logger.debug(f"[recommended_facts] Using completed session for user {user.id}")

    # If no completed quiz found, return empty list
    if not profile_data:
        logger.debug("[recommended_facts] No completed quiz found, returning empty list")
        return []

    # Extract keywords from profile
    keywords: list[str] = _concern_keywords_from_profile(profile_data)
    logger.debug(f"[recommended_facts] Extracted keywords: {keywords[:10]}")

    if not keywords:
        logger.debug("[recommended_facts] No keywords extracted, returning empty list")
        return []

    # Base query for published topics
    qs = SkinFactTopic.objects.filter(is_published=True)

    # Build Q filter for keywords (title, subtitle, excerpt)
    keyword_q = Q()
    for kw in keywords:
        keyword_q |= (
            Q(title__icontains=kw)
            | Q(subtitle__icontains=kw)
            | Q(excerpt__icontains=kw)
        )

    # Filter topics by keywords
    filtered = qs.filter(keyword_q)

    if not filtered.exists():
        logger.debug("[recommended_facts] No topics matched keywords")
        return []

    # Get user's viewing history to avoid showing already-viewed topics
    viewed_ids = []
    if user:
        viewed_ids = list(
            SkinFactView.objects.filter(user=user).values_list("topic_id", flat=True)
        )

    # Prefer different sections for diversity (max 2 per section)
    ordered = (
        filtered.annotate()
        .order_by(
            Case(
                When(section=SkinFactTopic.Section.INGREDIENT_SPOTLIGHT, then=0),
                When(section=SkinFactTopic.Section.KNOWLEDGE, then=1),
                When(section=SkinFactTopic.Section.FACT_CHECK, then=2),
                When(section=SkinFactTopic.Section.TRENDING, then=3),
                default=4,
                output_field=IntegerField(),
            ),
            "-updated_at",
            "-view_count",
        )
    )

    # Fetch topics
    topics = list(ordered[: limit * 3])  # overfetch for diversity filtering

    # Apply section diversity: max 2 topics per section
    def score_topic(t: SkinFactTopic) -> tuple[int, int, int]:
        """Score for sorting: (viewed_penalty, section_rank, -view_count)"""
        section_rank = {
            SkinFactTopic.Section.INGREDIENT_SPOTLIGHT: 0,
            SkinFactTopic.Section.KNOWLEDGE: 1,
            SkinFactTopic.Section.FACT_CHECK: 2,
            SkinFactTopic.Section.TRENDING: 3,
        }.get(t.section, 4)
        
        viewed_penalty = 1 if t.id in viewed_ids else 0
        return (viewed_penalty, section_rank, -t.view_count)

    topics.sort(key=score_topic)
    
    # Pick topics with section diversity
    picked = []
    seen_ids = set()
    section_counts = {}
    
    for t in topics:
        if t.id in seen_ids:
            continue
        
        # Limit to 2 topics per section for diversity
        section_count = section_counts.get(t.section, 0)
        if section_count >= 2:
            continue
        
        seen_ids.add(t.id)
        section_counts[t.section] = section_count + 1
        picked.append(t)
        
        if len(picked) >= limit:
            break

    # If we still need more after section limits, add remaining topics
    if len(picked) < limit:
        for t in topics:
            if t.id not in seen_ids:
                picked.append(t)
                seen_ids.add(t.id)
                if len(picked) >= limit:
                    break

    logger.debug(f"[recommended_facts] Returning {len(picked)} topics")
    return [_serialize_fact_topic_summary(topic, request) for topic in picked]


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
    hero_url = _resolve_media_url(request, topic.hero_image)
    if not hero_url:
        hero_url = _build_placeholder_image(topic.title)
    logger.debug("[Hero Image Detail] %s: %s", topic.title, hero_url)

    return FactTopicDetailOut(
        id=topic.id,
        slug=topic.slug,
        title=topic.title,
        subtitle=topic.subtitle or None,
        excerpt=topic.excerpt or None,
        section=topic.section,
        hero_image_url=hero_url,
        hero_image_alt=topic.hero_image_alt or None,
        view_count=topic.view_count,
        updated_at=topic.updated_at,
        content_blocks=blocks,
    )


def _build_placeholder_image(title: str) -> str:
    """Fallback placeholder image shown when no hero image exists."""
    safe_title = (title or "SkinMatch").strip() or "SkinMatch"
    text = quote(safe_title[:20])
    return f"https://placehold.co/600x400/e5e5e5/666666?text={text}"


def _serialize_fact_topic_summary(topic: SkinFactTopic, request) -> FactTopicSummary:
    hero_url = _resolve_media_url(request, topic.hero_image)
    if not hero_url:
        hero_url = _build_placeholder_image(topic.title)
    logger.debug("[Hero Image] %s: %s", topic.title, hero_url)

    return FactTopicSummary(
        id=topic.id,
        slug=topic.slug,
        title=topic.title,
        subtitle=topic.subtitle or None,
        excerpt=topic.excerpt or None,
        section=topic.section,
        hero_image_url=hero_url,
        hero_image_alt=topic.hero_image_alt or None,
        view_count=topic.view_count,
    )


def _serialize_fact_block(block: SkinFactContentBlock, request) -> FactContentBlockOut:
    """Serialize a content block - either text or image"""
    return FactContentBlockOut(
        order=block.order,
        content=block.content or None,
        image_url=_resolve_media_url(request, block.image) if block.image else None,
        image_alt=block.image_alt or None,
    )


def _resolve_media_url(request, image_field) -> Optional[str]:
    """Resolve media URL for use by the frontend, handling local dev rewrites."""
    if not image_field:
        return None

    try:
        relative_url = image_field.url  # e.g. "/media/facts/hero/myimg.jpg"
    except (ValueError, AttributeError):
        return None

    if not relative_url:
        return None

    if relative_url.startswith(("http://", "https://")):
        return relative_url

    relative = relative_url if relative_url.startswith("/") else f"/{relative_url}"
    backend_base = getattr(settings, "BACKEND_URL", None)

    absolute = None
    if request:
        try:
            absolute = request.build_absolute_uri(relative)
        except Exception:  # pragma: no cover - defensive guard
            absolute = None

    if not absolute and backend_base:
        absolute = f"{backend_base.rstrip('/')}{relative}"

    return absolute or relative


# ------------------------------------------------------------------------------------

# ----------------------------- Wishlist ---------------------------------------------

class WishlistAddIn(Schema):
    product_id: uuid.UUID


class WishlistMutationOut(Schema):
    ok: bool
    status: str


class WishlistProductOut(Schema):
    id: uuid.UUID
    slug: str
    name: str
    brand: str
    category: str
    price: float
    currency: str
    image: str | None = None
    product_url: str | None = None
    saved_at: datetime


def _serialize_wishlist_item(item: WishlistItem) -> dict:
    p: Product = item.product
    return {
        "id": p.id,
        "slug": p.slug,
        "name": p.name,
        "brand": p.brand,
        "category": p.category,
        "price": float(p.price or 0),
        "currency": p.currency,
        "image": p.image or None,
        "product_url": p.product_url or None,
        "saved_at": item.created_at,
    }


@api.get("/wishlist", response=List[WishlistProductOut], auth=JWTAuth())
def list_wishlist(request, limit: int = 100, offset: int = 0):
    user: User = request.auth
    limit = max(1, min(limit, 200))
    qs = (
        WishlistItem.objects
        .select_related("product")
        .filter(user=user, product__is_active=True)
        .order_by("-created_at")
    )
    items = list(qs[offset: offset + limit])
    return [_serialize_wishlist_item(it) for it in items]


@api.post("/wishlist/add", response=WishlistMutationOut, auth=JWTAuth())
def add_to_wishlist(request, payload: WishlistAddIn):
    user: User = request.auth
    try:
        product = Product.objects.get(id=payload.product_id, is_active=True)
    except Product.DoesNotExist:
        raise HttpError(404, "Product not found")

    obj, created = WishlistItem.objects.get_or_create(user=user, product=product)
    return {"ok": True, "status": "added" if created else "already_saved"}


@api.delete("/wishlist/{product_id}", response=WishlistMutationOut, auth=JWTAuth())
def remove_from_wishlist(request, product_id: uuid.UUID):
    user: User = request.auth
    try:
        item = WishlistItem.objects.select_related("product").get(user=user, product_id=product_id)
    except WishlistItem.DoesNotExist:
        return {"ok": True, "status": "not_present"}

    item.delete()
    return {"ok": True, "status": "removed"}


def _normalize_coordinates(
    latitude: float | None,
    longitude: float | None,
) -> tuple[float, float, str | None]:
    lat = latitude if latitude is not None else DEFAULT_LATITUDE
    lon = longitude if longitude is not None else DEFAULT_LONGITUDE
    if not (-90 <= lat <= 90):
        raise HttpError(400, "Latitude must be between -90 and 90 degrees.")
    if not (-180 <= lon <= 180):
        raise HttpError(400, "Longitude must be between -180 and 180 degrees.")
    label = DEFAULT_LOCATION_LABEL if latitude is None and longitude is None else None
    return lat, lon, label


def _resolve_request_user_object(request):
    user = getattr(request, "user", None)
    if user and getattr(user, "is_authenticated", False):
        return user
    auth_header = ""
    if hasattr(request, "headers"):
        auth_header = request.headers.get("Authorization", "") or ""
    if not auth_header and hasattr(request, "META"):
        auth_header = request.META.get("HTTP_AUTHORIZATION", "") or ""
    if auth_header.lower().startswith("bearer "):
        token = auth_header[7:].strip()
        data = decode_token(token)
        if data and data.get("user_id"):
            try:
                return User.objects.get(id=data["user_id"])
            except User.DoesNotExist:
                return None
    return None


def _keywords_for_user(user) -> list[str]:
    if not user:
        return []
    profile = (
        SkinProfile.objects.filter(user=user, is_latest=True)
        .order_by("-created_at")
        .first()
    )
    if not profile:
        return []
    profile_data = {
        "primary_concerns": profile.primary_concerns or [],
        "secondary_concerns": profile.secondary_concerns or [],
        "eye_area_concerns": profile.eye_area_concerns or [],
    }
    return _concern_keywords_from_profile(profile_data)

def _concern_keywords_from_profile(profile_data: dict) -> list[str]:
    """Very small heuristic mapping of concerns to ingredient/keyword hints."""
    concerns: list[str] = []
    if not isinstance(profile_data, dict):
        return concerns
    for key in ("primary_concerns", "secondary_concerns", "eye_area_concerns"):
        values = profile_data.get(key) or []
        if isinstance(values, list):
            concerns.extend([str(v).strip().lower() for v in values if v])

    unique = list(dict.fromkeys(concerns))  # preserve order, drop dups

    # Map concerns to ingredient keywords we may find in topic titles/subtitles
    mapping: dict[str, list[str]] = {
        "acne": ["salicylic", "bha", "azelaic", "niacinamide", "benzoyl"],
        "blemishes": ["azelaic", "niacinamide", "bha", "salicylic"],
        "oil": ["niacinamide", "salicylic", "bha", "clay"],
        "oily": ["niacinamide", "salicylic", "bha"],
        "dry": ["hyaluronic", "ceramide", "squalane", "glycerin"],
        "dehydrated": ["hyaluronic", "glycerin", "panthenol"],
        "pigmentation": ["vitamin c", "tranexamic", "azelaic", "niacinamide"],
        "dark spots": ["vitamin c", "tranexamic", "azelaic"],
        "melasma": ["tranexamic", "azelaic", "vitamin c"],
        "redness": ["centella", "azelaic", "allantoin", "green tea"],
        "sensitive": ["ceramide", "allantoin", "panthenol", "centella"],
        "aging": ["retinol", "peptide", "bakuchiol", "vitamin c"],
        "wrinkles": ["retinol", "peptide", "bakuchiol"],
        "barrier": ["ceramide", "squalane", "panthenol"],
    }

    keywords: list[str] = []
    for c in unique:
        for k, vals in mapping.items():
            if k in c:
                keywords.extend(vals)
    # if nothing matched, provide broad helpful defaults
    if not keywords:
        keywords = ["hyaluronic", "niacinamide", "vitamin c", "ceramide"]
    # dedupe, keep order
    return list(dict.fromkeys([kw.lower() for kw in keywords]))


api_urlpatterns = api.urls
@api.get("/facts/topics/recommended", response=List[FactTopicSummary])
def recommended_facts(request, limit: int = 4, session_id: Optional[str] = None):
    """Personalized Skin Facts based on COMPLETED quiz only.
    
    Works for both authenticated and anonymous users.
    For anonymous users, pass session_id to get recommendations based on their completed quiz.
    Returns empty list if no completed quiz found (frontend will show fallback).
    """
    user = _resolve_request_user(request)
    limit = max(1, min(limit, 8))
    
    logger.debug(f"[recommended_facts] user={user}, session_id={session_id}, limit={limit}")

    # Get profile data from COMPLETED quiz session only
    profile_data: dict | None = None
    latest_session: QuizSession | None = None
    
    # If session_id is provided (for anonymous users), use that
    if session_id:
        try:
            session_uuid = uuid.UUID(session_id)
            latest_session = (
                QuizSession.objects.filter(
                    id=session_uuid,
                    completed_at__isnull=False  # MUST be completed
                ).first()
            )
            if latest_session and isinstance(latest_session.profile_snapshot, dict):
                profile_data = latest_session.profile_snapshot
                logger.debug(f"[recommended_facts] Found completed anonymous session: {session_uuid}")
        except (ValueError, TypeError):
            logger.debug(f"[recommended_facts] Invalid session_id: {session_id}")
    
    # For logged-in users, get their latest COMPLETED session
    if not profile_data and user:
        # Try to get from SkinProfile (persisted profile with is_latest=True)
        latest_profile = (
            SkinProfile.objects.filter(user=user, is_latest=True)
            .order_by("-created_at")
            .first()
        )
        if latest_profile:
            profile_data = {
                "primary_concerns": latest_profile.primary_concerns or [],
                "secondary_concerns": latest_profile.secondary_concerns or [],
                "eye_area_concerns": latest_profile.eye_area_concerns or [],
            }
            logger.debug(f"[recommended_facts] Using SkinProfile for user {user.id}")
        else:
            # Fall back to latest completed session's profile_snapshot
            latest_session = (
                QuizSession.objects.filter(
                    user=user, 
                    completed_at__isnull=False  # MUST be completed
                )
                .order_by("-completed_at", "-started_at")
                .first()
            )
            if latest_session and isinstance(latest_session.profile_snapshot, dict):
                profile_data = latest_session.profile_snapshot
                logger.debug(f"[recommended_facts] Using completed session for user {user.id}")

    # If no completed quiz found, return empty list
    if not profile_data:
        logger.debug("[recommended_facts] No completed quiz found, returning empty list")
        return []

    # Extract keywords from profile
    keywords: list[str] = _concern_keywords_from_profile(profile_data)
    logger.debug(f"[recommended_facts] Extracted keywords: {keywords[:10]}")

    if not keywords:
        logger.debug("[recommended_facts] No keywords extracted, returning empty list")
        return []

    # Base query for published topics
    qs = SkinFactTopic.objects.filter(is_published=True)

    # Build Q filter for keywords (title, subtitle, excerpt)
    keyword_q = Q()
    for kw in keywords:
        keyword_q |= (
            Q(title__icontains=kw)
            | Q(subtitle__icontains=kw)
            | Q(excerpt__icontains=kw)
        )

    # Filter topics by keywords
    filtered = qs.filter(keyword_q)

    if not filtered.exists():
        logger.debug("[recommended_facts] No topics matched keywords")
        return []

    # Get user's viewing history to avoid showing already-viewed topics
    viewed_ids = []
    if user:
        viewed_ids = list(
            SkinFactView.objects.filter(user=user).values_list("topic_id", flat=True)
        )

    # Prefer different sections for diversity (max 2 per section)
    ordered = (
        filtered.annotate()
        .order_by(
            Case(
                When(section=SkinFactTopic.Section.INGREDIENT_SPOTLIGHT, then=0),
                When(section=SkinFactTopic.Section.KNOWLEDGE, then=1),
                When(section=SkinFactTopic.Section.FACT_CHECK, then=2),
                When(section=SkinFactTopic.Section.TRENDING, then=3),
                default=4,
                output_field=IntegerField(),
            ),
            "-updated_at",
            "-view_count",
        )
    )

    # Fetch topics
    topics = list(ordered[: limit * 3])  # overfetch for diversity filtering

    # Apply section diversity: max 2 topics per section
    def score_topic(t: SkinFactTopic) -> tuple[int, int, int]:
        """Score for sorting: (viewed_penalty, section_rank, -view_count)"""
        section_rank = {
            SkinFactTopic.Section.INGREDIENT_SPOTLIGHT: 0,
            SkinFactTopic.Section.KNOWLEDGE: 1,
            SkinFactTopic.Section.FACT_CHECK: 2,
            SkinFactTopic.Section.TRENDING: 3,
        }.get(t.section, 4)
        
        viewed_penalty = 1 if t.id in viewed_ids else 0
        return (viewed_penalty, section_rank, -t.view_count)

    topics.sort(key=score_topic)
    
    # Pick topics with section diversity
    picked = []
    seen_ids = set()
    section_counts = {}
    
    for t in topics:
        if t.id in seen_ids:
            continue
        
        # Limit to 2 topics per section for diversity
        section_count = section_counts.get(t.section, 0)
        if section_count >= 2:
            continue
        
        seen_ids.add(t.id)
        section_counts[t.section] = section_count + 1
        picked.append(t)
        
        if len(picked) >= limit:
            break

    # If we still need more after section limits, add remaining topics
    if len(picked) < limit:
        for t in topics:
            if t.id not in seen_ids:
                picked.append(t)
                seen_ids.add(t.id)
                if len(picked) >= limit:
                    break

    logger.debug(f"[recommended_facts] Returning {len(picked)} topics")
    return [_serialize_fact_topic_summary(topic, request) for topic in picked]
