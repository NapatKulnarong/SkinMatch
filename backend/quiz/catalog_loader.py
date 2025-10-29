from __future__ import annotations

import io
import logging
from typing import Final

from django.conf import settings

logger = logging.getLogger(__name__)

_AUTO_SEEDED: bool = False
_LOG_PREFIX: Final[str] = "[quiz.catalog_loader]"


def ensure_sample_catalog(*, force: bool = False) -> bool:
    """
    Ensure the curated sample catalog exists in development environments.

    Returns True when a seeding pass was executed, False otherwise.
    """
    global _AUTO_SEEDED

    if not force and not getattr(settings, "QUIZ_AUTO_SEED_SAMPLE", True):
        return False

    from .models import Product  # local import to avoid startup circulars

    if not force:
        if _AUTO_SEEDED:
            return False
        if Product.objects.filter(is_active=True).exists():
            _AUTO_SEEDED = True
            return False

    try:
        from .management.commands.load_sample_catalog import Command as SeedCommand

        command = SeedCommand()
        command.stdout = io.StringIO()
        command.stderr = io.StringIO()
        command.handle(reset=False)
        _AUTO_SEEDED = True
        return True
    except Exception:  # pragma: no cover - defensive guard
        logger.exception("%s Failed to auto-seed sample catalog", _LOG_PREFIX)
        return False


def reset_sample_catalog_state() -> None:
    """Clear the memoized auto-seed flag (used by tests)."""
    global _AUTO_SEEDED
    _AUTO_SEEDED = False


__all__ = ["ensure_sample_catalog", "reset_sample_catalog_state"]
