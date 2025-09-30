# core/signals.py
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.contrib.auth import get_user_model
from core.models import UserProfile

User = get_user_model()

@receiver(post_save, sender=User)
def sync_user_to_profile(sender, instance, created, **kwargs):
    # Create profile if missing
    profile, _ = UserProfile.objects.get_or_create(user=instance)

    # --- choose your sync policy ---
    # A) One-way sync (User -> Profile), keep contact_email/display_name aligned
    #    Only set defaults on create, then keep contact_email mirrored to user.email.
    if created:
        if not profile.display_name:
            profile.display_name = instance.get_full_name() or instance.username
        if not profile.contact_email:
            profile.contact_email = instance.email or None
    else:
        # keep contact_email mirrored to User.email (remove if you want them independent)
        if profile.contact_email != instance.email:
            profile.contact_email = instance.email

    profile.save()