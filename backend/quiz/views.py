from __future__ import annotations

import uuid
from typing import Iterable

import logging
from django.conf import settings
from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.utils.text import slugify
from ninja import Router
from ninja.errors import HttpError
from django.core.mail import send_mail
from django.http import Http404

from core.models import SkinProfile
from core.auth import decode_token
from .models import (
    Answer,
    Choice,
    MatchPick,
    Product,
    ProductReview,
    Question,
    QuizFeedback,
    QuizSession,
)
from .ai import generate_strategy_notes
from .recommendations import recommend_products
from .schemas import (
    AnswerAck,
    AnswerIn,
    ChoiceOut,
    FinalizeOut,
    HistoryDetailOut,
    HistoryItemOut,
    FeedbackAck,
    FeedbackIn,
    MatchPickOut,
    QuestionOut,
    QuizResultSummary,
    EmailSummaryAck,
    EmailSummaryIn,
    ReviewAck,
    ReviewCreateIn,
    ReviewOut,
    SessionDetailOut,
    SessionOut,
    SkinProfileOut,
)

router = Router(tags=["quiz"])
User = get_user_model()
logger = logging.getLogger(__name__)


def _resolve_request_user(request):
    """
    Attempt to resolve the authenticated user for a request.
    Works for session auth (request.user) and raw Bearer tokens (Authorization header)
    so quiz endpoints can stay optional-auth while still binding sessions to users.
    """
    user = getattr(request, "user", None)
    if user and getattr(user, "is_authenticated", False):
        return user

    auth_header = ""
    if hasattr(request, "headers"):
        auth_header = request.headers.get("Authorization", "") or ""
    if not auth_header and hasattr(request, "META"):
        auth_header = request.META.get("HTTP_AUTHORIZATION", "") or ""

    if auth_header.lower().startswith("bearer "):
        token = auth_header[7:].strip()
        data = decode_token(token)
        if data and data.get("user_id"):
            try:
                return User.objects.get(id=data["user_id"])
            except User.DoesNotExist:
                return None
    return None

DEFAULT_QUIZ_FLOW: list[dict] = [
    {
        "key": "main_concern",
        "text": "What is your main skincare concern?",
        "choices": [
            {"label": "Acne & breakouts"},
            {"label": "Fine lines & wrinkles"},
            {"label": "Uneven skin texture"},
            {"label": "Blackheads"},
            {"label": "Hyperpigmentation"},
            {"label": "Acne scars"},
            {"label": "Dull skin"},
            {"label": "Damaged skin barrier"},
            {"label": "Redness"},
            {"label": "Excess oil"},
            {"label": "Dehydrated skin"},
        ],
    },
    {
        "key": "secondary_concern",
        "text": "Do you have any secondary concerns?",
        "choices": [
            {"label": "Acne & breakouts"},
            {"label": "Fine lines & wrinkles"},
            {"label": "Uneven skin texture"},
            {"label": "Blackheads"},
            {"label": "Hyperpigmentation"},
            {"label": "Acne scars"},
            {"label": "Dull skin"},
            {"label": "Damaged skin barrier"},
            {"label": "Redness"},
            {"label": "Excess oil"},
            {"label": "Dehydrated skin"},
        ],
    },
    {
        "key": "eye_concern",
        "text": "Do you have any eye area concerns?",
        "choices": [
            {"label": "Dark circles"},
            {"label": "Fine lines & wrinkles"},
            {"label": "Puffiness"},
            {"label": "None", "value": "none"},
        ],
    },
    {
        "key": "skin_type",
        "text": "Which best describes your skin type?",
        "choices": [
            {"label": "Normal"},
            {"label": "Oily"},
            {"label": "Dry"},
            {"label": "Combination"},
        ],
    },
    {
        "key": "sensitivity",
        "text": "Is your skin sensitive?",
        "choices": [
            {"label": "Yes"},
            {"label": "Sometimes"},
            {"label": "No"},
        ],
    },
    {
        "key": "pregnant_or_breastfeeding",
        "text": "Are you pregnant or breastfeeding?",
        "choices": [
            {"label": "Yes"},
            {"label": "No"},
        ],
    },
    {
        "key": "budget_preference",
        "text": "What’s your budget preference?",
        "choices": [
            {"label": "Affordable", "value": "affordable"},
            {"label": "Mid-range", "value": "mid"},
            {"label": "Premium / luxury", "value": "premium"},
        ],
    },
]


