from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal
from typing import Iterable, Sequence

from django.db.models import Prefetch
from django.utils.text import slugify

from .models import (
    Ingredient,
    Product,
    SkinConcern,
)
from .ingredient_logic import classify_ingredients, filter_products_by_skin_profile

TraitList = Sequence[str]


@dataclass(frozen=True)
class Recommendation:
    product: Product
    score: Decimal
    ingredients: list[str]
    rationale: dict[str, list[str]]


def recommend_products(
    *,
    primary_concerns: TraitList,
    secondary_concerns: TraitList,
    eye_area_concerns: TraitList,
    skin_type: str | None,
    sensitivity: str | None,
    restrictions: TraitList,
    budget: str | None,
    pregnant_or_breastfeeding: bool | None = None,
    limit: int = 5,
) -> tuple[list[Recommendation], dict]:
    """Rank products in the catalog based on quiz traits."""

    normalized_budget = _slug(budget)
    normalized_skin = _slug(skin_type)
    normalized_sensitivity = _slug(sensitivity)
    restriction_set = {_slug(value) for value in restrictions if value}

    primary_slugs = [_slug(value) for value in primary_concerns if value]
    secondary_slugs = [_slug(value) for value in secondary_concerns if value]
    eye_slugs = [_slug(value) for value in eye_area_concerns if value]

    concern_keys = set(primary_slugs + secondary_slugs + eye_slugs)
    concern_map = {
        concern.key: concern
        for concern in SkinConcern.objects.filter(key__in=concern_keys)
    }

    qs = filter_products_by_skin_profile(
        Product.objects.filter(is_active=True),
        primary_slugs=primary_slugs,
    )
    
    qs = qs.prefetch_related(
        Prefetch("restrictions", to_attr="prefetched_restrictions"),
        Prefetch("skin_types", to_attr="prefetched_skin_types"),
        Prefetch(
            "concerns",
            queryset=SkinConcern.objects.all(),
            to_attr="prefetched_concerns",
        ),
        Prefetch(
            "ingredients",
            queryset=Ingredient.objects.all().order_by("productingredient__order"),
            to_attr="prefetched_ingredients",
        ),
    )

    ranked: list[tuple[Decimal, Product, dict[str, list[str]]]] = []

    for product in qs:
        product_score = Decimal("0")
        rationale: dict[str, list[str]] = {}

        product_concern_slugs = {concern.key for concern in getattr(product, "prefetched_concerns", [])}

        pri_hits = _count_matches(primary_slugs, product_concern_slugs)
        if pri_hits:
            product_score += Decimal(len(pri_hits) * 40)
            rationale["primary_concerns"] = _resolve_concern_names(pri_hits, concern_map)

        sec_hits = _count_matches(secondary_slugs, product_concern_slugs)
        if sec_hits:
            product_score += Decimal(len(sec_hits) * 20)
            rationale["secondary_concerns"] = _resolve_concern_names(sec_hits, concern_map)

        eye_hits = _count_matches(eye_slugs, product_concern_slugs)
        if eye_hits:
            product_score += Decimal(len(eye_hits) * 10)
            rationale["eye_area"] = _resolve_concern_names(eye_hits, concern_map)

        if normalized_skin:
            product_skin_types = {stype.key for stype in getattr(product, "prefetched_skin_types", [])}
            if normalized_skin in product_skin_types:
                product_score += Decimal("15")
                rationale.setdefault("skin_type", []).append(normalized_skin)
            elif product_skin_types:
                product_score -= Decimal("5")

        if normalized_sensitivity:
            product_sensitivity_tags = {stype.key for stype in getattr(product, "prefetched_skin_types", [])}
            if normalized_sensitivity in product_sensitivity_tags:
                product_score += Decimal("12")
                rationale.setdefault("sensitivity", []).append(normalized_sensitivity)

        if restriction_set:
            product_restrictions = {tag.key for tag in getattr(product, "prefetched_restrictions", [])}
            if restriction_set - product_restrictions:
                continue  # skip products that lack requested restrictions
            rationale.setdefault("restrictions", []).extend(sorted(restriction_set))

        if normalized_budget:
            product_budget = _slug(product.currency)
            budget_band = _budget_band(product)

            if budget_band == normalized_budget:
                product_score += Decimal("8")
                rationale.setdefault("budget", []).append(budget_band)
            elif budget_band == "affordable" and normalized_budget in {"mid", "premium"}:
                product_score += Decimal("2")
            elif budget_band == "premium" and normalized_budget == "mid":
                product_score -= Decimal("3")

        if product_score <= 0:
            continue

        ranked.append((product_score, product, rationale))

    ranked.sort(key=lambda item: (item[0], -float(item[1].price or 0)), reverse=True)

    recommendations: list[Recommendation] = []
    for product_score, product, rationale in ranked[:limit]:
        ingredients = [ingredient.common_name for ingredient in getattr(product, "prefetched_ingredients", [])]
        recommendations.append(
            Recommendation(
                product=product,
                score=product_score.quantize(Decimal("0.001")),
                ingredients=ingredients,
                rationale=rationale,
            )
        )

    summary = _build_summary(
        primary_slugs,
        secondary_slugs,
        recommendations,
        concern_map,
        skin_type,
        sensitivity,
        pregnant_or_breastfeeding,
    )
    return recommendations, summary


