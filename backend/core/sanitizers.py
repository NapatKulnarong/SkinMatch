"""Utility helpers to sanitize user-supplied text/metadata."""

from __future__ import annotations

from typing import Any
import html

import bleach

ALLOWED_INLINE_TAGS = [
    "b",
    "strong",
    "i",
    "em",
    "u",
    "a",
    "br",
    "ul",
    "ol",
    "li",
    "p",
]
ALLOWED_ATTRS = {
    "a": ["href", "title", "rel"],
}
ALLOWED_PROTOCOLS = ["http", "https", "mailto"]


def sanitize_plain_text(value: str | None) -> str:
    """Strip any HTML/JS from free-form text."""
    cleaned = bleach.clean(
        value or "",
        tags=[],
        attributes={},
        strip=True,
    )
    return html.unescape(cleaned).strip()


def sanitize_basic_markup(value: str | None) -> str:
    """Allow only a constrained set of inline tags."""
    cleaned = bleach.clean(
        value or "",
        tags=ALLOWED_INLINE_TAGS,
        attributes=ALLOWED_ATTRS,
        protocols=ALLOWED_PROTOCOLS,
        strip=True,
    )
    return html.unescape(cleaned).strip()


def sanitize_metadata_dict(metadata: Any) -> dict[str, str]:
    """Best-effort cleanup for JSON metadata blobs."""
    if not isinstance(metadata, dict):
        return {}

    sanitized: dict[str, str] = {}
    for raw_key, raw_value in metadata.items():
        if raw_value is None:
            continue

        key = sanitize_plain_text(str(raw_key))[:40]
        if not key:
            continue

        if isinstance(raw_value, (int, float)):
            sanitized[key] = str(raw_value)
            continue

        value = sanitize_plain_text(str(raw_value))
        if value:
            sanitized[key] = value

    return sanitized