def _ensure_default_questions() -> None:
    with transaction.atomic():
        for order, config in enumerate(DEFAULT_QUIZ_FLOW, start=1):
            question, _ = Question.objects.update_or_create(
                key=config["key"],
                defaults={
                    "text": config["text"],
                    "is_multi": config.get("is_multi", False),
                    "order": order,
                },
            )
            desired_values: set[str] = set()
            for choice_order, choice_cfg in enumerate(config["choices"], start=1):
                label = choice_cfg["label"]
                value = choice_cfg.get("value") or slugify(label)
                desired_values.add(value)
                Choice.objects.update_or_create(
                    question=question,
                    value=value,
                    defaults={
                        "label": label,
                        "order": choice_order,
                    },
                )
            if desired_values:
                question.choices.exclude(value__in=desired_values).delete()


@router.get("/questions", response=list[QuestionOut])
def list_quiz_questions(request):
    _ensure_default_questions()
    questions = (
        Question.objects.prefetch_related("choices")
        .order_by("order")
    )
    return [_serialize_question(question) for question in questions]


def _get_session_for_request(session_id: uuid.UUID, request) -> QuizSession:
    session = get_object_or_404(QuizSession, id=session_id)
    if session.user_id:
        user = _resolve_request_user(request)
        if not user or not user.is_authenticated or user.id != session.user_id:
            raise HttpError(404, "Session not found")
    return session


@router.post("/start", response=SessionOut)
def start_quiz(request):
    _ensure_default_questions()
    user = _resolve_request_user(request)
    session = QuizSession.objects.create(user=user)
    return SessionOut(id=session.id, started_at=session.started_at)


@router.post("/feedback", response=FeedbackAck)
def submit_feedback(request, payload: FeedbackIn):
    session = None
    if payload.session_id:
        session = get_object_or_404(QuizSession, id=payload.session_id)
    feedback = QuizFeedback.objects.create(
        session=session,
        contact_email=payload.contact_email or "",
        message=payload.message.strip(),
        metadata=payload.metadata or {},
    )
    return FeedbackAck(ok=bool(feedback))


@router.post("/answer", response=AnswerAck)
def submit_answer(request, payload: AnswerIn):
    session = _get_session_for_request(payload.session_id, request)
    question = get_object_or_404(Question, id=payload.question_id)

    selected_choices = list(
        Choice.objects.filter(id__in=payload.choice_ids, question=question).order_by("order")
    )
    if not selected_choices:
        raise HttpError(400, "Invalid choice selection")

    if not question.is_multi and len(selected_choices) != 1:
        raise HttpError(400, "This question allows exactly one choice")

    answer, created = Answer.objects.get_or_create(session=session, question=question)
    if not created:
        answer.choices.clear()
    answer.choices.set(selected_choices)

    return AnswerAck(status="ok", updated=not created)


@router.post("/submit", response=FinalizeOut)
def submit_quiz(request, session_id: uuid.UUID):
    session = _get_session_for_request(session_id, request)
    request_user = _resolve_request_user(request)
    if request_user and not session.user_id:
        session.user = request_user

    answers = (
        session.answers.select_related("question")
        .prefetch_related("choices")
        .order_by("question__order")
    )
    if not answers.exists():
        raise HttpError(400, "No answers recorded for this session")

    answer_snapshot = _build_answer_snapshot(answers)
    profile_payload = _map_snapshot_to_profile(answer_snapshot)

    session.answer_snapshot = answer_snapshot
    session.profile_snapshot = profile_payload
    session.completed_at = timezone.now()

    require_auth = getattr(settings, "QUIZ_REQUIRE_AUTH_FOR_PRODUCTS", False)
    include_products = bool(session.user_id) or not require_auth
    result_payload = calculate_results(session, include_products=include_products)
    session.result_summary = result_payload
    session.save(update_fields=[
        "answer_snapshot",
        "profile_snapshot",
        "completed_at",
        "result_summary",
        "user",
    ])

    profile_out = None
    if include_products and session.user_id:
        profile = _persist_skin_profile(session, profile_payload)
        profile_out = _serialize_profile(profile)

    return FinalizeOut(
        session_id=session.id,
        completed_at=session.completed_at,
        profile=profile_out,
        result_summary=session.result_summary,
        requires_auth=not include_products,
    )