def _slug(value: str | None) -> str:
    if not value:
        return ""
    return slugify(value)


def _count_matches(values: Iterable[str], haystack: set[str]) -> set[str]:
    matches: set[str] = set()
    for value in values:
        if value in haystack:
            matches.add(value)
    return matches


def _resolve_concern_names(concern_slugs: Iterable[str], concern_map: dict[str, SkinConcern]) -> list[str]:
    names: list[str] = []
    for slug in concern_slugs:
        concern = concern_map.get(slug)
        if concern:
            names.append(concern.name)
        else:
            names.append(slug.replace("-", " ").title())
    return names


_CURRENCY_TO_USD: dict[str, Decimal] = {
    Product.Currency.USD: Decimal("1"),
    Product.Currency.THB: Decimal("0.028"),  # ~36 THB per USD
    Product.Currency.KRW: Decimal("0.00073"),  # ~1370 KRW per USD
    Product.Currency.JPY: Decimal("0.0067"),  # ~150 JPY per USD
    Product.Currency.EUR: Decimal("1.08"),
}


def _budget_band(product: Product) -> str:
    price = product.price
    if price is None:
        return "mid"

    rate = _CURRENCY_TO_USD.get(product.currency, Decimal("1"))
    usd_price = price * rate

    if usd_price < Decimal("20"):
        return "affordable"
    if usd_price < Decimal("45"):
        return "mid"
    return "premium"


def _build_summary(
    primary_concerns: TraitList,
    secondary_concerns: TraitList,
    recommendations: list[Recommendation],
    concern_map: dict[str, SkinConcern],
    skin_type: str | None,
    sensitivity: str | None,
    pregnant_or_breastfeeding: bool | None,
) -> dict:
    """Build summary with classified ingredients."""
    category_counts: dict[str, int] = {}
    ingredient_frequency: dict[str, int] = {}

    for recommendation in recommendations:
        category_counts[recommendation.product.category] = (
            category_counts.get(recommendation.product.category, 0) + 1
        )
        for ingredient in recommendation.ingredients:
            ingredient_frequency[ingredient] = ingredient_frequency.get(ingredient, 0) + 1

    # Get all unique ingredients from recommendations
    all_ingredients = list(ingredient_frequency.keys())
    
    # Classify ingredients
    classified = classify_ingredients(
        ingredients=all_ingredients,
        primary_concerns=list(primary_concerns),
        secondary_concerns=list(secondary_concerns),
        skin_type=skin_type,
        sensitivity=sensitivity,
        pregnant_or_breastfeeding=pregnant_or_breastfeeding,
    )
    
    prioritized_items = classified['prioritize']
    prioritized_names = [item['name'] for item in prioritized_items[:6]]
    
    # Get ingredients to use with caution
    caution_items = classified['caution']

    primary_labels = _resolve_concern_names(primary_concerns, concern_map)

    return {
        "primary_concerns": primary_labels,
        "top_ingredients": prioritized_names,
        "ingredients_to_prioritize": prioritized_items,
        "ingredients_caution": caution_items,
        "category_breakdown": category_counts,
    }
