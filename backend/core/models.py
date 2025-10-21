import uuid
from datetime import date
from typing import Optional

from django.conf import settings
from django.db import models
from django.db.models import Q

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
