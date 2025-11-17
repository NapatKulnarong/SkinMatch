"""Reusable validators for uploads and user-provided files."""

from __future__ import annotations

from django.conf import settings
from django.core.exceptions import ValidationError
from django.utils.translation import gettext_lazy as _

SAFE_IMAGE_MIME_TYPES = {
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/avif",
}


def validate_image_mime_type(upload) -> None:
    """Allow only whitelisted image MIME types when available."""
    if upload is None:
        return

    content_type = getattr(upload, "content_type", "") or ""
    if not content_type:
        return  # Some stored FieldFile instances lack content_type; rely on extension validator.

    base_type = content_type.split(";")[0].strip().lower()
    if base_type not in SAFE_IMAGE_MIME_TYPES:
        raise ValidationError(
            _("Unsupported image type: %(ctype)s"),
            params={"ctype": base_type or "unknown"},
        )


def _max_upload_bytes() -> int:
    max_mb = getattr(settings, "FACT_IMAGE_MAX_UPLOAD_MB", 5)
    try:
        max_mb_int = int(max_mb)
    except (TypeError, ValueError):
        max_mb_int = 5
    return max_mb_int * 1024 * 1024


def validate_fact_image_size(upload) -> None:
    """Ensure fact images do not exceed the configured limit."""
    if upload is None:
        return

    size = getattr(upload, "size", None)
    if not size:
        return

    limit = _max_upload_bytes()
    if size > limit:
        max_mb = limit // (1024 * 1024)
        raise ValidationError(
            _("Image is too large (max %(max_mb)s MB)."),
            params={"max_mb": max_mb},
        )
