from django.urls import path
from . import views

urlpatterns = [
    path("start/", views.start_quiz, name="start_quiz"),
    path("answer/", views.submit_answer, name="submit_answer"),
    path("submit/", views.submit_quiz, name="submit_quiz"),
    path("history/", views.quiz_history, name="quiz_history"),
    path("session/<uuid:session_id>/", views.session_detail, name="session_detail"),
]
