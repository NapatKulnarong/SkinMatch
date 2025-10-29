from __future__ import annotations

"""
Compatibility management command that forwards to load_sample_catalog.

Historically the project exposed `manage.py load_sample` for seeding the
quiz catalog.  The core implementation now lives inside
``load_sample_catalog``; this thin wrapper keeps the shorter name working
so local smoke-tests and CI fixtures can continue to call `load_sample`.
"""

from .load_sample_catalog import Command as LoadSampleCatalogCommand


class Command(LoadSampleCatalogCommand):
    help = "Load the sample skincare catalog (alias for load_sample_catalog)."
