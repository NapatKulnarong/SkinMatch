import uuid
from datetime import datetime
from typing import List, Optional

from ninja import Schema


class SessionOut(Schema):
    id: uuid.UUID
    started_at: datetime


class AnswerIn(Schema):
    session_id: uuid.UUID
    question_id: uuid.UUID
    choice_ids: List[uuid.UUID]


class AnswerAck(Schema):
    status: str
    updated: bool = False


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
