import uuid
from decimal import Decimal, ROUND_HALF_UP

from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.db.models import Avg, Count
from django.utils import timezone


class SkinConcern(models.Model):
    """Lookup table for targeted skin concerns (e.g., acne, redness)."""

    key = models.SlugField(primary_key=True, max_length=60)
    name = models.CharField(max_length=120, unique=True)
    description = models.TextField(blank=True)

    class Meta:
        ordering = ["name"]

    def __str__(self) -> str:
        return self.name


class SkinTypeTag(models.Model):
    """Lookup for supported skin types."""

    key = models.SlugField(primary_key=True, max_length=30)
    name = models.CharField(max_length=40, unique=True)

    class Meta:
        ordering = ["name"]

    def __str__(self) -> str:
        return self.name


class RestrictionTag(models.Model):
    """Compliance or preference tags (e.g., vegan, fragrance-free)."""

    key = models.SlugField(primary_key=True, max_length=40)
    name = models.CharField(max_length=80, unique=True)

    class Meta:
        ordering = ["name"]

    def __str__(self) -> str:
        return self.name


class Ingredient(models.Model):
    """Ingredient glossary."""

    key = models.SlugField(primary_key=True, max_length=80)
    common_name = models.CharField(max_length=120, unique=True)
    inci_name = models.CharField(max_length=200, blank=True)
    benefits = models.TextField(blank=True)
    helps_with = models.TextField(
        blank=True,
        help_text="Free-form notes describing what this ingredient is known for helping.",
    )
    avoid_with = models.TextField(
        blank=True,
        help_text="List ingredients or product types to avoid combining with this ingredient.",
    )
    side_effects = models.TextField(
        blank=True,
        help_text="Potential concerns, side effects, or usage notes for this ingredient.",
    )

    class Meta:
        ordering = ["common_name"]

    def __str__(self) -> str:
        return self.common_name


class Product(models.Model):
    """Core product catalog entry."""

    class Category(models.TextChoices):
        CLEANSER = "cleanser", "Cleanser"
        TONER = "toner", "Toner"
        ESSENCE = "essence", "Essence"
        SERUM = "serum", "Serum"
        MOISTURIZER = "moisturizer", "Moisturizer"
        MASK = "mask", "Mask"
        SUNSCREEN = "sunscreen", "Sunscreen"
        TREATMENT = "treatment", "Treatment"
        OIL = "oil", "Oil"
        MIST = "mist", "Mist"
        BALM = "balm", "Balm"
        OTHER = "other", "Other"

    class Currency(models.TextChoices):
        USD = "USD", "USD"
        KRW = "KRW", "KRW"
        JPY = "JPY", "JPY"
        EUR = "EUR", "EUR"
        THB = "THB", "THB"

    class Origin(models.TextChoices):
        SOUTH_KOREA = "KR", "South Korea"
        JAPAN = "JP", "Japan"
        UNITED_STATES = "US", "United States"
        FRANCE = "FR", "France"
        UNITED_KINGDOM = "GB", "United Kingdom"
        CANADA = "CA", "Canada"
        THAI = "TH", "Thailand"
        CHINA = "CH", "China"
        OTHER = "OT", "Other"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    slug = models.SlugField(max_length=120, unique=True)
    name = models.CharField(max_length=180)
    brand = models.CharField(max_length=120, db_index=True)
    origin_country = models.CharField(max_length=4, choices=Origin.choices)
    category = models.CharField(max_length=30, choices=Category.choices)
    summary = models.CharField(max_length=300, blank=True)
    description = models.TextField(blank=True)
    hero_ingredients = models.CharField(max_length=300, blank=True)
    price = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal("0"))
    currency = models.CharField(max_length=3, choices=Currency.choices, default=Currency.USD)
    rating = models.DecimalField(max_digits=3, decimal_places=2, null=True, blank=True)
    review_count = models.PositiveIntegerField(default=0)
    image = models.TextField(
        blank=True,
        default="",
        help_text="Optional relative media path or absolute URL for the product image.",
    )
    product_url = models.URLField(blank=True)
    is_active = models.BooleanField(default=True, db_index=True)
    created_at = models.DateTimeField(default=timezone.now, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    concerns = models.ManyToManyField(
        SkinConcern,
        through="ProductConcern",
        related_name="products",
        blank=True,
    )
    ingredients = models.ManyToManyField(
        Ingredient,
        through="ProductIngredient",
        related_name="products",
        blank=True,
    )
    skin_types = models.ManyToManyField(
        SkinTypeTag,
        through="ProductSkinType",
        related_name="products",
        blank=True,
    )
    restrictions = models.ManyToManyField(
        RestrictionTag,
        related_name="products",
        blank=True,
    )

    class Meta:
        ordering = ["brand", "name"]
        indexes = [
            models.Index(fields=["category", "is_active"]),
            models.Index(fields=["brand", "is_active"]),
        ]

    def __str__(self) -> str:
        return f"{self.brand} {self.name}"
    

class ProductReview(models.Model):
    """User-generated review tied to a product in their routine."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    product = models.ForeignKey(
        Product, on_delete=models.CASCADE, related_name="reviews"
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="product_reviews",
    )
    rating = models.PositiveSmallIntegerField(
        null=True,
        blank=True,
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        help_text="Optional 1-5 star rating.",
    )
    comment = models.TextField()
    is_public = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    class Meta:
        ordering = ("-created_at",)
        unique_together = ("product", "user")
        indexes = [
            models.Index(fields=["product", "created_at"]),
            models.Index(fields=["user", "created_at"]),
        ]
    def __str__(self) -> str:
        return f"Review by {self.user} on {self.product}"
    
    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        self.recompute_product_stats(self.product_id)

    def delete(self, *args, **kwargs):
        product_id = self.product_id
        super().delete(*args, **kwargs)
        self.recompute_product_stats(product_id)
        
    @classmethod
    def recompute_product_stats(cls, product_id):
        stats = cls.objects.filter(
            product_id=product_id, is_public=True, rating__isnull=False
        ).aggregate(avg=Avg("rating"), count=Count("id"))
        avg_value = stats.get("avg")
        review_count = stats.get("count", 0) or 0
        if avg_value is None:
            rating_value = None
        else:
            rating_value = Decimal(str(avg_value)).quantize(
                Decimal("0.01"), rounding=ROUND_HALF_UP
            )
        Product.objects.filter(id=product_id).update(
            rating=rating_value,
            review_count=review_count,
        )


class ProductIngredient(models.Model):
    """Many-to-many join for ingredients with ordering info."""

    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    ingredient = models.ForeignKey(Ingredient, on_delete=models.CASCADE)
    order = models.PositiveIntegerField(default=0)
    highlight = models.BooleanField(default=False)

    class Meta:
        unique_together = ("product", "ingredient")
        ordering = ["order", "ingredient__common_name"]

    def __str__(self) -> str:
        return f"{self.product} - {self.ingredient}"


class ProductConcern(models.Model):
    """Strength mapping for how a product targets a concern."""

    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    concern = models.ForeignKey(SkinConcern, on_delete=models.CASCADE)
    weight = models.PositiveSmallIntegerField(default=60)

    class Meta:
        unique_together = ("product", "concern")

    def __str__(self) -> str:
        return f"{self.product} -> {self.concern} ({self.weight})"


class ProductSkinType(models.Model):
    """Suitability mapping for skin types."""

    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    skin_type = models.ForeignKey(SkinTypeTag, on_delete=models.CASCADE)
    compatibility = models.PositiveSmallIntegerField(default=80)

    class Meta:
        unique_together = ("product", "skin_type")

    def __str__(self) -> str:
        return f"{self.product} -> {self.skin_type}"


# Create your models here.
class Question(models.Model):
    """
    Represents a question in the quiz
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    key = models.CharField(max_length=50, unique=True) #e.g. "main_concern"
    text = models.CharField(max_length=300)
    is_multi = models.BooleanField(default=False) # multiple selection are not allowed
    order = models.PositiveIntegerField(db_index=True)

    def __str__(self):
        return self.text
    

class Choice(models.Model):
    """
    Represents a choice for a question
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    question = models.ForeignKey(Question, on_delete=models.CASCADE, related_name="choices")
    label = models.CharField(max_length=120) #Option text for UI
    value = models.CharField(max_length=120) #Stored value (e.g., "acne", "oily")
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["order"]

    def __str__(self):
        return f"{self.question.key} -> {self.value}"
    

class QuizSession(models.Model):
    """
    A session represents one instance fo quiz attempted by a user
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="quiz_sessions",
        null=True,
        blank=True,
    )
    started_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    #Snapshot for answer for each session
    answer_snapshot = models.JSONField(default=dict, blank=True)
    profile_snapshot = models.JSONField(default=dict, blank=True)
    result_summary = models.JSONField(default=dict, blank=True)
    score_version = models.CharField(max_length=20, default="v1")

    def __str__(self):
        user_label = self.user if self.user_id else "anonymous"
        return f"QuizSession {self.id} by {user_label}"
    

