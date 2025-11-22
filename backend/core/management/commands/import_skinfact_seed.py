from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Iterable

from django.conf import settings
from django.core.files.base import File
from django.core.files.storage import Storage, default_storage
from django.core.management.base import BaseCommand, CommandParser
from django.db import transaction
from django.utils.dateparse import parse_datetime, parse_date

from core.models import SkinFactTopic, SkinFactContentBlock

DATA_DIR = Path(settings.BASE_DIR) / "data"
DEFAULT_SEED_PATH = DATA_DIR / "skin_facts_seed.json"
DEFAULT_MEDIA_DIR = DATA_DIR / "skin_facts_media"


class Command(BaseCommand):
    help = "Import Skin Fact topics (and images) from the JSON bundle produced by export_skinfact_seed."

    def add_arguments(self, parser: CommandParser) -> None:  # pragma: no cover - CLI plumbing
        parser.add_argument(
            "--input",
            "-i",
            default=str(DEFAULT_SEED_PATH),
            help="Path to the JSON seed file.",
        )
        parser.add_argument(
            "--media-dir",
            default=str(DEFAULT_MEDIA_DIR),
            help=(
                "Path to the folder that contains the exported media files (facts/hero, facts/blocks, etc.). "
                "When provided, files will be copied into Django's media storage so admin uploads work offline."
            ),
        )
        parser.add_argument(
            "--reset",
            action="store_true",
            help="Delete all existing Skin Fact topics before importing.",
        )
        parser.add_argument(
            "--skip-missing-media",
            action="store_true",
            help="Skip topics whose media files are missing instead of aborting.",
        )

    def handle(self, *args: Any, **options: Any) -> None:
        input_path = Path(options["input"]).expanduser().resolve()
        media_dir = Path(options["media_dir"]).expanduser().resolve() if options.get("media_dir") else None
        reset = options.get("reset", False)
        skip_missing = options.get("skip_missing_media", False)

        if not input_path.exists():
            raise FileNotFoundError(f"Seed file not found: {input_path}")
        payload = json.loads(input_path.read_text(encoding="utf-8"))
        topics_data: list[dict[str, Any]] = payload.get("topics", [])

        if reset:
            self.stdout.write(self.style.WARNING("Reset flag detected – deleting existing Skin Fact topics."))
            SkinFactTopic.objects.all().delete()

        imported = 0
        skipped = 0

        for topic_data in topics_data:
            try:
                with transaction.atomic():
                    topic = _upsert_topic(topic_data, media_dir, skip_missing)
                    imported += 1
                    self.stdout.write(self.style.SUCCESS(f"✓ Imported {topic.slug}"))
            except FileNotFoundError as exc:
                skipped += 1
                message = f"⚠ Skipping {topic_data.get('slug')} – {exc}"
                if skip_missing:
                    self.stderr.write(message)
                    continue
                raise
            except Exception as exc:  # pragma: no cover - generic guard rail
                skipped += 1
                self.stderr.write(f"✗ Failed to import {topic_data.get('slug')}: {exc}")

        self.stdout.write(self.style.SUCCESS(f"Imported {imported} topic(s)."))
        if skipped:
            self.stderr.write(self.style.WARNING(f"Skipped {skipped} topic(s)."))


def _upsert_topic(topic_data: dict[str, Any], media_dir: Path | None, skip_missing: bool) -> SkinFactTopic:
    slug = topic_data["slug"]
    topic, _created = SkinFactTopic.objects.get_or_create(slug=slug)

    topic.title = topic_data["title"]
    topic.subtitle = topic_data.get("subtitle") or ""
    topic.excerpt = topic_data.get("excerpt") or ""
    topic.section = topic_data["section"]
    topic.hero_image_alt = topic_data.get("hero_image_alt") or ""
    topic.is_published = bool(topic_data.get("is_published", True))
    topic.view_count = int(topic_data.get("view_count") or 0)

    last_updated = topic_data.get("last_updated")
    if last_updated:
        parsed_date = parse_date(last_updated.split("T")[0])
        if parsed_date:
            topic.last_updated = parsed_date

    hero_path = topic_data.get("hero_image")
    if hero_path:
        _copy_media_file(hero_path, media_dir, skip_missing)
        topic.hero_image.name = hero_path

    topic.save()

    # Refresh content blocks
    topic.content_blocks.all().delete()
    blocks: Iterable[dict[str, Any]] = topic_data.get("content_blocks", [])
    for block_data in blocks:
        block = SkinFactContentBlock(
            topic=topic,
            order=int(block_data.get("order") or 0),
            content=block_data.get("content") or "",
        )
        block_image = block_data.get("image")
        if block_image:
            _copy_media_file(block_image, media_dir, skip_missing)
            block.image.name = block_image
            block.image_alt = block_data.get("image_alt") or ""
        block.save()

    return topic


def _copy_media_file(rel_path: str, media_dir: Path | None, skip_missing: bool) -> None:
    if not media_dir:
        return
    source = media_dir / rel_path
    if not source.exists():
        if skip_missing:
            raise FileNotFoundError(f"Media file not found: {rel_path}")
        raise FileNotFoundError(f"Media file not found: {source}")

    storage: Storage = default_storage
    if storage.exists(rel_path):
        return

    source.parent.mkdir(parents=True, exist_ok=True)
    with source.open("rb") as fh:
        storage.save(rel_path, File(fh))
