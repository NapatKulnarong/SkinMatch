# core/signals.py
import logging
import os
from urllib.parse import quote

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.mail import send_mail
from django.db import DatabaseError
from django.db.models.signals import post_save
from django.dispatch import receiver

from core.models import UserProfile, SkinFactTopic, NewsletterSubscriber

User = get_user_model()
logger = logging.getLogger(__name__)

@receiver(post_save, sender=User)
def ensure_profile(sender, instance, created, **kwargs):
    if created:
        UserProfile.objects.get_or_create(user=instance)


def _get_site_base_url() -> str:
    base_url = (
        getattr(settings, "SITE_URL", None)
        or os.environ.get("SITE_URL")
        or getattr(settings, "FRONTEND_ORIGIN", None)
        or "http://localhost:3000"
    )
    return str(base_url).rstrip("/")


def _absolute_url(base: str, path: str) -> str:
    if not path:
        return ""
    if path.startswith("http://") or path.startswith("https://"):
        return path
    return f"{base.rstrip('/')}/{path.lstrip('/')}"


def _build_topic_plain_message(topic: SkinFactTopic, topic_url: str, unsubscribe_url: str) -> str:
    lines = [
        "Hi SkinMatch friend!",
        "",
        f"We've just published a new Skin Fact: {topic.title}.",
        topic.excerpt or topic.subtitle or "Discover the latest insights from our experts.",
        "",
        f"Read it now: {topic_url}",
        "",
        f"Prefer not to receive these updates? Unsubscribe anytime: {unsubscribe_url}",
    ]
    return "\n".join(line for line in lines if line is not None)


def _build_topic_html_message(
    topic: SkinFactTopic,
    topic_url: str,
    hero_image_url: str,
    unsubscribe_url: str,
) -> str:
    hero_section = ""
    if hero_image_url:
        hero_section = f"""
        <tr>
            <td style=\"padding: 0 0 16px 0;\">
                <img src=\"{hero_image_url}\" alt=\"{topic.hero_image_alt or topic.title}\" style=\"width: 100%; border-radius: 18px; border: 2px solid #000;\" />
            </td>
        </tr>
        """

    subtitle = topic.subtitle or "New expert insights from the SkinMatch team"
    excerpt = topic.excerpt or "Tap to learn what this means for your skin routine."

    return f"""
<!DOCTYPE html>
<html>
  <head>
    <meta charset=\"utf-8\" />
    <title>New Skin Fact: {topic.title}</title>
  </head>
  <body style=\"margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;background:#f7f5ef;\">
    <table role=\"presentation\" cellpadding=\"0\" cellspacing=\"0\" width=\"100%\" style=\"background:#f7f5ef;padding:32px 12px;\">
      <tr>
        <td align=\"center\">
          <table role=\"presentation\" width=\"600\" style=\"width:100%;max-width:600px;background:#fff;border-radius:28px;border:2px solid #0f172a;box-shadow:8px 8px 0 rgba(0,0,0,0.12);padding:32px;\">
            <tr>
              <td>
                <p style=\"margin:0;font-size:13px;text-transform:uppercase;letter-spacing:1.5px;color:#3c4c3f;font-weight:600;\">SkinMatch Skin Facts</p>
                <h1 style=\"margin:8px 0 4px 0;font-size:30px;color:#0f172a;\">{topic.title}</h1>
                <p style=\"margin:0 0 16px 0;font-size:16px;color:#465248;\">{subtitle}</p>
              </td>
            </tr>
            {hero_section}
            <tr>
              <td>
                <p style=\"margin:0 0 16px 0;font-size:16px;line-height:1.6;color:#1d2731;\">{excerpt}</p>
                <div style=\"margin:24px 0;\">
                  <a href=\"{topic_url}\" style=\"background:#0f172a;color:#fff;text-decoration:none;padding:14px 28px;border-radius:999px;font-weight:600;border:2px solid #0f172a;display:inline-block;\">Read the full Skin Fact</a>
                </div>
                <p style=\"font-size:13px;color:#647067;\">
                  You received this email because you subscribed to SkinMatch updates.
                  <br>
                  <a href=\"{unsubscribe_url}\" style=\"color:#647067;\">Unsubscribe</a> anytime.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
"""


@receiver(post_save, sender=SkinFactTopic)
def notify_new_skin_fact_topic(sender, instance: SkinFactTopic, created: bool, **kwargs):
    if not created or not instance.is_published:
        return

    try:
        recipients = list(
            NewsletterSubscriber.objects.values_list("email", flat=True)
        )
    except DatabaseError as exc:
        logger.warning("Unable to load newsletter subscribers for topic email: %s", exc)
        return

    if not recipients:
        return

    base_url = _get_site_base_url()
    topic_url = f"{base_url}/facts/{instance.slug}"
    hero_url = ""
    try:
        if instance.hero_image:
            hero_url = _absolute_url(base_url, instance.hero_image.url)
    except Exception:  # pragma: no cover - storage backend errors
        hero_url = ""

    sender_email = getattr(settings, "DEFAULT_FROM_EMAIL", None) or "no-reply@skinmatch.local"
    subject = f"New Skin Fact: {instance.title}"

    for email in recipients:
        unsubscribe_url = f"{base_url}/newsletter/unsubscribe"
        if email:
            unsubscribe_url += f"?email={quote(email)}"
        plain_message = _build_topic_plain_message(instance, topic_url, unsubscribe_url)
        html_message = _build_topic_html_message(
            instance,
            topic_url,
            hero_url,
            unsubscribe_url,
        )
        try:
            send_mail(
                subject=subject,
                message=plain_message,
                from_email=sender_email,
                recipient_list=[email],
                html_message=html_message,
                fail_silently=False,
            )
        except Exception as exc:
            logger.warning("Unable to send Skin Fact announcement to %s: %s", email, exc)