def _serialize_question(question: Question) -> QuestionOut:
    choices = [
        ChoiceOut(
            id=choice.id,
            label=choice.label,
            value=choice.value,
            order=choice.order,
        )
        for choice in question.choices.all()
    ]
    return QuestionOut(
        id=question.id,
        key=question.key,
        text=question.text,
        is_multi=question.is_multi,
        order=question.order,
        choices=choices,
    )


@router.get("/history", response=list[HistoryItemOut])
def quiz_history(request):
    user = _resolve_request_user(request)
    if not user or not user.is_authenticated:
        raise HttpError(401, "Authentication required")
    profiles = (
        SkinProfile.objects.filter(user=user)
        .select_related("session")
        .prefetch_related("session__picks", "session__picks__product")
        .order_by("-created_at")
    )

    return [
        HistoryItemOut(
            session_id=profile.session_id,
            completed_at=profile.created_at,
            profile_id=profile.id,
            primary_concerns=list(profile.primary_concerns or []),
            budget=profile.budget or None,
            profile=_serialize_profile(profile),
            result_summary=profile.result_summary or None,
            answer_snapshot=profile.answer_snapshot or None,
        )
        for profile in profiles
    ]


@router.get("/history/profile/{profile_id}", response=HistoryDetailOut)
def history_profile_detail(request, profile_id: uuid.UUID):
    user = _resolve_request_user(request)
    if not user or not user.is_authenticated:
        raise HttpError(401, "Authentication required")

    profile = get_object_or_404(
        SkinProfile.objects.select_related("session").filter(user=user), id=profile_id
    )

    summary_payload = profile.result_summary or {}
    summary = _map_history_summary(summary_payload.get("summary"))
    recommendations_payload = summary_payload.get("recommendations") or []
    strategy_notes_payload = summary_payload.get("strategy_notes") or []
    if not isinstance(strategy_notes_payload, list):
        strategy_notes_payload = []

    return HistoryDetailOut(
        session_id=profile.session_id,
        completed_at=profile.created_at,
        profile=_serialize_profile(profile),
        summary=summary,
        recommendations=[_serialize_pick_from_payload(payload) for payload in recommendations_payload],
        strategy_notes=[str(item).strip() for item in strategy_notes_payload if str(item).strip()],
        answer_snapshot=profile.answer_snapshot or {},
    )


@router.get("/session/{session_id}", response=SessionDetailOut)
def session_detail(request, session_id: uuid.UUID):
    session = get_object_or_404(
        QuizSession.objects.select_related("result_profile"), id=session_id
    )
    if session.user_id:
        user = getattr(request, "user", None)
        if not user or not user.is_authenticated or user.id != session.user_id:
            raise HttpError(404, "Session not found")

    picks_qs = session.picks.select_related("product").order_by("rank")
    picks = [_serialize_pick(pick) for pick in picks_qs]

    profile = (
        _serialize_profile(session.result_profile)
        if hasattr(session, "result_profile") and session.result_profile
        else None
    )

    return SessionDetailOut(
        session_id=session.id,
        started_at=session.started_at,
        completed_at=session.completed_at,
        picks=picks,
        profile=profile,
    )


@router.get("/products/{product_id}/reviews", response=list[ReviewOut])
def list_product_reviews(request, product_id: uuid.UUID, limit: int = 20):
    product = get_object_or_404(Product, id=product_id, is_active=True)
    user = _resolve_request_user(request)

    limit = max(1, min(limit, 100))
    base_qs = ProductReview.objects.filter(product=product)

    if user and user.is_authenticated:
        review_qs = base_qs.filter(Q(is_public=True) | Q(user=user))
    else:
        review_qs = base_qs.filter(is_public=True)

    reviews = (
        review_qs.select_related("user", "user__profile")
        .order_by("-created_at")
        [:limit]
    )

    return [_serialize_review(review, user) for review in reviews]


@router.post("/products/{product_id}/reviews", response=ReviewOut)
def upsert_product_review(request, product_id: uuid.UUID, payload: ReviewCreateIn):
    user = _resolve_request_user(request)
    if not user or not user.is_authenticated:
        raise HttpError(401, "Authentication required")

    product = get_object_or_404(Product, id=product_id, is_active=True)

    review, created = ProductReview.objects.get_or_create(
        product=product,
        user=user,
        defaults={
            "rating": payload.rating,
            "comment": payload.comment,
            "is_public": payload.is_public if payload.is_public is not None else True,
        },
    )

    if not created:
        review.comment = payload.comment
        review.rating = payload.rating
        if payload.is_public is not None:
            review.is_public = payload.is_public
        review.save()

    return _serialize_review(review, user)


