from __future__ import annotations

import os
import uuid
from typing import Iterable
from urllib.parse import quote, urlparse
import hashlib
import re
import logging
from django.conf import settings
from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import Avg, Count, Prefetch, Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.utils.text import slugify
from ninja import Router
from ninja.errors import HttpError
from django.core.mail import send_mail
from django.http import Http404
from django.utils.html import escape

from core.models import SkinProfile
from core.auth import decode_token
from core.sanitizers import sanitize_plain_text, sanitize_metadata_dict
from .models import (
    Answer,
    Choice,
    Ingredient,
    MatchPick,
    Product,
    ProductIngredient,
    ProductConcern,
    ProductReview,
    RestrictionTag,
    Question,
    QuizFeedback,
    QuizSession,
    SkinConcern,
    SkinTypeTag,
)
from .ai import generate_ingredient_benefit, generate_strategy_notes
from .catalog_loader import ensure_sample_catalog
from .recommendations import recommend_products
from .schemas import (
    AnswerAck,
    AnswerIn,
    ChoiceOut,
    FinalizeOut,
    HistoryDetailOut,
    HistoryItemOut,
    HistoryDeleteAck,
    FeedbackAck,
    FeedbackIn,
    FeedbackOut,
    IngredientBenefitOut,
    IngredientSearchOut,
    IngredientSuggestionResponse,
    MatchPickOut,
    ProductDetailOut,
    ProductSearchOut,
    ProductSuggestionResponse,
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
    SkincareProductSummaryOut,
)

router = Router(tags=["quiz"])
User = get_user_model()
logger = logging.getLogger(__name__)
EMAIL_REGEX = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")

def _resolve_request_user(request):
    """
    Attempt to resolve the authenticated user for a request.
    Works for session auth (request.user) and raw Bearer tokens (Authorization header)
    so quiz endpoints can stay optional-auth while still binding sessions to users.
    """
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
                pass

    user = getattr(request, "user", None)
    if user and getattr(user, "is_authenticated", False):
        return user
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


def _category_label(category: str | None) -> str:
    if not category:
        return ""
    try:
        return Product.Category(category).label
    except ValueError:
        return category.replace("_", " ").replace("-", " ").title()


REVIEW_FILTER = Q(reviews__is_public=True)
PRODUCT_REVIEW_ANNOTATIONS = {
    "community_review_count": Count("reviews", filter=REVIEW_FILTER),
    "community_avg_rating": Avg(
        "reviews__rating",
        filter=REVIEW_FILTER & Q(reviews__rating__isnull=False),
    ),
}


@router.get("/ingredients/suggest", response=IngredientSuggestionResponse)
def ingredient_suggestions(
    request,
    q: str,
    limit: int = 8,
):
    query = (q or "").strip()
    if not query:
        return {"query": "", "suggestions": []}

    suggestion_limit = max(1, min(limit, 12))
    slug_candidate = slugify(query)

    filters = Q(common_name__icontains=query) | Q(inci_name__icontains=query)
    if slug_candidate:
        filters |= Q(key__icontains=slug_candidate)

    ingredients = list(
        Ingredient.objects.filter(filters)
        .annotate(
            product_count=Count(
                "products",
                filter=Q(products__is_active=True),
                distinct=True,
            )
        )
        .filter(product_count__gt=0)
    )

    if not ingredients:
        return {"query": query, "suggestions": []}

    query_lower = query.lower()
    slug_lower = slug_candidate.lower() if slug_candidate else ""

    scored: list[tuple[Ingredient, int, int, str]] = []
    for ingredient in ingredients:
        score = 0
        common_name = ingredient.common_name or ""
        common_lower = common_name.lower()
        if common_lower == query_lower:
            score += 6
        elif common_lower.startswith(query_lower):
            score += 2

        inci_lower = ""
        if ingredient.inci_name:
            inci_lower = ingredient.inci_name.lower()
            if inci_lower == query_lower:
                score += 5
            elif inci_lower.startswith(query_lower):
                score += 1

        if slug_lower and ingredient.key.lower() == slug_lower:
            score += 4

        primary_name = common_name or ingredient.inci_name or ingredient.key
        scored.append((ingredient, score, int(ingredient.product_count or 0), primary_name))

    scored.sort(
        key=lambda item: (
            -item[1],
            -item[2],
            item[3].lower(),
        )
    )

    trimmed = scored[:suggestion_limit]
    suggestions = [
        {
            "key": ingredient.key,
            "common_name": ingredient.common_name,
            "inci_name": ingredient.inci_name or None,
            "product_count": int(ingredient.product_count or 0),
        }
        for ingredient, _score, _count, _name in trimmed
    ]

    return {"query": query, "suggestions": suggestions}


