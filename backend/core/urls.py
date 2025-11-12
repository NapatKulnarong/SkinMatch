from django.urls import path
from .views import GoogleOAuthCallbackView, logout_view, home
from .fact_views import (
    recommended_topics,
    popular_topics,
    topics_by_section,
)

urlpatterns = [
    path("", home, name="home"),
    path("logout/", logout_view, name="logout"),
    path("auth/google/callback/", GoogleOAuthCallbackView.as_view(), name="google_oauth_callback"),
    
    # Facts API endpoints
    path("facts/topics/recommended", recommended_topics, name="recommended_topics"),
    path("facts/topics/popular", popular_topics, name="popular_topics"),
    path("facts/topics/section/<str:section>", topics_by_section, name="topics_by_section"),
]