@router.delete("/products/{product_id}/reviews", response=ReviewAck)
def delete_product_review(request, product_id: uuid.UUID):
    user = _resolve_request_user(request)
    if not user or not user.is_authenticated:
        raise HttpError(401, "Authentication required")

    product = get_object_or_404(Product, id=product_id, is_active=True)
    review = get_object_or_404(ProductReview, product=product, user=user)
    review.delete()
    return ReviewAck(ok=True)

@router.post("/email-summary", response=EmailSummaryAck)
def email_summary(request, payload: EmailSummaryIn):
    request_user = _resolve_request_user(request)
    target_email = (payload.email or "").strip()

    if not target_email:
        if request_user and getattr(request_user, "email", ""):
            target_email = request_user.email

    if not target_email:
        raise HttpError(400, "Email is required to send the summary.")

    traits: dict
    summary_data: dict
    recommendations_payload: list
    strategy_notes: list[str]

    session = None
    try:
        session = _get_session_for_request(payload.session_id, request)
    except HttpError as exc:
        if exc.status_code != 404:
            raise
        session = None
    except Http404:
        session = None

    if session:
        traits, summary_data, recommendations_payload, strategy_notes = _gather_summary_from_session(session)
    else:
        if not request_user or not request_user.is_authenticated:
            raise HttpError(401, "Authentication required.")
        profile = (
            SkinProfile.objects.filter(user=request_user, session_id=payload.session_id).first()
            or SkinProfile.objects.filter(user=request_user, is_latest=True).order_by("-created_at").first()
        )
        if not profile:
            raise HttpError(404, "Session not found.")
        traits, summary_data, recommendations_payload, strategy_notes = _gather_summary_from_profile(profile)

    subject = "Your SkinMatch routine roadmap"
    top_ingredients = summary_data.get("top_ingredients") or []
    primary = _format_csv(traits.get("primary_concerns"))
    secondary = _format_csv(traits.get("secondary_concerns"))
    eye_concerns = _format_csv(traits.get("eye_area_concerns"))
    restrictions = _format_csv(traits.get("restrictions"))

    lines = [
        "Hi there,",
        "",
        "Here's a copy of your SkinMatch routine roadmap:",
        "",
        f"Primary concerns: {primary or 'Not specified'}",
        f"Secondary concerns: {secondary or 'Not specified'}",
        f"Eye area concerns: {eye_concerns or 'Not specified'}",
        f"Skin type: {traits.get('skin_type') or 'Not specified'}",
        f"Sensitivity: {traits.get('sensitivity') or 'Not specified'}",
        f"Budget preference: {traits.get('budget') or 'Not specified'}",
    ]

    if restrictions:
        lines.append(f"Ingredient restrictions: {restrictions}")

    if top_ingredients:
        lines.append("")
        lines.append(f"Ingredients to prioritise: {', '.join(top_ingredients)}")

    if strategy_notes:
        lines.append("")
        lines.append("Strategy notes:")
        for note in strategy_notes:
            lines.append(f" • {note}")

    if recommendations_payload:
        lines.append("")
        lines.append("Highlighted matches:")
        for payload_item in recommendations_payload[:5]:
            product_name = payload_item.get("product_name") or payload_item.get("slug") or "Product"
            brand = payload_item.get("brand") or ""
            lines.append(f" • {brand} {product_name}".strip())

    lines.extend([
        "",
        "Need to tweak something? You can retake the quiz anytime to refresh this roadmap.",
        "",
        "— The SkinMatch Team",
    ])

    message = "\n".join(lines)
    from_email = getattr(settings, "DEFAULT_FROM_EMAIL", "no-reply@skinmatch.local")

    try:
        send_mail(subject, message, from_email, [target_email])
    except Exception:
        logger.exception("Failed to send SkinMatch summary email to %s", target_email)
        raise HttpError(500, "We couldn't send the email right now. Please try again later.")

    return EmailSummaryAck(ok=True)