@router.get("/ingredients/search", response=IngredientSearchOut)
def ingredient_quick_search(
    request,
    q: str,
    limit: int = 12,
    ingredient_limit: int = 5,
):
    query = (q or "").strip()
    if not query:
        raise HttpError(400, "Ingredient query cannot be blank.")

    product_limit = max(1, min(limit, 24))
    ingredient_cap = max(1, min(ingredient_limit, 10))
    slug_candidate = slugify(query)

    filters = Q(common_name__icontains=query) | Q(inci_name__icontains=query)
    if slug_candidate:
        filters |= Q(key__icontains=slug_candidate)

    product_prefetch = Prefetch(
        "productingredient_set",
        queryset=(
            ProductIngredient.objects.filter(product__is_active=True)
            .select_related("product")
            .order_by("order", "product__brand", "product__name")[:product_limit]
        ),
        to_attr="matching_links",
    )

    ingredients = list(
        Ingredient.objects.filter(filters)
        .annotate(
            product_count=Count(
                "products",
                filter=Q(products__is_active=True),
                distinct=True,
            )
        )
        .filter(product_count__gt=0)
        .prefetch_related(product_prefetch)
    )

    if not ingredients:
        return {"query": query, "results": []}

    query_lower = query.lower()
    slug_lower = slug_candidate.lower() if slug_candidate else ""

    scored: list[tuple[Ingredient, int, int]] = []
    for ingredient in ingredients:
        score = 0
        common_lower = ingredient.common_name.lower()
        if common_lower == query_lower:
            score += 6
        elif common_lower.startswith(query_lower):
            score += 2
        if ingredient.inci_name and ingredient.inci_name.lower() == query_lower:
            score += 4
        if slug_lower and ingredient.key.lower() == slug_lower:
            score += 5
        scored.append((ingredient, score, int(ingredient.product_count or 0)))

    scored.sort(
        key=lambda item: (
            -item[1],
            -item[2],
            item[0].common_name.lower(),
        )
    )

    trimmed = scored[:ingredient_cap]

    def to_float(value):
        if value is None:
            return None
        return float(value)

    results_payload: list[dict] = []
    for ingredient, _score, _count in trimmed:
        category_counts = (
            Product.objects.filter(
                productingredient__ingredient=ingredient,
                is_active=True,
            )
            .values("category")
            .annotate(total=Count("id", distinct=True))
            .order_by("-total", "category")[:3]
        )
        popular_categories = [
            _category_label(row["category"]) for row in category_counts if row.get("category")
        ]

        concern_counts = (
            ProductConcern.objects.filter(
                product__productingredient__ingredient=ingredient,
                product__is_active=True,
            )
            .values("concern__name")
            .annotate(total=Count("product_id", distinct=True))
            .order_by("-total", "concern__name")[:4]
        )
        top_concerns = [
            row["concern__name"] for row in concern_counts if row.get("concern__name")
        ]

        product_entries: list[dict] = []
        for link in getattr(ingredient, "matching_links", []):
            product = link.product
            image_url = _product_image_url(product)
            product_url = _sanitize_product_url(product.product_url)
            price_value = to_float(product.price)
            if price_value == 0:
                price_value = None
            product_entries.append(
                {
                    "product_id": product.id,
                    "slug": product.slug,
                    "brand": product.brand,
                    "product_name": product.name,
                    "category": product.category,
                    "summary": product.summary or None,
                    "hero_ingredients": product.hero_ingredients or None,
                    "ingredient_order": link.order,
                    "ingredient_highlight": bool(link.highlight),
                    "price": price_value,
                    "currency": product.currency,
                    "average_rating": to_float(product.rating),
                    "review_count": product.review_count,
                    "image_url": image_url,
                    "image": product.image or None,
                    "product_url": product_url,
                }
            )
        results_payload.append(
            {
                "ingredient": {
                    "key": ingredient.key,
                    "common_name": ingredient.common_name,
                    "inci_name": ingredient.inci_name or None,
                    "benefits": ingredient.benefits or None,
                    "helps_with": ingredient.helps_with or None,
                    "avoid_with": ingredient.avoid_with or None,
                    "side_effects": ingredient.side_effects or None,
                    "product_count": int(ingredient.product_count or 0),
                    "popular_categories": popular_categories,
                    "top_concerns": top_concerns,
                },
                "products": product_entries,
            }
        )

    return {"query": query, "results": results_payload}


@router.get("/ingredients/benefit", response=IngredientBenefitOut)
def ingredient_benefit_lookup(request, name: str):
    cleaned = (name or "").strip()
    if not cleaned:
        raise HttpError(400, "Ingredient name cannot be blank.")

    slug_candidate = slugify(cleaned)
    ingredient = (
        Ingredient.objects.filter(
            Q(common_name__iexact=cleaned)
            | Q(inci_name__iexact=cleaned)
            | Q(key__iexact=cleaned)
            | Q(key__iexact=slug_candidate)
        )
        .first()
    )

    if ingredient:
        benefit_text = (ingredient.benefits or "").strip()
        if benefit_text:
            return {
                "ingredient": ingredient.common_name,
                "benefit": benefit_text,
                "source": "catalog",
            }

    ai_benefit = generate_ingredient_benefit(cleaned)
    return {
        "ingredient": ingredient.common_name if ingredient else cleaned,
        "benefit": ai_benefit,
        "source": "gemini" if ai_benefit else "fallback",
    }


@router.get("/products/suggest", response=ProductSuggestionResponse)
def product_suggestions(request, q: str, limit: int = 8):
    query = (q or "").strip()
    if not query:
        return {"query": "", "suggestions": []}

    suggestion_limit = max(1, min(limit, 12))
    slug_candidate = slugify(query)
    filters = (
        Q(name__icontains=query)
        | Q(brand__icontains=query)
        | Q(hero_ingredients__icontains=query)
    )
    if slug_candidate:
        filters |= Q(slug__icontains=slug_candidate)

    candidate_limit = max(suggestion_limit * 4, 24)
    products = list(
        Product.objects.filter(is_active=True)
        .filter(filters)
        .annotate(**PRODUCT_REVIEW_ANNOTATIONS)
        .order_by("brand", "name")[:candidate_limit]
    )

    if not products:
        return {"query": query, "suggestions": []}

    query_lower = query.lower()
    slug_lower = slug_candidate.lower() if slug_candidate else None
    scored: list[tuple[Product, int, float, int, str, str]] = []
    for product in products:
        match_score = _score_product_match(product, query_lower, slug_lower)
        average_rating, review_count = _derive_review_stats(product)
        scored.append(
            (
                product,
                match_score,
                float(average_rating or 0.0),
                review_count,
                (product.brand or "").lower(),
                (product.name or "").lower(),
            )
        )

    scored.sort(key=lambda item: (-item[1], -item[2], -item[3], item[4], item[5]))
    suggestions = [
        _serialize_product_summary(product, hero_limit=3) for product, *_rest in scored[:suggestion_limit]
    ]
    return {"query": query, "suggestions": suggestions}


