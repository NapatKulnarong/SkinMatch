import json
import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from quiz.models import QuizSession, Answer

User = get_user_model()


@pytest.mark.django_db
def test_quiz_full_flow_aligned_with_api_schema():
    """
    Full integration test for the quiz flow using the real API schema.

    Flow:
    1. /quiz/start/         -> create a new session
    2. /quiz/questions      -> fetch questions and choices
    3. /quiz/answer/        -> submit answers using IDs
    4. /quiz/submit/        -> finalize and generate result summary
    5. /quiz/history/       -> fetch past quiz sessions for this user
    6. /quiz/session/<id>/  -> inspect one completed session
    """

    # ---------- Arrange ----------
    user = User.objects.create_user(
        username="quizuser",
        email="quizuser@example.com",
        password="pass1234",
    )
    client = APIClient()
    assert client.login(username="quizuser", password="pass1234"), "Unable to log in test user"

    # ---------- 1. Start quiz ----------
    res = client.post("/api/quiz/start")
    assert res.status_code == 200, res.content
    data = res.json()

    assert "id" in data
    session_id = data["id"]

    # Check that the session exists in the database
    session = QuizSession.objects.get(id=session_id)
    assert session.user == user
    assert session.completed_at is None
    # before submit, it's not completed yet

    # ---------- 2. Fetch questions ----------
    res = client.get("/api/quiz/questions")
    assert res.status_code == 200, res.content
    questions = res.json()
    assert isinstance(questions, list) and questions, "Expected at least one question from /quiz/questions"

    # ---------- 3. Submit answers ----------
    answered_count = 0
    for question in questions:
        assert question["choices"], f"Question {question['key']} has no choices"
        payload = {
            "session_id": session_id,
            "question_id": question["id"],
            "choice_ids": [question["choices"][0]["id"]],
        }
        res = client.post(
            "/api/quiz/answer",
            data=json.dumps(payload),
            content_type="application/json",
        )
        assert res.status_code == 200, res.content
        answered_count += 1

    # Check that answers were actually saved in DB
    assert (
        Answer.objects.filter(session_id=session_id).count() == answered_count
    ), "Answer count mismatch"

    # ---------- 4. Submit quiz / finalize ----------
    res = client.post(f"/api/quiz/submit?session_id={session_id}")
    assert res.status_code == 200, res.content
    data = res.json()

    assert "result_summary" in data, "API did not return result_summary"
    assert "session_id" in data, "API did not return session_id"
    assert data["session_id"] == session_id

    result_summary = data["result_summary"]
    assert "summary" in result_summary, "result_summary missing 'summary'"
    assert "recommendations" in result_summary, "result_summary missing 'recommendations'"

    summary = result_summary["summary"]
    recs = result_summary["recommendations"]

    assert isinstance(summary, dict), "summary should be an object/dict"
    assert isinstance(recs, list), "recommendations should be a list"

    # After submit, the session should now be completed
    session.refresh_from_db()
    assert session.completed_at is not None, "QuizSession.completed_at was not set after submit"
    # Also result_summary should have been stored on the session in DB
    assert session.result_summary is not None
    assert "summary" in session.result_summary

    # ---------- 5. Fetch quiz history ----------
    res = client.get("/api/quiz/history")
    assert res.status_code == 200, res.content
    history = res.json()
    assert isinstance(history, list), "History response should be a list"

    # The session we just completed should appear in history
    found = any(item.get("session_id") == session_id for item in history)
    assert found, f"Session {session_id} not found in /quiz/history/ response"

    # ---------- 6. Fetch session detail ----------
    res = client.get(f"/api/quiz/session/{session_id}")
    assert res.status_code == 200, res.content
    detail = res.json()

    assert detail["session_id"] == session_id, "session_id mismatch in session detail response"
    assert "picks" in detail, "session detail missing 'picks'"
    assert isinstance(detail["picks"], list), "'picks' should be a list in session detail"
    assert "profile" in detail, "session detail missing 'profile'"
