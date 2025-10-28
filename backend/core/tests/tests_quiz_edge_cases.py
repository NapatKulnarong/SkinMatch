import json
import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from quiz.models import QuizSession, Answer

User = get_user_model()


@pytest.mark.django_db
def test_guest_can_start_and_answer_but_cannot_submit():
    """
    Guest (not authenticated) SHOULD be able to:
    - start a quiz session
    - answer questions
    """

    guest = APIClient()  # no force_authenticate

    # 1. start
    res = guest.post("/api/quiz/start")
    assert res.status_code == 200, "Guest should be allowed to start quiz"
    data = res.json()
    session_id = data["id"]

    # 2. fetch questions to get valid IDs
    qres = guest.get("/api/quiz/questions")
    assert qres.status_code == 200
    questions = qres.json()
    assert questions, "Expected at least 1 question in /quiz/questions"

    q = questions[0]
    assert q["choices"], "Question has no choices"
    choice_id = q["choices"][0]["id"]

    # 3. answer as guest
    payload = {
        "session_id": session_id,
        "question_id": q["id"],
        "choice_ids": [choice_id],
    }
    ares = guest.post(
        "/api/quiz/answer",
        data=json.dumps(payload),
        content_type="application/json",
    )
    assert ares.status_code == 200, "Guest should be allowed to answer quiz questions"

    # 4. try to submit as guest
    sres = guest.post(f"/api/quiz/submit?session_id={session_id}")
    assert sres.status_code == 200, "Guest submit should succeed while flagging requires_auth"
    payload_submit = sres.json()
    assert payload_submit.get("session_id") == session_id
    assert payload_submit.get("requires_auth") is True
    result_summary = payload_submit.get("result_summary", {})
    assert "summary" in result_summary
    assert isinstance(result_summary.get("recommendations"), list)

    # session should be completed but remain anonymous
    session = QuizSession.objects.get(id=session_id)
    assert session.completed_at is not None, "Guest finalization should complete the session"
    assert session.user is None, "Guest session should remain anonymous"
    assert session.result_summary, "Guest finalization should still attach result_summary"


@pytest.mark.django_db
def test_retake_quiz_updates_existing_answer_instead_of_creating_duplicate():
    """
    A logged-in user answers the same question twice.
    We expect:
    - the API to indicate that the answer was updated (e.g. updated=True)
    - only the latest choice_ids remain associated
    - we don't end up with duplicate Answer objects for the same (session, question)
    """

    user = User.objects.create_user(
        username="repeatuser",
        email="repeat@example.com",
        password="pass1234",
    )
    client = APIClient()
    assert client.login(username="repeatuser", password="pass1234")

    # start session
    start_res = client.post("/api/quiz/start")
    assert start_res.status_code == 200
    session_id = start_res.json()["id"]

    # get questions
    qres = client.get("/api/quiz/questions")
    assert qres.status_code == 200
    questions = qres.json()
    assert questions, "No questions found"

    q = questions[0]
    assert len(q["choices"]) >= 2, (
        "Need at least two choices on the same question to test updating"
    )
    first_choice = q["choices"][0]["id"]
    second_choice = q["choices"][1]["id"]

    # first answer submit
    payload_1 = {
        "session_id": session_id,
        "question_id": q["id"],
        "choice_ids": [first_choice],
    }
    ans_res_1 = client.post(
        "/api/quiz/answer",
        data=json.dumps(payload_1),
        content_type="application/json",
    )
    assert ans_res_1.status_code == 200
    data_1 = ans_res_1.json()
    # We assume the schema returns something like {"updated": false, ...} on first save
    assert "updated" in data_1
    assert data_1["updated"] in (False, None), "First time answering should not be marked as updated"

    # second answer submit (change choice)
    payload_2 = {
        "session_id": session_id,
        "question_id": q["id"],
        "choice_ids": [second_choice],
    }
    ans_res_2 = client.post(
        "/api/quiz/answer",
        data=json.dumps(payload_2),
        content_type="application/json",
    )
    assert ans_res_2.status_code == 200
    data_2 = ans_res_2.json()
    # We assume second time returns updated=True
    assert "updated" in data_2
    assert data_2["updated"] is True, "Second answer should be reported as an update"

    # DB validation:
    # There should be only ONE Answer object for (session, question) due to unique constraint
    answers = Answer.objects.filter(session_id=session_id, question_id=q["id"])
    assert answers.count() == 1, "There should still be exactly one Answer for this question"

    # That single Answer should now point to ONLY the latest choice
    answer_obj = answers.first()
    final_choice_ids = [str(choice_id) for choice_id in answer_obj.choices.values_list("id", flat=True)]
    assert final_choice_ids == [second_choice], "Answer should reflect only the most recent choice_ids"