@router.get("/products/search", response=ProductSearchOut)
def product_search(request, q: str, limit: int = 12):
    query = (q or "").strip()
    if not query:
        raise HttpError(400, "Product query cannot be blank.")

    search_limit = max(1, min(limit, 30))
    slug_candidate = slugify(query)
    filters = (
        Q(name__icontains=query)
        | Q(brand__icontains=query)
        | Q(summary__icontains=query)
        | Q(hero_ingredients__icontains=query)
        | Q(description__icontains=query)
    )
    if slug_candidate:
        filters |= Q(slug__icontains=slug_candidate)

    candidate_limit = max(search_limit * 4, 40)
    products = list(
        Product.objects.filter(is_active=True)
        .filter(filters)
        .annotate(**PRODUCT_REVIEW_ANNOTATIONS)
        .order_by("brand", "name")[:candidate_limit]
    )

    if not products:
        return {"query": query, "results": []}

    query_lower = query.lower()
    slug_lower = slug_candidate.lower() if slug_candidate else None
    scored: list[tuple[Product, int, float, int, str, str]] = []
    for product in products:
        match_score = _score_product_match(product, query_lower, slug_lower)
        average_rating, review_count = _derive_review_stats(product)
        scored.append(
            (
                product,
                match_score,
                float(average_rating or 0.0),
                review_count,
                (product.brand or "").lower(),
                (product.name or "").lower(),
            )
        )

    scored.sort(key=lambda item: (-item[1], -item[2], -item[3], item[4], item[5]))
    results = [_serialize_product_summary(product) for product, *_rest in scored[:search_limit]]
    return {"query": query, "results": results}


@router.get("/products/top", response=list[SkincareProductSummaryOut])
def top_reviewed_products(request, limit: int = 5):
    top_limit = max(1, min(limit, 12))
    candidate_limit = max(top_limit * 3, 20)

    products = list(
        Product.objects.filter(is_active=True)
        .annotate(**PRODUCT_REVIEW_ANNOTATIONS)
        .order_by("brand", "name")[:candidate_limit]
    )

    if not products:
        return []

    scored: list[tuple[Product, int, float, int, str, str]] = []
    for product in products:
        review_count = getattr(product, "community_review_count", 0) or 0
        has_user_reviews = 1 if review_count > 0 else 0
        average_rating, fallback_count = _derive_review_stats(product)
        scored.append(
            (
                product,
                has_user_reviews,
                float(average_rating or 0.0),
                fallback_count,
                (product.brand or "").lower(),
                (product.name or "").lower(),
            )
        )

    scored.sort(key=lambda item: (-item[1], -item[2], -item[3], item[4], item[5]))
    return [_serialize_product_summary(product) for product, *_rest in scored[:top_limit]]


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
    metadata = _sanitize_feedback_metadata(payload.metadata)
    message = _compose_feedback_message(payload.message, payload.rating)
    feedback = QuizFeedback.objects.create(
        session=session,
        message=message,
        rating=payload.rating,
        metadata=metadata,
    )
    return FeedbackAck(ok=bool(feedback))


def _sanitize_feedback_metadata(metadata: dict | None) -> dict[str, str]:
    return sanitize_metadata_dict(metadata)


def _compose_feedback_message(raw_message: str | None, rating: int | None) -> str:
    message = (raw_message or "").strip()
    if message:
        return message
    if rating:
        suffix = "s" if rating != 1 else ""
        return f"Rated {rating} star{suffix}."
    return "Feedback submitted."


def _initials_from_name(name: str) -> str:
    cleaned = name.replace("_", " ").strip()
    if not cleaned:
        return "SM"
    parts = [part for part in cleaned.split() if part]
    if not parts:
        return "SM"
    if len(parts) == 1:
        token = parts[0]
        return (token[:2] if len(token) > 1 else token[0]).upper()
    return (parts[0][0] + parts[1][0]).upper()


@router.get("/feedback/highlights", response=list[FeedbackOut])
def list_feedback_highlights(request, limit: int = 6):
    """Return up to `limit` feedback entries, deduplicated per user by rating/newness."""

    capped_limit = max(1, min(limit, 12))
    fetch_ceiling = capped_limit * 6  # pull extra rows to allow deduplication

    try:
        queryset = (
            QuizFeedback.objects.select_related("session__user")
            .filter(rating__isnull=False)
            .exclude(message__isnull=True)
            .exclude(message__exact="")
            .order_by("-rating", "-created_at")
        )

        highlights: list[QuizFeedback] = []
        seen_user_ids: set[int] = set()

        for feedback in queryset[:fetch_ceiling]:
            user_id = None
            if feedback.session_id and feedback.session and feedback.session.user_id:
                user_id = feedback.session.user_id

            if user_id is not None:
                if user_id in seen_user_ids:
                    continue
                seen_user_ids.add(user_id)

            highlights.append(feedback)
            if len(highlights) >= capped_limit:
                break

        return [_serialize_feedback(feedback) for feedback in highlights]
    except Exception as error:
        logger.warning("Unable to load feedback highlights: %s", error)
        return []