def calculate_results(session: QuizSession, *, include_products: bool) -> dict:
    """Generate ranked recommendations for a completed quiz session."""

    profile = session.profile_snapshot or {}
    traits = _extract_profile_traits(profile)

    recommendations: list = []
    summary: dict = {}

    if include_products:
        recommendations, summary = recommend_products(
            primary_concerns=traits["primary_concerns"],
            secondary_concerns=traits["secondary_concerns"],
            eye_area_concerns=traits["eye_area_concerns"],
            skin_type=traits["skin_type"],
            sensitivity=traits["sensitivity"],
            restrictions=traits["restrictions"],
            budget=traits["budget"],
        )
    else:
        # still leverage scoring to build ingredient summary while hiding products
        _, summary = recommend_products(
            primary_concerns=traits["primary_concerns"],
            secondary_concerns=traits["secondary_concerns"],
            eye_area_concerns=traits["eye_area_concerns"],
            skin_type=traits["skin_type"],
            sensitivity=traits["sensitivity"],
            restrictions=traits["restrictions"],
            budget=traits["budget"],
        )

    session.picks.all().delete()

    picks_payload: list[dict] = []
    if include_products:
        for rank, recommendation in enumerate(recommendations, start=1):
            product = recommendation.product
            MatchPick.objects.create(
                session=session,
                product=product,
                product_slug=product.slug,
                product_name=product.name,
                brand=product.brand,
                category=product.category,
                rank=rank,
                score=recommendation.score,
                ingredients=recommendation.ingredients,
                price_snapshot=product.price,
                currency=product.currency,
                rationale=recommendation.rationale,
            )

            picks_payload.append(
                {
                    "product_id": str(product.id),
                    "slug": product.slug,
                    "brand": product.brand,
                    "product_name": product.name,
                    "category": product.category,
                    "rank": rank,
                    "score": _decimal_to_float(recommendation.score),
                    "price_snapshot": _decimal_to_float(product.price),
                    "currency": product.currency,
                    "image_url": product.image_url,
                    "product_url": product.product_url,
                    "ingredients": recommendation.ingredients,
                    "rationale": recommendation.rationale,
                    "brand_name": product.brand,
                    "average_rating": _decimal_to_float(product.rating),
                    "review_count": product.review_count,
                }
            )

    summary_payload = {
        **summary,
        "generated_at": timezone.now().isoformat(),
        "score_version": session.score_version,
    }

    strategy_notes = generate_strategy_notes(
        traits=traits,
        summary=summary_payload,
        recommendations=picks_payload,
    )

    return {
        "summary": summary_payload,
        "recommendations": picks_payload,
        "strategy_notes": strategy_notes,
    }


def _build_answer_snapshot(answers: Iterable[Answer]) -> dict:
    snapshot: dict[str, object] = {}
    for answer in answers:
        values = [choice.value for choice in answer.choices.all()]
        key = answer.question.key
        if answer.question.is_multi:
            snapshot[key] = values
        else:
            snapshot[key] = values[0] if values else None
    return snapshot


def _map_snapshot_to_profile(snapshot: dict) -> dict:
    def as_list(value) -> list[str]:
        if value is None:
            return []
        if isinstance(value, (list, tuple, set)):
            return [str(v) for v in value if v not in (None, "none", "None")]
        if value in ("none", "None"):
            return []
        return [str(value)]

    profile = {
        "primary_concerns": as_list(
            snapshot.get("main_concern") or snapshot.get("primary_concerns")
        ),
        "secondary_concerns": as_list(
            snapshot.get("secondary_concern") or snapshot.get("secondary_concerns")
        ),
        "eye_area_concerns": as_list(
            snapshot.get("eye_concern")
            or snapshot.get("eye_area_concerns")
            or snapshot.get("eye_concerns")
        ),
        "skin_type": snapshot.get("skin_type"),
        "sensitivity": snapshot.get("sensitivity"),
        "ingredient_restrictions": as_list(snapshot.get("ingredient_restrictions")),
        "budget": snapshot.get("budget") or snapshot.get("budget_preference"),
    }

    pregnancy_value = (
        snapshot.get("pregnant")
        or snapshot.get("pregnant_or_breastfeeding")
        or snapshot.get("pregnant_breastfeeding")
    )
    if pregnancy_value in (True, False, None):
        profile["pregnant_or_breastfeeding"] = pregnancy_value
    elif isinstance(pregnancy_value, str):
        normalized = pregnancy_value.lower().strip()
        if normalized in {"yes", "true"}:
            profile["pregnant_or_breastfeeding"] = True
        elif normalized in {"no", "false"}:
            profile["pregnant_or_breastfeeding"] = False
        else:
            profile["pregnant_or_breastfeeding"] = None
    else:
        profile["pregnant_or_breastfeeding"] = None

    return profile


