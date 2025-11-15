from datetime import datetime, timedelta, timezone

import pytest

from core.environment import _latest_value


def test_latest_value_skips_none_values():
    now = datetime.now(timezone.utc)
    times = [
        (now - timedelta(hours=3)).isoformat(),
        (now - timedelta(hours=1)).isoformat(),
        (now + timedelta(hours=1)).isoformat(),
    ]
    values = [12.3, None, 18.7]

    assert _latest_value(times, values) == pytest.approx(12.3)


def test_latest_value_handles_all_none_values():
    now = datetime.now(timezone.utc)
    times = [
        (now - timedelta(hours=2)).isoformat(),
        (now - timedelta(hours=1)).isoformat(),
    ]
    values = [None, None]

    assert _latest_value(times, values) == 0.0


def test_latest_value_uses_last_numeric_when_times_missing():
    values = [None, "15.5", 18]

    assert _latest_value([], values) == pytest.approx(18.0)