class Answer(models.Model):
    """Stores selected choices for a given question within a session."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    session = models.ForeignKey(QuizSession, on_delete=models.CASCADE, related_name="answers")
    question = models.ForeignKey(Question, on_delete=models.CASCADE, related_name="answers")
    choices = models.ManyToManyField(Choice, related_name="answers")
    submitted_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=("session", "question"), name="uniq_session_question"),
        ]

    def __str__(self):
        return f"Answer to {self.question.key} in session {self.session_id}"


class MatchPick(models.Model):
    """Represents a recommended product generated for a quiz session."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    session = models.ForeignKey(QuizSession, on_delete=models.CASCADE, related_name="picks")
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name="match_picks",
        null=True,
        blank=True,
    )
    product_slug = models.SlugField(max_length=120, default="", blank=True)
    product_name = models.CharField(max_length=200, default="")
    brand = models.CharField(max_length=120, default="")
    category = models.CharField(max_length=50, default=Product.Category.OTHER)
    rank = models.PositiveIntegerField(default=1)
    score = models.DecimalField(max_digits=6, decimal_places=3, default=0)
    ingredients = models.JSONField(default=list, blank=True)
    price_snapshot = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    currency = models.CharField(max_length=3, default="USD")
    rationale = models.JSONField(default=dict, blank=True)
    image_url = models.TextField(blank=True, default="")
    product_url = models.URLField(blank=True)
    created_at = models.DateTimeField(default=timezone.now, blank=True)

    class Meta:
        ordering = ["session", "rank"]

    def __str__(self):
        return f"MatchPick {self.product_name} for session {self.session.id}"


class QuizFeedback(models.Model):
    """Stores user-submitted feedback captured from the quiz flow UI."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    session = models.ForeignKey(
        QuizSession,
        on_delete=models.SET_NULL,
        related_name="feedback",
        null=True,
        blank=True,
    )
    contact_email = models.EmailField(blank=True)
    message = models.TextField()
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["created_at"]),
        ]

    def __str__(self) -> str:
        base = self.contact_email or "anonymous"
        return f"Feedback from {base} at {self.created_at:%Y-%m-%d %H:%M}"
