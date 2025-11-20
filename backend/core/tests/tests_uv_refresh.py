from datetime import datetime, timedelta, timezone
from unittest.mock import patch

from django.test import SimpleTestCase

from core import environment as env


class UVSnapshotTests(SimpleTestCase):
    def setUp(self):
        env._UV_CACHE.clear()

    def tearDown(self):
        env._UV_CACHE.clear()

    def _mock_uv_request(self, payload):
        class DummyResponse:
            def json(self):
                return payload

            def raise_for_status(self):
                return None

        def fake_get(url, params, timeout):
            self.assertEqual(url, env.OPEN_METEO_FORECAST)
            self.assertEqual(params["hourly"], "uv_index")
            return DummyResponse()

        return patch.object(env.requests, "get", side_effect=fake_get)

    def test_fetch_uv_snapshot_prefers_current_value(self):
        payload = {
            "current": {"uv_index": 5.76},
            "hourly": {
                "time": [
                    "2024-01-10T08:00:00+00:00",
                    "2024-01-10T09:00:00+00:00",
                    "2024-01-10T10:00:00+00:00",
                ],
                "uv_index": [4.1, 4.5, 4.9],
            },
            "daily": {"uv_index_max": [8.41]},
        }
        with self._mock_uv_request(payload):
            result = env._fetch_uv_snapshot(latitude=13.7563, longitude=100.5018)

        self.assertAlmostEqual(result["index"], 5.8)
        self.assertAlmostEqual(result["max_index"], 8.4)
        self.assertEqual(result["level"], "moderate")
        self.assertEqual(result["level_label"], "Moderate")
        self.assertEqual(result["message"], "UV is moderate. Use basic protection.")

    def test_fetch_uv_snapshot_uses_latest_hourly_when_current_missing(self):
        payload = {
            "current": {},
            "hourly": {
                "time": [
                    "2024-01-10T08:00:00+00:00",
                    "2024-01-10T09:00:00+00:00",
                    "2024-01-10T10:00:00+00:00",
                ],
                "uv_index": [3.2, None, 6.58],
            },
            "daily": {"uv_index_max": []},
        }
        with self._mock_uv_request(payload):
            result = env._fetch_uv_snapshot(latitude=35.6895, longitude=139.6917)

        self.assertAlmostEqual(result["index"], 6.6)
        self.assertAlmostEqual(result["max_index"], 6.6)
        self.assertEqual(result["level"], "high")
        self.assertEqual(result["level_label"], "High")
        self.assertEqual(result["message"], "UV is high. Sunscreen and shade are essential.")

    def test_get_uv_snapshot_reuses_cache_within_refresh_window(self):
        call_count = {"value": 0}

        def fake_fetch(lat, lon):
            call_count["value"] += 1
            return {"index": call_count["value"]}

        current_time = {"now": datetime(2024, 1, 10, 8, 0, tzinfo=timezone.utc)}

        with patch.object(env, "_fetch_uv_snapshot", side_effect=fake_fetch), patch.object(
            env, "_utcnow", side_effect=lambda: current_time["now"]
        ):
            first = env.get_uv_snapshot(13.7, 100.5, refresh_minutes=15)
            self.assertEqual(first["index"], 1)

            current_time["now"] = current_time["now"] + timedelta(minutes=10)
            second = env.get_uv_snapshot(13.7, 100.5, refresh_minutes=15)

        self.assertEqual(second["index"], 1)
        self.assertEqual(call_count["value"], 1)

    def test_get_uv_snapshot_refreshes_after_window(self):
        call_count = {"value": 0}

        def fake_fetch(lat, lon):
            call_count["value"] += 1
            return {"index": call_count["value"]}

        current_time = {"now": datetime(2024, 1, 10, 8, 0, tzinfo=timezone.utc)}

        with patch.object(env, "_fetch_uv_snapshot", side_effect=fake_fetch), patch.object(
            env, "_utcnow", side_effect=lambda: current_time["now"]
        ):
            env.get_uv_snapshot(40.7, -74.0, refresh_minutes=15)

            current_time["now"] = current_time["now"] + timedelta(minutes=16)
            refreshed = env.get_uv_snapshot(40.7, -74.0, refresh_minutes=15)

        self.assertEqual(refreshed["index"], 2)
        self.assertEqual(call_count["value"], 2)
