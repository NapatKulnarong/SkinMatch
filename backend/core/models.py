import uuid

from datetime import date
from typing import Optional, Any
from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.validators import FileExtensionValidator, validate_email
from django.db import models
from django.db.models import F, Q
from django.utils import timezone
from .validators import validate_fact_image_size, validate_image_mime_type

# Create your models here.
class UserProfile(models.Model):
    """
    Extension of the built-in Django User model
    Stores additional profile info specific to SkinMatch
    """
    class Gender(models.TextChoices):
        FEMALE = "female", "Female"
        MALE = "male", "Male"
        PREFER_NOT = "prefer_not", "Prefer not to say"

    class Role(models.TextChoices):
        ADMIN = "admin", "Administrator"
        STAFF = "staff", "Staff"
        READ_ONLY = "read_only", "Read-only"
        MEMBER = "member", "Member"
    
    u_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(settings.AUTH_USER_MODEL, 
                                on_delete=models.CASCADE, 
                                related_name="profile",
                                db_index=True)
    
    #profile info (separate from auth_user)
    avatar_url = models.URLField(blank=True) # optional profile pic
    date_of_birth = models.DateField(null=True, blank=True) # dd/mm/yyyy
    gender = models.CharField(max_length=20, choices=Gender.choices, null=True, blank=True)
    role = models.CharField(
        max_length=32,
        choices=Role.choices,
        default=Role.MEMBER,
        db_index=True,
        help_text="RBAC role used for staff/admin protections."
    )
    is_verified = models.BooleanField(default=False)
    google_sub = models.CharField(max_length=64, null=True, blank=True, unique=True)

    #audit
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "User Profile"
        verbose_name_plural = "User Profiles"
        indexes = [
            models.Index(fields=["user"]),
            ]
    
    def __str__(self):
        # works for default auth_user and custom
        base = getattr(self.user, "username", None) or getattr(self.user, "email", "user")
        return f"Profile of {base}"
    
    @property
    def age(self) -> Optional[int]:
        if not self.date_of_birth:
            return None
        today = date.today()
        years = today.year - self.date_of_birth.year
        if (today.month, today.day) < (self.date_of_birth.month, self.date_of_birth.day):
            years -= 1
        return years
    
    @property
    def full_name(self):
        n = f"{self.user.first_name} {self.user.last_name}".strip()
        return n or self.user.username

    def has_role(self, *roles: str) -> bool:
        """
        Convenience helper for RBAC checks.
        """
        if not roles:
            return False
        try:
            current = (self.role or "").lower()
        except AttributeError:
            return False
        return current in {r.lower() for r in roles}
    