def _persist_skin_profile(session: QuizSession, profile_payload: dict) -> SkinProfile:
    if not session.user_id:
        raise ValueError("Cannot persist skin profile for anonymous session")
    with transaction.atomic():
        SkinProfile.objects.filter(user=session.user, is_latest=True).update(is_latest=False)
        profile_defaults = {
            "primary_concerns": _ensure_list(profile_payload.get("primary_concerns")),
            "secondary_concerns": _ensure_list(profile_payload.get("secondary_concerns")),
            "eye_area_concerns": _ensure_list(profile_payload.get("eye_area_concerns")),
            "skin_type": _coerce_choice(profile_payload.get("skin_type")),
            "sensitivity": _coerce_choice(profile_payload.get("sensitivity")),
            "pregnant_or_breastfeeding": profile_payload.get("pregnant_or_breastfeeding"),
            "ingredient_restrictions": _ensure_list(profile_payload.get("ingredient_restrictions")),
            "budget": _coerce_choice(profile_payload.get("budget")),
            "answer_snapshot": session.answer_snapshot,
            "result_summary": session.result_summary,
            "score_version": session.score_version,
            "is_latest": True,
        }
        profile, created = SkinProfile.objects.get_or_create(
            user=session.user,
            session=session,
            defaults=profile_defaults,
        )
        if not created:
            for field, value in profile_defaults.items():
                setattr(profile, field, value)
            profile.save(
                update_fields=[
                    "primary_concerns",
                    "secondary_concerns",
                    "eye_area_concerns",
                    "skin_type",
                    "sensitivity",
                    "pregnant_or_breastfeeding",
                    "ingredient_restrictions",
                    "budget",
                    "answer_snapshot",
                    "result_summary",
                    "score_version",
                    "is_latest",
                    "updated_at",
                ]
            )
    return profile


def _serialize_profile(profile: SkinProfile | None) -> SkinProfileOut | None:
    if not profile:
        return None
    return SkinProfileOut(
        id=profile.id,
        session_id=profile.session_id,
        created_at=profile.created_at,
        primary_concerns=list(profile.primary_concerns or []),
        secondary_concerns=list(profile.secondary_concerns or []),
        eye_area_concerns=list(profile.eye_area_concerns or []),
        skin_type=profile.skin_type or None,
        sensitivity=profile.sensitivity or None,
        pregnant_or_breastfeeding=profile.pregnant_or_breastfeeding,
        ingredient_restrictions=list(profile.ingredient_restrictions or []),
        budget=profile.budget or None,
        is_latest=profile.is_latest,
    )


def _map_history_summary(raw: dict | None) -> QuizResultSummary:
    data = raw or {}
    return QuizResultSummary(
        primary_concerns=list(data.get("primary_concerns") or []),
        top_ingredients=list(data.get("top_ingredients") or []),
        category_breakdown=dict(data.get("category_breakdown") or {}),
        generated_at=data.get("generated_at"),
        score_version=data.get("score_version"),
    )


def _serialize_pick(pick: MatchPick) -> MatchPickOut:
    product = getattr(pick, "product", None)
    return MatchPickOut(
        product_id=str(pick.product_id),
        slug=pick.product_slug,
        brand=pick.brand,
        product_name=pick.product_name,
        category=pick.category,
        rank=pick.rank,
        score=float(pick.score),
        price_snapshot=float(pick.price_snapshot) if pick.price_snapshot is not None else None,
        currency=pick.currency,
        ingredients=list(pick.ingredients or []),
        rationale=pick.rationale or {},
        image_url=getattr(product, "image_url", None),
        product_url=getattr(product, "product_url", None),
        average_rating=_decimal_to_float(getattr(product, "rating", None)),
        review_count=getattr(product, "review_count", 0) or 0,
    )


