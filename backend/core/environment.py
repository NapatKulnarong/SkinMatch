from __future__ import annotations

import math
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Iterable

import requests


class EnvironmentServiceError(RuntimeError):
    """Raised when the external environment API cannot be reached."""


OPEN_METEO_FORECAST = "https://api.open-meteo.com/v1/forecast"
OPEN_METEO_AIR = "https://air-quality-api.open-meteo.com/v1/air-quality"
REQUEST_TIMEOUT = 8


UV_BANDS = [
    (11, "extreme", "Extreme", "UV is extreme. Avoid direct sun."),
    (8, "very_high", "Very high", "UV is very high. Limit sun exposure."),
    (6, "high", "High", "UV is high. Sunscreen and shade are essential."),
    (3, "moderate", "Moderate", "UV is moderate. Use basic protection."),
    (0, "low", "Low", "UV is low right now."),
]

PM25_BANDS = [
    (150.5, "very_unhealthy", "Very unhealthy", "Air quality is very unhealthy."),
    (55.5, "unhealthy", "Unhealthy", "Air quality is unhealthy."),
    (35.5, "unhealthy_for_sensitive", "Unhealthy for sensitive groups", "Sensitive skin may react to pollution."),
    (12.1, "moderate", "Moderate", "Air quality is moderate."),
    (0, "good", "Good", "Air quality is good."),
]


@dataclass(frozen=True)
class Coordinates:
    latitude: float
    longitude: float
    label: str | None = None


def fetch_environment_alerts(
    *,
    latitude: float,
    longitude: float,
    keywords: list[str] | None = None,
    location_label: str | None = None,
) -> dict:
    """Fetch UV + air quality data and create skincare alerts."""

    keywords = [kw.lower() for kw in keywords or []]
    uv_data = _fetch_uv_snapshot(latitude, longitude)
    air_data = _fetch_air_snapshot(latitude, longitude)
    alerts = _build_alerts(uv_data, air_data, keywords)

    return {
        "generated_at": datetime.now(timezone.utc),
        "latitude": latitude,
        "longitude": longitude,
        "location_label": location_label,
        "uv": uv_data,
        "air_quality": air_data,
        "alerts": alerts,
        "source_name": "Open-Meteo",
        "source_url": "https://open-meteo.com/",
        "refresh_minutes": 60,
    }


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


def _fetch_air_snapshot(latitude: float, longitude: float) -> dict:
    params = {
        "latitude": latitude,
        "longitude": longitude,
        "hourly": "pm2_5,pm10,european_aqi",
        "timezone": "auto",
    }
    try:
        resp = requests.get(OPEN_METEO_AIR, params=params, timeout=REQUEST_TIMEOUT)
        resp.raise_for_status()
    except requests.RequestException as exc:  # pragma: no cover
        raise EnvironmentServiceError("Unable to reach Open-Meteo for air data.") from exc

    data = resp.json()
    hourly = data.get("hourly", {})
    times = hourly.get("time", []) or []
    pm25 = _latest_value(times, hourly.get("pm2_5", []) or [])
    pm10 = _latest_value(times, hourly.get("pm10", []) or [])
    aqi = _latest_value(times, hourly.get("european_aqi", []) or [])

    band = _resolve_band(pm25, PM25_BANDS)
    return {
        "pm25": round(pm25, 1),
        "pm10": round(pm10, 1),
        "aqi": math.floor(aqi),
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
    now = datetime.now(timezone.utc)
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


def _build_alerts(uv_data: dict, air_data: dict, keywords: list[str]) -> list[dict]:
    alerts: list[dict] = []
    now = datetime.now(timezone.utc)

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

    if air_data.get("level_rank", 0) >= 3:  # Moderate or worse
        alerts.append(
            {
                "id": f"air-{int(air_data['pm25'] * 10)}",
                "category": "air_quality",
                "severity": air_data["level"],
                "title": "Pollution watch",
                "message": air_data["message"],
                "tips": _air_tips(keywords),
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


def _air_tips(keywords: list[str]) -> list[str]:
    tips = [
        "Cleanse gently in the evening to lift particulate matter.",
        "Seal in moisture with antioxidants to buffer pollution stress.",
    ]
    joined = " ".join(keywords)
    if any(word in joined for word in ["acne", "clog", "blackhead"]):
        tips.append("Use salicylic acid or niacinamide to keep pores clear on polluted days.")
    if any(word in joined for word in ["sensitive", "eczema", "barrier"]):
        tips.append("Layer centella or panthenol serums to calm irritation from PM2.5.")
    return tips