class SkinProfile(models.Model):
    """Stores an immutable snapshot of a quiz result for a user."""

    class SkinType(models.TextChoices):
        NORMAL = "normal", "Normal"
        OILY = "oily", "Oily"
        DRY = "dry", "Dry"
        COMBINATION = "combination", "Combination"

    class Sensitivity(models.TextChoices):
        YES = "yes", "Yes"
        SOMETIMES = "sometimes", "Sometimes"
        NO = "no", "No"

    class Budget(models.TextChoices):
        AFFORDABLE = "affordable", "Affordable"
        MID_RANGE = "mid", "Mid-range"
        PREMIUM = "premium", "Premium / luxury"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="skin_profiles",
        db_index=True,
    )
    session = models.OneToOneField(
        "quiz.QuizSession",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="result_profile",
    )

    primary_concerns = models.JSONField(default=list, blank=True)
    secondary_concerns = models.JSONField(default=list, blank=True)
    eye_area_concerns = models.JSONField(default=list, blank=True)
    skin_type = models.CharField(
        max_length=20,
        choices=SkinType.choices,
        blank=True,
    )
    sensitivity = models.CharField(
        max_length=12,
        choices=Sensitivity.choices,
        blank=True,
    )
    pregnant_or_breastfeeding = models.BooleanField(null=True, blank=True)
    ingredient_restrictions = models.JSONField(default=list, blank=True)
    budget = models.CharField(
        max_length=12,
        choices=Budget.choices,
        blank=True,
    )

    answer_snapshot = models.JSONField(default=dict, blank=True)
    result_summary = models.JSONField(default=dict, blank=True)
    score_version = models.CharField(max_length=20, default="v1")
    is_latest = models.BooleanField(default=True, db_index=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("-created_at",)
        indexes = [
            models.Index(fields=["user", "created_at"]),
            models.Index(fields=["user", "is_latest"]),
        ]

    def __str__(self):
        part = self.primary_concerns[:1] if isinstance(self.primary_concerns, list) else []
        concern = part[0] if part else "profile"
        return f"{self.user} – {concern} ({self.created_at:%d/%m/%Y})"


class SkinFactTopic(models.Model):
    """Curated educational content surfaced on the Skin Facts page."""

    class Section(models.TextChoices):
        KNOWLEDGE = "knowledge", "Skin Knowledge"
        TRENDING = "trending", "Trending Skincare"
        FACT_CHECK = "fact_check", "Fact Check"
        INGREDIENT_SPOTLIGHT = "ingredient_spotlight", "Ingredient Spotlight"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    slug = models.SlugField(max_length=140, unique=True)
    title = models.CharField(max_length=180)
    subtitle = models.CharField(max_length=220, blank=True)
    excerpt = models.CharField(max_length=240, blank=True)
    section = models.CharField(max_length=20, choices=Section.choices)
    hero_image = models.ImageField(
        upload_to="facts/hero/",
        validators=[
            FileExtensionValidator(["jpg", "jpeg", "png", "webp", "avif"]),
            validate_image_mime_type,
            validate_fact_image_size,
        ],
        blank=True,
        help_text="Supported formats: JPG, PNG, WebP, AVIF. WebP and AVIF provide better compression and quality."
    )
    hero_image_alt = models.CharField(max_length=160, blank=True)
    is_published = models.BooleanField(default=True, db_index=True)
    view_count = models.PositiveIntegerField(default=0, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    last_updated = models.DateField(
        default=timezone.now,
        help_text="When this topic was last reviewed / fact-checked for accuracy."
    )
    

    class Meta:
        ordering = ("-created_at",)
        indexes = [
            models.Index(fields=["section", "is_published"]),
            models.Index(fields=["view_count"]),
        ]

    def __str__(self) -> str:
        return self.title

    def increment_view_count(self):
        type(self).objects.filter(pk=self.pk).update(view_count=F("view_count") + 1)
        self.refresh_from_db(fields=["view_count"])


class SkinFactContentBlock(models.Model):
    """
    Simplified content blocks for SkinFactTopic.
    Each block is EITHER:
    - A markdown text block (content field)
    - OR an image block (image + image_alt fields)
    
    Blocks are ordered to create the article structure.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    topic = models.ForeignKey(
        SkinFactTopic,
        on_delete=models.CASCADE,
        related_name="content_blocks",
    )

    # Controls order in the article
    order = models.PositiveIntegerField(
        default=0,
        help_text="Display order, starting from 0. Lower = appears earlier."
    )

    # Content field: markdown text (use this OR image, not both)
    content = models.TextField(
        blank=True,
        help_text="Markdown content for text blocks. Supports headings (# ## ###), lists, links, bold (**text**), italic (*text*). Leave empty if this is an image block."
    )

    # Image field: use this OR content, not both
    image = models.ImageField(
        upload_to="facts/blocks/",
        blank=True,
        null=True,
        validators=[
            FileExtensionValidator(["jpg", "jpeg", "png", "webp", "avif"]),
            validate_image_mime_type,
            validate_fact_image_size,
        ],
        help_text="Image for image blocks. Supported formats: JPG, PNG, WebP, AVIF. Leave empty if this is a text block."
    )

    image_alt = models.CharField(
        max_length=160,
        blank=True,
        help_text="Required if image is provided. Describe the image for accessibility."
    )

    class Meta:
        ordering = ("order",)

    def __str__(self) -> str:
        if self.content:
            preview = self.content[:50]
            if len(self.content) > 50:
                preview += "..."
            return f"[{self.order}] Text: {preview}"
        elif self.image:
            return f"[{self.order}] Image: {self.image_alt or '(no alt text)'}"
        return f"[{self.order}] (empty)"

    def clean(self):
        """Validate that block has either content OR image, but not both"""
        super().clean()
        
        has_content = bool((self.content or "").strip())
        has_image = bool(self.image)
        
        if not has_content and not has_image:
            raise ValidationError("Block must have either content (text) or an image. Choose one.")
        
        if has_content and has_image:
            raise ValidationError("Block cannot have both content and image. Choose either text OR image.")

        if has_image and not (self.image_alt or "").strip():
            raise ValidationError("Please provide image alt text for accessibility when using an image block.")


class SkinFactView(models.Model):
    """Tracks which topics a user has opened to power personalised popular topics."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    topic = models.ForeignKey(
        SkinFactTopic, on_delete=models.CASCADE, related_name="views"
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="skin_fact_views",
        null=True,
        blank=True,
    )
    anonymous_key = models.CharField(
        max_length=64, blank=True, help_text="Best-effort identifier for anonymous sessions."
    )
    viewed_at = models.DateTimeField(default=timezone.now, db_index=True)

    class Meta:
        indexes = [
            models.Index(fields=["user", "viewed_at"]),
            models.Index(fields=["topic", "viewed_at"]),
        ]

    def save(self, *args, **kwargs):
        is_new = self._state.adding
        super().save(*args, **kwargs)
        if is_new:
            SkinFactTopic.objects.filter(id=self.topic_id).update(
                view_count=F("view_count") + 1
            )


class NewsletterSubscriber(models.Model):
    """Stores marketing email opt-ins."""

    email = models.EmailField(unique=True)
    source = models.CharField(
        max_length=80,
        blank=True,
        help_text="Where the opt-in originated, e.g. 'homepage', 'quiz_result'.",
    )
    metadata = models.JSONField(default=dict, blank=True)
    subscribed_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ("-subscribed_at",)
        indexes = [
            models.Index(fields=["subscribed_at"]),
        ]

    def __str__(self) -> str:
        return f"{self.email} ({self.subscribed_at:%Y-%m-%d})"

    def clean(self) -> None:
        if self.email:
            normalised = self.email.strip().lower()
            validate_email(normalised)
            self.email = normalised

    def save(self, *args: Any, **kwargs: Any) -> None:
        self.clean()
        super().save(*args, **kwargs)


class WishlistItem(models.Model):
    """User wishlist entry for a quiz.Product."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="wishlist_items",
        db_index=True,
    )
    product = models.ForeignKey(
        "quiz.Product",
        on_delete=models.CASCADE,
        related_name="wishlisted_by",
        db_index=True,
    )
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ("-created_at",)
        constraints = [
            models.UniqueConstraint(fields=["user", "product"], name="uniq_user_product_wishlist")
        ]
        indexes = [
            models.Index(fields=["user", "created_at"]),
            models.Index(fields=["product", "created_at"]),
        ]

    def __str__(self) -> str:
        return f"{self.user} - {getattr(self.product, 'name', 'product')}"
