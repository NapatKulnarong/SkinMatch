from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Iterable

import requests


class EnvironmentServiceError(RuntimeError):
    """Raised when the external environment API cannot be reached."""


OPEN_METEO_FORECAST = "https://api.open-meteo.com/v1/forecast"
REQUEST_TIMEOUT = 8
UV_REFRESH_MINUTES = 15


UV_BANDS = [
    (11, "extreme", "Extreme", "UV is extreme. Avoid direct sun."),
    (8, "very_high", "Very high", "UV is very high. Limit sun exposure."),
    (6, "high", "High", "UV is high. Sunscreen and shade are essential."),
    (3, "moderate", "Moderate", "UV is moderate. Use basic protection."),
    (0, "low", "Low", "UV is low right now."),
]


@dataclass(frozen=True)
class Coordinates:
    latitude: float
    longitude: float
    label: str | None = None

# (lat, lon) -> (fetched_at, snapshot)
_UV_CACHE: dict[tuple[float, float], tuple[datetime, dict]] = {}


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def fetch_environment_alerts(
    *,
    latitude: float,
    longitude: float,
    keywords: list[str] | None = None,
    location_label: str | None = None,
) -> dict:
    """Fetch UV data and create skincare alerts."""

    keywords = [kw.lower() for kw in keywords or []]
    uv_data = get_uv_snapshot(latitude, longitude)
    alerts = _build_alerts(uv_data, keywords)

    return {
        "generated_at": _utcnow(),
        "latitude": latitude,
        "longitude": longitude,
        "location_label": location_label,
        "uv": uv_data,
        "alerts": alerts,
        "source_name": "Open-Meteo",
        "source_url": "https://open-meteo.com/",
        "refresh_minutes": 60,
    }


def get_uv_snapshot(
    latitude: float,
    longitude: float,
    *,
    refresh_minutes: int = UV_REFRESH_MINUTES,
) -> dict:
    """Return the UV snapshot, caching data for the refresh window."""

    now = _utcnow()
    key = (latitude, longitude)
    cached_entry = _UV_CACHE.get(key)
    if cached_entry is not None:
        fetched_at, cached = cached_entry
        if now - fetched_at < timedelta(minutes=refresh_minutes):
            return cached

    snapshot = _fetch_uv_snapshot(latitude, longitude)
    _UV_CACHE[key] = (now, snapshot)
    return snapshot


def _fetch_uv_snapshot(latitude: float, longitude: float) -> dict:
    params = {
        "latitude": latitude,
        "longitude": longitude,
        "hourly": "uv_index",
        "daily": "uv_index_max",
        "timezone": "auto",
        "forecast_days": 1,
        "current": "uv_index",
    }
    try:
        resp = requests.get(OPEN_METEO_FORECAST, params=params, timeout=REQUEST_TIMEOUT)
        resp.raise_for_status()
    except requests.RequestException as exc:  # pragma: no cover - network failure
        raise EnvironmentServiceError("Unable to reach Open-Meteo for UV data.") from exc

    data = resp.json()
    current_section = data.get("current", {}) or {}
    current_uv = current_section.get("uv_index")

    hourly_times = data.get("hourly", {}).get("time", []) or []
    hourly_values = data.get("hourly", {}).get("uv_index", []) or []
    if current_uv is None:
        current_uv = _latest_value(hourly_times, hourly_values)

    daily_values = data.get("daily", {}).get("uv_index_max", []) or []
    uv_max = daily_values[0] if daily_values else current_uv

    band = _resolve_band(current_uv, UV_BANDS)
    return {
        "index": round(current_uv, 1),
        "max_index": round(uv_max or current_uv, 1),
        "level": band["code"],
        "level_label": band["label"],
        "message": band["message"],
        "level_rank": band["rank"],
    }


def _resolve_band(value: float, bands: list[tuple[float, str, str, str]]) -> dict:
    v = value or 0.0
    for index, (threshold, code, label, message) in enumerate(bands):
        if v >= threshold:
            return {"code": code, "label": label, "message": message, "rank": len(bands) - index}
    # Fallback to the last band
    threshold, code, label, message = bands[-1]
    return {"code": code, "label": label, "message": message, "rank": 1}


def _ensure_aware(dt: datetime) -> datetime:
    if dt.tzinfo is None or dt.tzinfo.utcoffset(dt) is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


def _latest_value(times: Iterable[str], values: Iterable[float | int | str | None]) -> float:
    time_list = list(times)
    value_list = list(values)
    now = _utcnow()
    latest = None

    def _to_float(value: float | int | str | None) -> float | None:
        if value is None:
            return None
        try:
            return float(value)
        except (TypeError, ValueError):
            return None

    for raw_time, value in zip(time_list, value_list):
        try:
            point_time = datetime.fromisoformat(raw_time.replace("Z", "+00:00"))
        except ValueError:
            continue
        point_time = _ensure_aware(point_time)
        if point_time <= now:
            candidate = _to_float(value)
            if candidate is not None:
                latest = candidate
        else:
            break
    if latest is not None:
        return latest
    for value in reversed(value_list):
        candidate = _to_float(value)
        if candidate is not None:
            return candidate
    return 0.0


def _build_alerts(uv_data: dict, keywords: list[str]) -> list[dict]:
    alerts: list[dict] = []
    now = _utcnow()

    if uv_data.get("level_rank", 0) >= 3:  # High or worse
        alerts.append(
            {
                "id": f"uv-{int(uv_data['index'] * 10)}",
                "category": "uv",
                "severity": uv_data["level"],
                "title": "High UV today",
                "message": uv_data["message"],
                "tips": _uv_tips(keywords),
                "valid_until": now + timedelta(hours=6),
            }
        )

    return alerts


def _uv_tips(keywords: list[str]) -> list[str]:
    tips = [
        "Apply broad-spectrum SPF 50 and reapply every 2 hours.",
        "Add a wide-brim hat or seek shade between 10 AM – 4 PM.",
    ]
    joined = " ".join(keywords)
    if any(word in joined for word in ["pigment", "dark", "spot"]):
        tips.append("Layer vitamin C or tranexamic acid under sunscreen to defend pigment.")
    if any(word in joined for word in ["aging", "wrinkle", "fine line"]):
        tips.append("Pair antioxidants with retinoids at night to repair UV stress.")
    if any(word in joined for word in ["sensitive", "redness"]):
        tips.append("Strengthen barrier with ceramides before SPF to minimize flare-ups.")
    return tips
