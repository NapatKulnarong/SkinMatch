import uuid
from django.conf import settings
from django.db import models
from django.db.models import Q

# Create your models here.
class UserProfile(models.Model):
    """
    Extension of the built-in Django User model
    Stores additional profile info specific to SkinMatch
    """
    u_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(settings.AUTH_USER_MODEL, 
                                on_delete=models.CASCADE, 
                                related_name="profile",
                                db_index=True)
    
    #profile info (separate from auth_user)
    display_name = models.CharField(max_length=100, blank=True)
    avatar_url = models.URLField(blank=True)
    date_of_birth = models.DateField(null=True, blank=True)
    contact_email = models.EmailField(blank=True, null=True)
    is_verified = models.BooleanField(default=False)

    #audit
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "User Profile"
        verbose_name_plural = "User Profiles"
        indexes = [
            models.Index(fields=["user"]),
            models.Index(fields=["contact_email"]),
            ]
        constraints = [
            # unique only when provided
            models.UniqueConstraint(
                fields=["contact_email"],
                condition=Q(contact_email__isnull=False),
                name="uniq_contact_email_when_present"
            )
        ]
    
    def __str__(self):
        # works for default auth_user and custom
        base = getattr(self.user, "username", None) or getattr(self.user, "email", "user")
        return f"Profile of {base}"