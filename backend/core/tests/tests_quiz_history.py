import sys
import types
import uuid

import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from core.models import SkinProfile
from quiz.models import QuizSession

# Provide a lightweight stub for google.generativeai so the optional dependency
# does not block test execution when absent.
if "google.generativeai" not in sys.modules:
    stub = types.ModuleType("google.generativeai")

    class _DummyGenerativeModel:
        def __init__(self, *_args, **_kwargs):
            pass

        def generate_content(self, *_args, **_kwargs):
            return types.SimpleNamespace(text="")

    def _noop(*_args, **_kwargs):
        return None

    stub.GenerativeModel = _DummyGenerativeModel
    stub.configure = _noop
    sys.modules["google.generativeai"] = stub

User = get_user_model()


def _complete_quiz(client: APIClient, *, choice_overrides: dict[str, int] | None = None) -> dict:
    """
    Run through the full quiz flow to create a completed session and history entry.
    `choice_overrides` selects a specific choice index (0-based) per question key.
    Returns identifiers and the resulting history item.
    """
    choice_overrides = choice_overrides or {}

    start_res = client.post("/api/quiz/start")
    assert start_res.status_code == 200, start_res.content
    session_id = start_res.json()["id"]

    questions_res = client.get("/api/quiz/questions")
    assert questions_res.status_code == 200, questions_res.content
    questions = questions_res.json()
    assert questions, "Expected quiz to provide questions"

    for question in questions:
        choices = question["choices"]
        assert choices, f"Question {question['key']} is missing choices"
        index = choice_overrides.get(question["key"], 0)
        index = max(0, min(index, len(choices) - 1))
        choice_id = choices[index]["id"]

        answer_res = client.post(
            "/api/quiz/answer",
            data={
                "session_id": session_id,
                "question_id": question["id"],
                "choice_ids": [choice_id],
            },
            format="json",
        )
        assert answer_res.status_code == 200, answer_res.content

    finalize_res = client.post(f"/api/quiz/submit?session_id={session_id}")
    assert finalize_res.status_code == 200, finalize_res.content

    history_res = client.get("/api/quiz/history")
    assert history_res.status_code == 200
    history_items = history_res.json()
    assert history_items, "Expected a history item after finalizing quiz"

    history_item = next(
        (item for item in history_items if item.get("session_id") == session_id),
        None,
    )
    assert history_item, "Completed session not found in match history"

    return {
        "session_id": session_id,
        "history_item": history_item,
    }


@pytest.mark.django_db
def test_history_created_and_sorted():
    """
    Completing multiple quiz sessions should append new history entries in
    descending order of completion, each populated with required fields.
    """
    client = APIClient()
    user = User.objects.create_user(
        username="alice",
        email="alice@example.com",
        password="pass1234",
    )
    assert client.login(username="alice", password="pass1234"), "Unable to log in test user"

    initial = client.get("/api/quiz/history")
    assert initial.status_code == 200
    assert initial.json() == []

    first = _complete_quiz(client)
    second = _complete_quiz(
        client,
        choice_overrides={
            # Change the primary concern the second time for differentiation
            "main_concern": 1,
        },
    )
    assert first["session_id"] != second["session_id"]

    history_resp = client.get("/api/quiz/history")
    assert history_resp.status_code == 200
    history = history_resp.json()
    assert len(history) == 2

    required_keys = {"session_id", "profile_id", "primary_concerns", "completed_at"}
    for item in history:
        assert required_keys <= set(item.keys()), f"Missing keys in history item: {item}"
        assert item["session_id"]
        assert item["profile_id"]
        assert isinstance(item["primary_concerns"], list)
        assert item["completed_at"]

    assert history[0]["completed_at"] >= history[1]["completed_at"], "History is not sorted newest first"

    assert history[0]["session_id"] == second["session_id"], "Newest session should appear first"
    assert history[1]["session_id"] == first["session_id"], "Older session should appear second"

    assert SkinProfile.objects.filter(user=user).count() == 2
    assert QuizSession.objects.filter(user=user).count() == 2


@pytest.mark.django_db
def test_delete_history_removes_profile_and_session():
    """
    Deleting a match history entry removes the SkinProfile and QuizSession
    and the item no longer appears in the history feed.
    """
    client = APIClient()
    user = User.objects.create_user(
        username="bob",
        email="bob@example.com",
        password="pass1234",
    )
    assert client.login(username="bob", password="pass1234"), "Unable to log in test user"

    result = _complete_quiz(client)
    history_item = result["history_item"]

    session_id = uuid.UUID(history_item["session_id"])
    profile_id = uuid.UUID(history_item["profile_id"])

    delete_res = client.delete(f"/api/quiz/history/{profile_id}")
    assert delete_res.status_code == 200, delete_res.content
    delete_body = delete_res.json()
    assert delete_body["ok"] is True
    assert delete_body["deleted_profile_id"] == str(profile_id)
    assert delete_body["deleted_session_id"] == str(session_id)

    assert not SkinProfile.objects.filter(id=profile_id).exists()
    assert not QuizSession.objects.filter(id=session_id).exists()

    history_after = client.get("/api/quiz/history")
    assert history_after.status_code == 200
    assert history_after.json() == []