def _serialize_feedback(feedback: QuizFeedback) -> dict:
    metadata = _sanitize_feedback_metadata(
        feedback.metadata if isinstance(feedback.metadata, dict) else {}
    )
    display_name = sanitize_plain_text(
        metadata.get("display_name") or metadata.get("name") or ""
    )

    user = None
    if feedback.session_id:
        user = getattr(feedback.session, "user", None)

    if not display_name and user is not None:
        first = (user.first_name or "").strip()
        last = (user.last_name or "").strip()
        if first and last:
            display_name = f"{first} {last[0]}."
        elif first:
            display_name = first
        elif last:
            display_name = last
        else:
            display_name = getattr(user, "username", "") or getattr(user, "email", "")

    display_name = sanitize_plain_text(display_name)
    if not display_name:
        display_name = "SkinMatch member"

    initials = sanitize_plain_text(
        metadata.get("initials") or ""
    ) or _initials_from_name(display_name)
    location = sanitize_plain_text(metadata.get("location") or "") or None
    badge = sanitize_plain_text(metadata.get("badge") or "") or None

    anonymous_flag = sanitize_plain_text(metadata.get("anonymous") or "").lower()
    is_anonymous = anonymous_flag in {"1", "true", "yes", "anon"}

    if is_anonymous:
        display_name = "SkinMatch member"
        initials = "SM"
        location = None

    if not badge and feedback.session_id:
        snapshot = getattr(feedback.session, "profile_snapshot", {}) or {}
        if isinstance(snapshot, dict):
            primary = snapshot.get("primary_concerns")
            if isinstance(primary, list) and primary:
                badge = str(primary[0])

    message = sanitize_plain_text(feedback.message)

    return {
        "id": feedback.id,
        "created_at": feedback.created_at,
        "rating": feedback.rating,
        "message": message,
        "display_name": display_name,
        "initials": initials,
        "location": location,
        "badge": badge,
    }


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


@router.delete("/history/{history_id}", response=HistoryDeleteAck)
def delete_history_item(request, history_id: uuid.UUID):
    user = _resolve_request_user(request)
    if not user or not user.is_authenticated:
        raise HttpError(401, "Authentication required")

    profile = (
        SkinProfile.objects.filter(user=user, id=history_id).first()
        or SkinProfile.objects.filter(user=user, session_id=history_id).first()
    )
    if not profile:
        raise HttpError(404, "Match history item not found")

    was_latest = profile.is_latest
    session = profile.session

    with transaction.atomic():
        profile.delete()

        if session and session.user_id == user.id:
            session.delete()

        if was_latest:
            replacement = (
                SkinProfile.objects.filter(user=user)
                .order_by("-created_at")
                .first()
            )
            if replacement:
                SkinProfile.objects.filter(pk=replacement.pk).update(is_latest=True)

    return HistoryDeleteAck(ok=True, was_latest=was_latest)


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


@router.delete("/history/{history_id}", response=HistoryDeleteAck)
def delete_history_item(request, history_id: uuid.UUID):
    user = _resolve_request_user(request)
    if not user or not user.is_authenticated:
        raise HttpError(401, "Authentication required")

    profile = (
        SkinProfile.objects.select_related("session")
        .filter(user=user)
        .filter(Q(id=history_id) | Q(session_id=history_id))
        .first()
    )

    if not profile:
        raise HttpError(404, "Match history item not found")

    session = profile.session
    profile_id = profile.id
    session_id = session.id if session else None

    with transaction.atomic():
        profile.delete()
        if session:
            session.delete()

    return HistoryDeleteAck(
        ok=True,
        deleted_profile_id=profile_id,
        deleted_session_id=session_id,
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
    picks: list[MatchPickOut] = []
    for pick in picks_qs:
        product = pick.product
        image_url = pick.image_url
        product_url = pick.product_url
        average_rating = None
        review_count = 0
        if product:
            image_url = image_url or _product_image_url(product)
            product_url = product_url or _sanitize_product_url(product.product_url)
            average_rating = _decimal_to_float(product.rating)
            review_count = product.review_count

        picks.append(
            MatchPickOut(
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
                image_url=image_url or None,
                product_url=product_url or None,
                average_rating=average_rating,
                review_count=review_count,
            )
        )

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


@router.get("/products/{product_id}", response=ProductDetailOut)
def product_detail(request, product_id: uuid.UUID):
    product = get_object_or_404(_product_detail_queryset(), id=product_id)
    return _serialize_product_detail(product)


@router.get("/products/slug/{slug}", response=ProductDetailOut)
def product_detail_by_slug(request, slug: str):
    cleaned = (slug or "").strip()
    if not cleaned:
        raise HttpError(400, "Product slug cannot be blank.")
    product = get_object_or_404(_product_detail_queryset(), slug__iexact=cleaned)
    return _serialize_product_detail(product)


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
            "is_anonymous": bool(payload.anonymous),
        },
    )

    if not created:
        review.comment = payload.comment
        review.rating = payload.rating
        if payload.is_public is not None:
            review.is_public = payload.is_public
        review.is_anonymous = bool(payload.anonymous)
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

