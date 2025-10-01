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