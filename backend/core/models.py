import uuid

from datetime import date
from typing import Optional, Any
from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.validators import FileExtensionValidator, validate_email
from django.db import models
from django.db.models import F, Q
from django.utils import timezone

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
    
    u_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(settings.AUTH_USER_MODEL, 
                                on_delete=models.CASCADE, 
                                related_name="profile",
                                db_index=True)
    
    #profile info (separate from auth_user)
    avatar_url = models.URLField(blank=True) # optional profile pic
    date_of_birth = models.DateField(null=True, blank=True) # dd/mm/yyyy
    gender = models.CharField(max_length=20, choices=Gender.choices, null=True, blank=True)
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
        validators=[FileExtensionValidator(["jpg", "jpeg", "png"])],
        blank=True,
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
    Ordered content blocks that make up the body of a SkinFactTopic.
    Each block can be:
    - a section heading like "What Is Hyaluronic Acid?"
    - a normal text paragraph
    - a text section with an accompanying image
    do NOT force it to be only-image or only-text. The editor can mix.
    """

    class BlockType(models.TextChoices):
        HEADING = "heading", "Heading / Section Title"
        TEXT = "text", "Text Section"
        PARAGRAPH = "paragraph", "Paragraph"
        IMAGE = "image", "Image + Text"

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

    # heading vs text
    block_type = models.CharField(
        max_length=20,
        choices=BlockType.choices,
        help_text="Use 'heading' for section headers, 'text' for normal explanatory content."
    )

    # Shown as block title in UI
    heading = models.CharField(
        max_length=180,
        blank=True,
        help_text="Small heading/title for this block, e.g. 'How to Use Hyaluronic Acid Effectively'."
    )

    # The actual paragraph(s)
    text = models.TextField(
        blank=True,
        help_text="Main body text (3–6 sentences)."
    )

    # Optional supporting image
    image = models.ImageField(
        upload_to="facts/blocks/",
        blank=True,
        null=True,
        validators=[FileExtensionValidator(["jpg", "jpeg", "png"])],
        help_text="Optional. Example: serum texture, hydrated skin close-up."
    )

    image_alt = models.CharField(
        max_length=160,
        blank=True,
        help_text="Describe the image for accessibility. Example: 'Transparent serum drop with bubbles'."
    )

    class Meta:
        ordering = ("order",)

    def __str__(self) -> str:
        # Helpful in admin list/dropdowns
        if self.heading:
            return f"[{self.order}] {self.heading}"
        return f"[{self.order}] {self.get_block_type_display()} block"

    def clean(self):
        """
        Custom validation that actually matches what you're doing in admin:
        - 'heading' blocks MUST have heading, can have optional text/image
        - 'text' blocks MUST have text; heading/image are optional
        """
        super().clean()

        block_type = self.block_type
        if self.block_type == self.BlockType.HEADING:
            if not (self.heading or "").strip():
                raise ValidationError("Heading blocks must have a heading title.")

        if self.block_type == self.BlockType.TEXT:
            if not (self.text or "").strip():
                raise ValidationError("Text blocks must include body text.")
         # image validation (only check file type, not dimensions)
        if self.image and not (self.image_alt or "").strip():
            raise ValidationError("Please provide image alt text for accessibility.")


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