def _build_quiz_summary_email_html(
    traits: dict,
    summary_data: dict,
    recommendations_payload: list,
    strategy_notes: list[str],
) -> str:
    """Generate HTML email template for quiz summary email."""
    
    # Get site URL for links
    site_url = (
        getattr(settings, "SITE_URL", None) 
        or os.environ.get("SITE_URL") 
        or getattr(settings, "FRONTEND_ORIGIN", "http://localhost:3000")
        or "http://localhost:3000"
    ).rstrip("/")
    
    # Format data
    top_ingredients = summary_data.get("top_ingredients") or []
    primary = _format_csv(traits.get("primary_concerns")) or "Not specified"
    secondary = _format_csv(traits.get("secondary_concerns")) or "Not specified"
    eye_concerns = _format_csv(traits.get("eye_area_concerns")) or "Not specified"
    skin_type = traits.get("skin_type") or "Not specified"
    sensitivity = traits.get("sensitivity") or "Not specified"
    budget = traits.get("budget") or "Not specified"
    restrictions = _format_csv(traits.get("restrictions"))
    
    # Build profile section (escape HTML for security) - single column layout, each item takes full width
    profile_items = []
    profile_data = [
        ("Primary concerns", primary),
        ("Secondary concerns", secondary),
        ("Eye area concerns", eye_concerns),
        ("Skin type", skin_type),
        ("Sensitivity", sensitivity),
        ("Budget preference", budget),
    ]
    if restrictions:
        profile_data.append(("Ingredient restrictions", restrictions))
    
    for label, value in profile_data:
        profile_items.append(f'''
                            <tr>
                                <td style="padding: 8px 0;">
                                    <div style="border: 2px dashed rgba(0,0,0,0.5); border-radius: 16px; background: rgba(255,255,255,0.8); padding: 12px 16px;">
                                        <p style="margin: 0 0 4px 0; font-size: 10px; text-transform: uppercase; letter-spacing: 0.15em; color: #767394; font-weight: 600;">{escape(label)}</p>
                                        <p style="margin: 0; font-size: 14px; font-weight: 600; color: #3C3D37;">{escape(value)}</p>
                                    </div>
                                </td>
                            </tr>
        ''')
    
    profile_html = "".join(profile_items)
    
    # Build ingredients section with bullets
    ingredients_html = ""
    if top_ingredients:
        ingredient_items = []
        for ing in top_ingredients:
            ingredient_items.append(f'<li style="margin: 12px 0; color: #1f2d26; font-size: 15px; line-height: 1.7; font-weight: 600; list-style: none; display: flex; align-items: flex-start;"><span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: #33574a; margin-right: 12px; margin-top: 6px; flex-shrink: 0;"></span>{escape(ing)}</li>')
        ingredients_list = "".join(ingredient_items)
        ingredients_html = f"""
                            <tr>
                                <td class="content-padding" style="padding: 0 40px 24px 40px;">
                                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="width: 100%; background: linear-gradient(to bottom right, #FFFFFF, #A7E399); border: 2px solid #000000; border-radius: 24px; box-shadow: 6px 8px 0 rgba(0,0,0,0.25);">
                                        <tr>
                                            <td style="padding: 32px;">
                                                <h4 style="margin: 0 0 20px 0; color: #33574a; font-size: 20px; font-weight: 800;">🧪 Ingredients to Prioritize</h4>
                                                <ul style="margin: 0; padding: 0;">
                                                    {ingredients_list}
                                                </ul>
                                            </td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>
        """
    
    # Build strategy notes section
    strategy_html = ""
    if strategy_notes:
        strategy_items = []
        for note in strategy_notes:
            strategy_items.append(f'<li style="margin: 10px 0; color: #1b2a50; font-size: 14px; line-height: 1.7; font-weight: 500;">{escape(note)}</li>')
        strategy_list = "".join(strategy_items)
        strategy_html = f"""
                            <tr>
                                <td class="content-padding" style="padding: 0 40px 24px 40px;">
                                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="width: 100%; background: linear-gradient(to bottom right, #FFFFFF, #A3CCDA); border: 2px solid #000000; border-radius: 24px; box-shadow: 6px 8px 0 rgba(0,0,0,0.25);">
                                        <tr>
                                            <td style="padding: 32px;">
                                                <h4 style="margin: 0 0 20px 0; color: #33574a; font-size: 20px; font-weight: 800;">📋 Strategy Notes</h4>
                                                <ul style="margin: 0; padding-left: 20px; list-style-type: disc;">
                                                    {strategy_list}
                                                </ul>
                                            </td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>
        """
    
    # Build product recommendations section
    products_html = ""
    if recommendations_payload:
        product_items = []
        for payload_item in recommendations_payload[:5]:
            product_name = payload_item.get("product_name") or payload_item.get("slug") or "Product"
            brand = payload_item.get("brand") or ""
            full_name = f"{brand} {product_name}".strip() if brand else product_name
            product_items.append(f'<li style="margin: 10px 0; color: #3C3D37; font-size: 14px; line-height: 1.7; font-weight: 500;">{escape(full_name)}</li>')
        products_list = "".join(product_items)
        products_html = f"""
                            <tr>
                                <td class="content-padding" style="padding: 0 40px 24px 40px;">
                                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="width: 100%; background: #FFFFFF; border: 2px solid #000000; border-radius: 24px; box-shadow: 6px 8px 0 rgba(0,0,0,0.25);">
                                        <tr>
                                            <td style="padding: 32px;">
                                                <h4 style="margin: 0 0 20px 0; color: #3C3D37; font-size: 20px; font-weight: 800;">⭐ Highlighted Matches</h4>
                                                <ul style="margin: 0; padding-left: 20px; list-style-type: disc;">
                                                    {products_list}
                                                </ul>
                                            </td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>
        """
    
    return f"""
<!DOCTYPE html>
<html lang="en">
    <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Your SkinMatch Routine Roadmap</title>
    <link href="https://fonts.googleapis.com/css2?family=Quicksand:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <style>
        @media only screen and (max-width: 600px) {{
            .profile-cell {{
                display: block !important;
                width: 100% !important;
                padding: 8px 0 !important;
            }}
            .main-container {{
                max-width: 100% !important;
                width: 100% !important;
            }}
            .content-padding {{
                padding-left: 20px !important;
                padding-right: 20px !important;
            }}
        }}
    </style>
</head>
<body style="margin: 0; padding: 0; font-family: 'Quicksand', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background: #f8cc8c; line-height: 1.6;">
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background: #f8cc8c; padding: 40px 20px;">
        <tr>
            <td align="center">
                <!-- Main Container -->
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="650" class="main-container" style="max-width: 650px; width: 100%; background: #F5EFE6; border-radius: 32px; border: 2px solid #000000; box-shadow: 6px 8px 0 rgba(0,0,0,0.25); overflow: hidden;">
                    
                    <!-- Header Section -->
                    <tr>
                        <td class="content-padding" style="padding: 40px 40px 32px 40px; text-align: center;">
                            <p style="margin: 0 0 8px 0; color: #3C3D37; font-size: 11px; font-weight: 600; letter-spacing: 1.5px; text-transform: uppercase;">Personalized Skincare Insights</p>
                            <h1 style="margin: 0 0 8px 0; color: #3C3D37; font-size: 36px; font-weight: 800; letter-spacing: -1px; line-height: 1.1;">SkinMatch</h1>
                            <p style="margin: 0 0 24px 0; color: #3C3D37; font-size: 14px; line-height: 1.4; font-style: italic;">"Your skin, Your match, Your best care!"</p>
                            <!-- Welcome Text (no box) -->
                            <h2 style="margin: 0 0 12px 0; color: #3C3D37; font-size: 28px; font-weight: 800; line-height: 1.2;">Your SkinMatch Routine Roadmap</h2>
                            <p style="margin: 0 0 8px 0; color: #3C3D37; font-size: 16px; line-height: 1.7;">Hi there,</p>
                            <p style="margin: 0; color: #3C3D37; font-size: 16px; line-height: 1.7;">Here's a copy of your personalized skincare routine roadmap:</p>
                        </td>
                    </tr>

                    <!-- Profile Section -->
                    <tr>
                        <td class="content-padding" style="padding: 0 40px 24px 40px;">
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="width: 100%; background: linear-gradient(to bottom right, #f7f3ff, #a7a4d2); border: 2px solid #000000; border-radius: 24px; box-shadow: 6px 8px 0 rgba(0,0,0,0.25);">
                                <tr>
                                    <td style="padding: 32px;">
                                        <div style="margin: 0 0 24px 0; display: inline-flex; align-items: center; gap: 8px;">
                                            <span style="font-size: 24px;">🤍</span>
                                            <h3 style="margin: 0; color: #3C3D37; font-size: 20px; font-weight: 800;">Your Profile</h3>
                                        </div>
                                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="width: 100%;">
                                            {profile_html}
                                        </table>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    {ingredients_html}

                    {strategy_html}

                    {products_html}

                    <!-- CTA Button -->
                    <tr>
                        <td class="content-padding" style="padding: 0 40px 32px 40px;" align="center">
                            <a href="{site_url}/quiz" style="display: inline-block; background: #FFFFFF; color: #3C3D37; text-decoration: none; padding: 14px 32px; border-radius: 999px; font-weight: 700; font-size: 15px; border: 2px solid #000000; box-shadow: 0 6px 0 rgba(0,0,0,0.35);">
                                Retake Quiz →
                            </a>
                        </td>
                    </tr>

                    <!-- Closing Message -->
                    <tr>
                        <td class="content-padding" style="padding: 0 40px 40px 40px;">
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="width: 100%; background: rgba(255, 255, 255, 0.8); border: 2px solid #000000; border-radius: 16px;">
                                <tr>
                                    <td style="padding: 24px; text-align: center;">
                                        <p style="margin: 0 0 8px 0; color: #3C3D37; font-size: 16px; line-height: 1.6;">Need to tweak something? You can retake the quiz anytime to refresh this roadmap.</p>
                                        <p style="margin: 0; color: #3C3D37; font-size: 14px; font-weight: 600;">- The SkinMatch Team</p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                </table>
            </td>
        </tr>
    </table>
</body>
</html>
    """.strip()