@pytest.mark.django_db
def test_history_and_detail_are_private_to_the_user():
    """
    User A completes a quiz.
    - User A should see it in /history and /session/<id>.

    User B (different account) should:
    - get empty list in /history (or at least not see A's session)
    - get 404 when trying to access A's /session/<id>
    """

    # create two users
    user_a = User.objects.create_user(
        username="alice",
        email="alice@example.com",
        password="pass1234",
    )
    user_b = User.objects.create_user(
        username="bob",
        email="bob@example.com",
        password="pass1234",
    )

    client_a = APIClient()
    assert client_a.login(username="alice", password="pass1234")

    client_b = APIClient()
    assert client_b.login(username="bob", password="pass1234")

    # A starts + answers + submits a quiz (minimal happy path)
    start_res = client_a.post("/api/quiz/start")
    assert start_res.status_code == 200
    session_id = start_res.json()["id"]

    # A answers one question so submit won't fail
    qres = client_a.get("/api/quiz/questions")
    assert qres.status_code == 200
    questions = qres.json()
    assert questions, "Expected quiz questions to be available"

    for question in questions:
        assert question["choices"], f"Question {question['key']} missing choices"
        payload = {
            "session_id": session_id,
            "question_id": question["id"],
            "choice_ids": [question["choices"][0]["id"]],
        }
        ans_res = client_a.post(
            "/api/quiz/answer",
            data=json.dumps(payload),
            content_type="application/json",
        )
        assert ans_res.status_code == 200

    # A submits
    sub_res = client_a.post(f"/api/quiz/submit?session_id={session_id}")
    assert sub_res.status_code == 200

    # ---- User A should see it in history ----
    hist_a = client_a.get("/api/quiz/history")
    assert hist_a.status_code == 200
    hist_a_list = hist_a.json()
    assert any(item["session_id"] == session_id for item in hist_a_list), \
        "Owner should see their own quiz session in history"

    # ---- User B should NOT see A's session ----
    hist_b = client_b.get("/api/quiz/history")
    assert hist_b.status_code == 200
    hist_b_list = hist_b.json()
    assert all(item["session_id"] != session_id for item in hist_b_list), \
        "Another user should not see someone else's session in history"

    # ---- User B tries to fetch A's detail ----
    detail_b = client_b.get(f"/api/quiz/session/{session_id}")
    # We expect forbidden/404 depending on your implementation.
    assert detail_b.status_code in (403, 404), \
        "Non-owner should not be able to view session detail"


@pytest.mark.django_db
def test_submit_without_any_answers_returns_400():
    """
    If a user starts a quiz but submits immediately without answering anything:
    - The API should return HTTP 400
    - The error message should indicate there are no answers
      (expected something like 'No answers recorded')
    - The session should NOT be marked completed
    """

    user = User.objects.create_user(
        username="rushuser",
        email="rush@example.com",
        password="pass1234",
    )
    client = APIClient()
    assert client.login(username="rushuser", password="pass1234")

    # start but DO NOT answer anything
    start_res = client.post("/api/quiz/start")
    assert start_res.status_code == 200
    session_id = start_res.json()["id"]

    # try to submit
    submit_res = client.post(f"/api/quiz/submit?session_id={session_id}")
    assert submit_res.status_code == 400, "Submitting with no answers should be rejected"
    data = submit_res.json()
    # we expect the backend to send a helpful message
    assert "No answers recorded" in json.dumps(data), "Expected error message about missing answers"

    # quiz should still be incomplete
    session = QuizSession.objects.get(id=session_id)
    assert session.completed_at is None, "Session should not be completed on invalid submit"
    assert not session.result_summary, "No result_summary should be stored on invalid submit"
