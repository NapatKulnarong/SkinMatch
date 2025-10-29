from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional

from ninja import Schema
from pydantic import Field, field_validator


class SessionOut(Schema):
    id: uuid.UUID
    started_at: datetime
    average_rating: Optional[float] = None
    review_count: int = 0


class AnswerIn(Schema):
    session_id: uuid.UUID
    question_id: uuid.UUID
    choice_ids: List[uuid.UUID]


class AnswerAck(Schema):
    status: str
    updated: bool = False


class ChoiceOut(Schema):
    id: uuid.UUID
    label: str
    value: str
    order: int


class QuestionOut(Schema):
    id: uuid.UUID
    key: str
    text: str
    is_multi: bool
    order: int
    choices: List[ChoiceOut]


class ReviewCreateIn(Schema):
    rating: Optional[int] = None
    comment: str
    is_public: Optional[bool] = True

    @field_validator("rating")
    @classmethod
    def _rating_range(cls, value):
        if value is None:
            return value
        if not 1 <= value <= 5:
            raise ValueError("Rating must be between 1 and 5")
        return value
    
    @field_validator("comment")
    @classmethod
    def _comment_not_blank(cls, value: str) -> str:
        cleaned = (value or "").strip()
        if not cleaned:
            raise ValueError("Comment cannot be blank")
        return cleaned
    

class ReviewOut(Schema):
    id: uuid.UUID
    product_id: uuid.UUID
    user_id: str
    user_display_name: str
    avatar_url: Optional[str] = None
    rating: Optional[int] = None
    comment: str
    is_public: bool
    is_owner: bool
    created_at: datetime
    updated_at: datetime


class ReviewAck(Schema):
    ok: bool


class HistoryDeleteAck(Schema):
    ok: bool
    deleted_profile_id: uuid.UUID | None = None
    deleted_session_id: uuid.UUID | None = None


class SkinProfileOut(Schema):
    id: uuid.UUID
    session_id: Optional[uuid.UUID]
    created_at: datetime
    primary_concerns: List[str]
    secondary_concerns: List[str]
    eye_area_concerns: List[str]
    skin_type: Optional[str]
    sensitivity: Optional[str]
    pregnant_or_breastfeeding: Optional[bool]
    ingredient_restrictions: List[str]
    budget: Optional[str]
    is_latest: bool


class QuizResultSummary(Schema):
    primary_concerns: List[str] = Field(default_factory=list)
    top_ingredients: List[str] = Field(default_factory=list)
    category_breakdown: Dict[str, float] = Field(default_factory=dict)
    generated_at: Optional[str] = None
    score_version: Optional[str] = None

    @field_validator("generated_at", mode="before")
    @classmethod
    def _serialize_generated_at(cls, value):
        if value is None:
            return None
        if isinstance(value, datetime):
            return value.isoformat()
        return str(value)

    @field_validator("category_breakdown", mode="before")
    @classmethod
    def _ensure_category_breakdown(cls, value):
        if value in (None, ""):
            return {}
        if isinstance(value, dict):
            sanitized: Dict[str, float] = {}
            for key, raw_value in value.items():
                try:
                    sanitized[str(key)] = float(raw_value)
                except (TypeError, ValueError):
                    continue
            return sanitized
        return {}


class FinalizeOut(Schema):
    session_id: uuid.UUID
    completed_at: datetime
    profile: Optional[SkinProfileOut] = None
    result_summary: dict
    requires_auth: bool = False


class HistoryItemOut(Schema):
    session_id: Optional[uuid.UUID]
    completed_at: datetime
    profile_id: Optional[uuid.UUID]
    primary_concerns: List[str]
    budget: Optional[str]
    profile: Optional[SkinProfileOut] = None
    result_summary: Dict[str, Any] | None = None
    answer_snapshot: Dict[str, Any] | None = None


class HistoryDetailOut(Schema):
    session_id: Optional[uuid.UUID]
    completed_at: datetime
    profile: Optional[SkinProfileOut]
    summary: QuizResultSummary
    recommendations: List[MatchPickOut]
    strategy_notes: List[str] = Field(default_factory=list)
    answer_snapshot: Dict[str, Any]


class MatchPickOut(Schema):
    product_id: str
    slug: str
    brand: str
    product_name: str
    category: str
    rank: int
    score: float
    price_snapshot: Optional[float]
    currency: str
    ingredients: List[str]
    rationale: dict
    image_url: Optional[str] = None
    product_url: Optional[str] = None
    average_rating: Optional[float] = None
    review_count: int = 0


class SessionDetailOut(Schema):
    session_id: uuid.UUID
    started_at: datetime
    completed_at: Optional[datetime]
    picks: List[MatchPickOut]
    profile: Optional[SkinProfileOut]


class FeedbackIn(Schema):
    session_id: Optional[uuid.UUID] = None
    contact_email: Optional[str] = None
    message: str
    metadata: dict = {}


class FeedbackAck(Schema):
    ok: bool


class HistoryDeleteAck(Schema):
    ok: bool
    was_latest: bool = False


class EmailSummaryIn(Schema):
    session_id: uuid.UUID
    email: Optional[str] = None


class EmailSummaryAck(Schema):
    ok: bool