@router.post("/email-summary", response=EmailSummaryAck)
def email_summary(request, payload: EmailSummaryIn):
    request_user = _resolve_request_user(request)
    target_email = (payload.email or "").strip()

    if target_email:
        if not EMAIL_REGEX.match(target_email):
            raise HttpError(400, "Invalid email address")

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

    # Generate both plain text and HTML versions
    plain_message = "\n".join(lines)
    html_message = _build_quiz_summary_email_html(traits, summary_data, recommendations_payload, strategy_notes)
    
    from_email = getattr(settings, "DEFAULT_FROM_EMAIL", "no-reply@skinmatch.local")
    email_backend = getattr(settings, "EMAIL_BACKEND", "")

    # Log which email backend is being used
    logger.info("Sending email to %s using backend: %s", target_email, email_backend)

    # Try to send the email with HTML
    email_sent = False
    try:
        result = send_mail(
            subject=subject,
            message=plain_message,
            from_email=from_email,
            recipient_list=[target_email],
            html_message=html_message,
            fail_silently=False
        )
        email_sent = result > 0
        if email_sent:
            logger.info("Successfully sent SkinMatch summary email to %s", target_email)
        else:
            logger.warning("Email send returned 0 (no emails sent) for %s", target_email)
    except Exception as e:
        logger.error("Failed to send SkinMatch summary email to %s: %s", target_email, str(e))
        
        # In development, try to save email to file as fallback
        if getattr(settings, "DEBUG", False):
            try:
                from pathlib import Path
                base_dir = getattr(settings, "BASE_DIR", Path.cwd())
                email_dir = Path(base_dir) / "emails"
                email_dir.mkdir(exist_ok=True)
                email_file = email_dir / f"quiz_summary_{target_email.replace('@', '_at_')}_{timezone.now().strftime('%Y%m%d_%H%M%S')}.html"
                with open(email_file, "w", encoding="utf-8") as f:
                    f.write(html_message)
                logger.info("Saved email to file: %s", email_file)
                email_sent = True
            except Exception as file_error:
                logger.warning("Could not save email to file: %s", file_error)

    return EmailSummaryAck(ok=True)