def _serialize_pick_from_payload(payload: dict) -> MatchPickOut:
    return MatchPickOut(
        product_id=str(payload.get("product_id", "")),
        slug=str(payload.get("slug", "")),
        brand=str(payload.get("brand", "")),
        product_name=str(payload.get("product_name", "")),
        category=str(payload.get("category", "")),
        rank=int(payload.get("rank", 0) or 0),
        score=float(payload.get("score", 0) or 0),
        price_snapshot=float(payload.get("price_snapshot")) if payload.get("price_snapshot") is not None else None,
        currency=str(payload.get("currency", "USD") or "USD"),
        ingredients=list(payload.get("ingredients") or []),
        rationale=payload.get("rationale") or {},
        image_url=payload.get("image_url"),
        product_url=payload.get("product_url"),
        average_rating=_decimal_to_float(payload.get("average_rating")),
        review_count=int(payload.get("review_count", 0) or 0),
    )


def _extract_profile_traits(profile: dict) -> dict:
    return {
        "primary_concerns": _ensure_list(profile.get("primary_concerns")),
        "secondary_concerns": _ensure_list(profile.get("secondary_concerns")),
        "eye_area_concerns": _ensure_list(profile.get("eye_area_concerns")),
        "skin_type": _ensure_str(profile.get("skin_type")),
        "sensitivity": _ensure_str(profile.get("sensitivity")),
        "restrictions": _ensure_list(profile.get("ingredient_restrictions")),
        "budget": _ensure_str(profile.get("budget")),
    }


def _ensure_list(value) -> list[str]:
    if not value:
        return []
    if isinstance(value, (list, tuple, set)):
        return [str(item).strip() for item in value if item]
    return [str(value).strip()]


def _ensure_str(value) -> str | None:
    if not value:
        return None
    text = str(value).strip()
    return text or None


def _format_csv(values) -> str:
    items = _ensure_list(values)
    return ", ".join(item for item in items if item)


def _gather_summary_from_session(session: QuizSession) -> tuple[dict, dict, list, list[str]]:
    profile_snapshot = session.profile_snapshot or {}
    traits = _extract_profile_traits(profile_snapshot)
    result_summary = session.result_summary or {}
    summary_data = result_summary.get("summary") or {}
    recommendations = result_summary.get("recommendations") or []
    strategy_notes = result_summary.get("strategy_notes") or []

    if not strategy_notes:
        strategy_notes = generate_strategy_notes(
            traits=traits,
            summary=summary_data,
            recommendations=recommendations,
        )

    return traits, summary_data, recommendations, strategy_notes


def _gather_summary_from_profile(profile: SkinProfile) -> tuple[dict, dict, list, list[str]]:
    traits = {
        "primary_concerns": list(profile.primary_concerns or []),
        "secondary_concerns": list(profile.secondary_concerns or []),
        "eye_area_concerns": list(profile.eye_area_concerns or []),
        "skin_type": profile.skin_type or None,
        "sensitivity": profile.sensitivity or None,
        "restrictions": list(profile.ingredient_restrictions or []),
        "budget": profile.budget or None,
    }

    summary_payload = profile.result_summary or {}
    summary_data = summary_payload.get("summary") or {}
    recommendations = summary_payload.get("recommendations") or []
    strategy_notes = summary_payload.get("strategy_notes") or []

    if not strategy_notes:
        strategy_notes = generate_strategy_notes(
            traits=traits,
            summary=summary_data,
            recommendations=recommendations,
        )

    return traits, summary_data, recommendations, strategy_notes


def _coerce_choice(value) -> str:
    """
    Ensure optional choice fields (skin_type, sensitivity, budget) never insert NULL.
    """
    if value in (None, False):
        return ""
    text = str(value).strip()
    if not text or text.lower() in {"none", "null"}:
        return ""
    return text


def _decimal_to_float(value):
    if value is None:
        return None
    return float(value)


def _serialize_review(review: ProductReview, current_user) -> ReviewOut:
    user = review.user
    profile = getattr(user, "profile", None)
    display_name = (user.get_full_name() or "").strip() or user.get_username()
    is_owner = bool(
        current_user
        and getattr(current_user, "is_authenticated", False)
        and user.id == current_user.id
    )

    return ReviewOut(
        id=review.id,
        product_id=review.product_id,
        user_id=str(user.id),
        user_display_name=display_name,
        avatar_url=getattr(profile, "avatar_url", None),
        rating=review.rating,
        comment=review.comment,
        is_public=review.is_public,
        is_owner=is_owner,
        created_at=review.created_at,
        updated_at=review.updated_at,
    )
