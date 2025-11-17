from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Iterable, List, Tuple

from django.conf import settings
from django.core.files.storage import Storage
from django.core.management.base import BaseCommand, CommandParser
from django.utils import timezone

from core.models import SkinFactTopic

DATA_DIR = Path(settings.BASE_DIR).parent / "data"
DEFAULT_SEED_PATH = DATA_DIR / "skin_facts_seed.json"
DEFAULT_MEDIA_DIR = DATA_DIR / "skin_facts_media"


class Command(BaseCommand):
    help = (
        "Export the current Skin Fact topics (and their content blocks) "
        "into a JSON payload that can be re-used as a seed file."
    )

    def add_arguments(self, parser: CommandParser) -> None:
        parser.add_argument(
            "--output",
            "-o",
            default=str(DEFAULT_SEED_PATH),
            help="Path to write the JSON export. Use '-' to print to stdout.",
        )
        parser.add_argument(
            "--section",
            choices=[choice[0] for choice in SkinFactTopic.Section.choices],
            help="Optional section filter (defaults to exporting all sections).",
        )
        parser.add_argument(
            "--include-unpublished",
            action="store_true",
            help="Include topics that are still drafts / unpublished.",
        )
        parser.add_argument(
            "--media-dir",
            default=str(DEFAULT_MEDIA_DIR),
            help=(
                "Folder to copy referenced hero/content images into. "
                "Images will be downloaded from Django storage (S3, local disk, etc.)."
            ),
        )
        parser.add_argument(
            "--skip-missing",
            action="store_true",
            help="Skip missing images without stopping the export (recommended).",
        )
        parser.add_argument(
            "--report-missing",
            action="store_true",
            help="Generate a report of missing images.",
        )

    def handle(self, *args: Any, **options: Any) -> None:
        section: str | None = options.get("section")
        include_unpublished: bool = options.get("include_unpublished", False)
        output: str = options.get("output", str(DEFAULT_SEED_PATH))
        media_dir_raw: str | None = options.get("media_dir")
        skip_missing: bool = options.get("skip_missing", False)
        report_missing: bool = options.get("report_missing", False)

        media_dir = Path(media_dir_raw).expanduser().resolve() if media_dir_raw else None
        if media_dir:
            media_dir.mkdir(parents=True, exist_ok=True)

        qs = SkinFactTopic.objects.prefetch_related("content_blocks").order_by("section", "title")
        if section:
            qs = qs.filter(section=section)
        if not include_unpublished:
            qs = qs.filter(is_published=True)

        topics_payload: List[dict[str, Any]] = []
        referenced_media: List[Tuple[Storage, str]] = []
        seen_refs: set[str] = set()

        for topic in qs:
            serialized, files = _serialize_topic(topic)
            topics_payload.append(serialized)
            for storage, path in files:
                key = f"{storage.__class__.__module__}.{storage.__class__.__qualname__}:{path}"
                if key in seen_refs:
                    continue
                referenced_media.append((storage, path))
                seen_refs.add(key)

        payload = {
            "generated_at": timezone.now().isoformat(),
            "section": section,
            "include_unpublished": include_unpublished,
            "topic_count": len(topics_payload),
            "topics": topics_payload,
        }

        serialized = json.dumps(payload, indent=2, ensure_ascii=False)

        if output == "-":
            self.stdout.write(serialized)
            self.stdout.write(self.style.SUCCESS(f"Exported {len(topics_payload)} topics to stdout"))
            return

        output_path = Path(output).expanduser().resolve()
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_text(serialized, encoding="utf-8")
        self.stdout.write(self.style.SUCCESS(f"Exported {len(topics_payload)} topics to {output_path}"))

        if media_dir:
            copied, failed, missing_files = _download_media_files(
                referenced_media,
                media_dir,
                self.stdout,
                self.stderr,
                skip_missing,
            )
            self.stdout.write(
                self.style.SUCCESS(f"Downloaded {copied} media file(s) to {media_dir.resolve()}")
            )
            if failed:
                self.stderr.write(self.style.WARNING(f"Failed to download {failed} file(s)"))

            if report_missing and missing_files:
                report_path = output_path.parent / "missing_images_report.txt"
                report_path.write_text(
                    "\n".join(
                        [
                            f"Missing Images Report - Generated: {timezone.now()}",
                            f"Total missing: {len(missing_files)}",
                            "=" * 80,
                            "",
                            *sorted(missing_files),
                        ]
                    ),
                    encoding="utf-8",
                )
                self.stdout.write(self.style.SUCCESS(f"Missing images report saved to {report_path}"))


def _serialize_topic(topic: SkinFactTopic) -> Tuple[dict[str, Any], List[Tuple[Storage, str]]]:
    blocks_payload = []
    media_refs: List[Tuple[Storage, str]] = []

    for block in topic.content_blocks.all().order_by("order"):
        image_name = block.image.name if block.image else None
        if image_name:
            media_refs.append((block.image.storage, image_name))
        blocks_payload.append(
            {
                "order": block.order,
                "content": block.content or None,
                "image": image_name,
                "image_alt": block.image_alt or None,
            }
        )

    if topic.hero_image:
        media_refs.append((topic.hero_image.storage, topic.hero_image.name))

    return {
        "slug": topic.slug,
        "title": topic.title,
        "subtitle": topic.subtitle or None,
        "excerpt": topic.excerpt or None,
        "section": topic.section,
        "hero_image": topic.hero_image.name if topic.hero_image else None,
        "hero_image_alt": topic.hero_image_alt or None,
        "is_published": topic.is_published,
        "view_count": topic.view_count,
        "last_updated": topic.last_updated.isoformat() if topic.last_updated else None,
        "created_at": topic.created_at.isoformat() if topic.created_at else None,
        "updated_at": topic.updated_at.isoformat() if topic.updated_at else None,
        "content_blocks": blocks_payload,
    }, media_refs


def _download_media_files(
    references: Iterable[Tuple[Storage, str]],
    destination: Path,
    stdout,
    stderr,
    skip_missing: bool = False,
) -> Tuple[int, int, List[str]]:
    dest_root = Path(destination).expanduser().resolve()
    copied = 0
    failed = 0
    missing_files: List[str] = []

    for storage, rel_path in references:
        if not rel_path:
            continue
        try:
            if not storage.exists(rel_path):
                missing_files.append(rel_path)
                stderr.write(f"⚠ Missing: {rel_path}")
                failed += 1
                if not skip_missing:
                    raise FileNotFoundError(f"Media file not found: {rel_path}")
                continue

            target = dest_root / rel_path
            target.parent.mkdir(parents=True, exist_ok=True)
            with storage.open(rel_path, "rb") as source_file:
                with open(target, "wb") as dest_file:
                    if hasattr(source_file, "chunks"):
                        for chunk in source_file.chunks():
                            dest_file.write(chunk)
                    else:
                        dest_file.write(source_file.read())

            copied += 1
            stdout.write(f"✓ Downloaded: {rel_path}")
        except Exception as exc:
            missing_files.append(rel_path)
            stderr.write(f"✗ Error downloading {rel_path}: {exc}")
            failed += 1
            if not skip_missing:
                raise

    return copied, failed, missing_files