def calculate_results(session: QuizSession, *, include_products: bool) -> dict:
    """Generate ranked recommendations for a completed quiz session."""

    if include_products:
        ensure_sample_catalog()

    profile = session.profile_snapshot or {}
    traits = _extract_profile_traits(profile)
    pregnant = profile.get("pregnant_or_breastfeeding", False)

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
            pregnant_or_breastfeeding=pregnant,
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
            pregnant_or_breastfeeding=pregnant,
        )

    session.picks.all().delete()

    picks_payload: list[dict] = []
    if include_products:
        for rank, recommendation in enumerate(recommendations, start=1):
            product = recommendation.product
            display_price = product.price
            display_currency = product.currency or Product.Currency.USD
            image_url = _product_image_url(product)
            purchase_url = _sanitize_product_url(product.product_url)
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
                price_snapshot=display_price,
                currency=display_currency,
                rationale=recommendation.rationale,
                image_url=image_url or "",
                product_url=purchase_url or "",
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
                    "price_snapshot": _decimal_to_float(display_price),
                    "currency": display_currency,
                    "image_url": image_url,
                    "product_url": purchase_url,
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


def _sanitize_product_url(raw_url: str | None) -> str | None:
    if not raw_url:
        return None
    cleaned = raw_url.strip()
    if not cleaned:
        return None
    parsed = urlparse(cleaned)
    if parsed.scheme not in {"http", "https"}:
        return None
    if not parsed.netloc:
        return None
    return cleaned


def _product_image_url(product: Product) -> str | None:
    image_value = (getattr(product, "image", "") or "").strip()
    if image_value:
        if image_value.startswith(("http://", "https://", "data:")):
            return image_value
        relative_path = image_value.lstrip("/")
        return f"{settings.MEDIA_URL.rstrip('/')}/{relative_path}"
    return _placeholder_image_data(product)


def _placeholder_image_data(product: Product) -> str:
    base = product.slug or f"{product.brand}-{product.name}"
    digest = hashlib.sha256(base.encode("utf-8")).hexdigest()
    color_primary = f"#{digest[:6]}"
    color_secondary = f"#{digest[6:12]}"
    text = (product.brand or product.name or "SkinMatch")[:18]
    svg = (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">'
        f'<defs><linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">'
        f'<stop offset="0%" stop-color="{color_primary}" />'
        f'<stop offset="100%" stop-color="{color_secondary}" />'
        f'</linearGradient></defs>'
        f'<rect width="400" height="400" rx="36" fill="url(#grad)" />'
        f'<text x="50%" y="55%" text-anchor="middle" fill="#ffffff" '
        f'font-family="Poppins, Arial, sans-serif" font-size="48" font-weight="600">'
        f'{text}</text></svg>'
    )
    return f"data:image/svg+xml;utf8,{quote(svg)}"


def _product_detail_queryset():
    ingredient_prefetch = Prefetch(
        "productingredient_set",
        queryset=ProductIngredient.objects.select_related("ingredient").order_by(
            "order", "ingredient__common_name"
        ),
        to_attr="prefetched_ingredient_links",
    )
    concerns_prefetch = Prefetch(
        "concerns",
        queryset=SkinConcern.objects.all().order_by("name"),
        to_attr="prefetched_concerns",
    )
    skin_types_prefetch = Prefetch(
        "skin_types",
        queryset=SkinTypeTag.objects.all().order_by("name"),
        to_attr="prefetched_skin_types",
    )
    restrictions_prefetch = Prefetch(
        "restrictions",
        queryset=RestrictionTag.objects.all().order_by("name"),
        to_attr="prefetched_restrictions",
    )
    return (
        Product.objects.filter(is_active=True)
        .annotate(**PRODUCT_REVIEW_ANNOTATIONS)
        .prefetch_related(
            ingredient_prefetch,
            concerns_prefetch,
            skin_types_prefetch,
            restrictions_prefetch,
        )
    )


def _split_hero_ingredients(raw_value: str | None) -> list[str]:
    if not raw_value:
        return []
    return [
        part.strip()
        for part in raw_value.split(",")
        if part and part.strip()
    ]


def _derive_review_stats(product: Product) -> tuple[float | None, int]:
    community_count = getattr(product, "community_review_count", None)
    if isinstance(community_count, int) and community_count > 0:
        community_avg = getattr(product, "community_avg_rating", None)
        return _decimal_to_float(community_avg), community_count
    fallback_average = _decimal_to_float(product.rating)
    fallback_count = int(getattr(product, "review_count", 0) or 0)
    return fallback_average, fallback_count


def _serialize_product_summary(product: Product, hero_limit: int | None = None) -> SkincareProductSummaryOut:
    hero_ingredients = _split_hero_ingredients(product.hero_ingredients)
    if hero_limit is not None:
        hero_ingredients = hero_ingredients[:hero_limit]

    price_value = _decimal_to_float(product.price)
    if price_value is not None and price_value <= 0:
        price_value = None

    average_rating, review_count = _derive_review_stats(product)
    image_url = _product_image_url(product)
    product_url = _sanitize_product_url(product.product_url)

    return SkincareProductSummaryOut(
        product_id=product.id,
        slug=product.slug,
        brand=product.brand,
        product_name=product.name,
        category=product.category,
        category_label=_category_label(product.category),
        summary=product.summary or None,
        hero_ingredients=hero_ingredients,
        price=price_value,
        currency=product.currency,
        average_rating=average_rating,
        review_count=review_count,
        image_url=image_url,
        product_url=product_url,
    )


def _score_product_match(product: Product, query_lower: str, slug_lower: str | None) -> int:
    score = 0
    name_value = (product.name or "").lower()
    brand_value = (product.brand or "").lower()
    slug_value = (product.slug or "").lower()

    if name_value == query_lower:
        score += 10
    elif name_value.startswith(query_lower):
        score += 6
    elif query_lower in name_value:
        score += 3

    if brand_value == query_lower:
        score += 5
    elif brand_value.startswith(query_lower):
        score += 3
    elif query_lower in brand_value:
        score += 1

    if slug_lower:
        if slug_value == slug_lower:
            score += 5
        elif slug_value.startswith(slug_lower):
            score += 2

    hero_value = (product.hero_ingredients or "").lower()
    if hero_value and query_lower in hero_value:
        score += 1

    summary_value = (product.summary or "").lower()
    if summary_value and query_lower in summary_value:
        score += 1

    description_value = (product.description or "").lower()
    if description_value and query_lower in description_value:
        score += 1

    return score


def _serialize_product_detail(product: Product) -> ProductDetailOut:
    ingredient_entries: list[dict] = []
    for link in getattr(product, "prefetched_ingredient_links", []):
        ingredient = getattr(link, "ingredient", None)
        if not ingredient:
            continue
        ingredient_entries.append(
            {
                "name": ingredient.common_name,
                "inci_name": ingredient.inci_name or None,
                "highlight": bool(link.highlight),
                "order": link.order,
            }
        )

    hero_ingredients = _split_hero_ingredients(product.hero_ingredients)
    if not hero_ingredients and ingredient_entries:
        hero_ingredients = [entry["name"] for entry in ingredient_entries[:3]]

    price_value = _decimal_to_float(product.price)
    if price_value is not None and price_value <= 0:
        price_value = None

    average_rating, review_count = _derive_review_stats(product)
    image_url = _product_image_url(product)
    product_url = _sanitize_product_url(product.product_url)

    return ProductDetailOut(
        product_id=product.id,
        slug=product.slug,
        brand=product.brand,
        product_name=product.name,
        category=product.category,
        category_label=_category_label(product.category),
        summary=product.summary or None,
        description=product.description or None,
        hero_ingredients=hero_ingredients,
        ingredients=sorted(ingredient_entries, key=lambda entry: entry["order"]),
        concerns=[concern.name for concern in getattr(product, "prefetched_concerns", [])],
        skin_types=[stype.name for stype in getattr(product, "prefetched_skin_types", [])],
        restrictions=[tag.name for tag in getattr(product, "prefetched_restrictions", [])],
        price=price_value,
        currency=product.currency,
        average_rating=average_rating,
        review_count=review_count,
        image_url=image_url,
        product_url=product_url,
        affiliate_url=product_url,
    )


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
        ingredients_to_prioritize=[
            {
                "name": str(item.get("name", "")).strip(),
                "reason": str(item.get("reason", "")).strip(),
            }
            for item in (data.get("ingredients_to_prioritize") or [])
            if isinstance(item, dict)
        ],
        ingredients_caution=[
            {
                "name": str(item.get("name", "")).strip(),
                "reason": str(item.get("reason", "")).strip(),
            }
            for item in (data.get("ingredients_caution") or [])
            if isinstance(item, dict)
        ],
        category_breakdown=dict(data.get("category_breakdown") or {}),
        generated_at=data.get("generated_at"),
        score_version=data.get("score_version"),
    )


def _serialize_pick(pick: MatchPick) -> MatchPickOut:
    product = getattr(pick, "product", None)
    image_url = pick.image_url or (_product_image_url(product) if product else None)
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
        image_url=image_url,
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
    if review.is_anonymous and not is_owner:
        display_name = "Anonymous reviewer"
        avatar_url = None
    else:
        avatar_url = getattr(profile, "avatar_url", None)

    return ReviewOut(
        id=review.id,
        product_id=review.product_id,
        user_id=str(user.id),
        user_display_name=sanitize_plain_text(display_name),
        avatar_url=avatar_url,
        rating=review.rating,
        comment=sanitize_plain_text(review.comment),
        is_public=review.is_public,
        is_owner=is_owner,
        is_anonymous=bool(review.is_anonymous),
        created_at=review.created_at,
        updated_at=review.updated_at,
    )
