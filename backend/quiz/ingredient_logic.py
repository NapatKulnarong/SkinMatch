from __future__ import annotations

from typing import Dict, List, Sequence, Set, TYPE_CHECKING

from django.db.models import Prefetch, QuerySet
from django.utils.text import slugify

if TYPE_CHECKING:
    from .models import Product

SummaryIngredient = Dict[str, str]
IngredientClassification = Dict[str, List[SummaryIngredient]]

_PROBLEMATIC_ACIDS: tuple[str, ...] = (
    "lactic acid",
    "glycolic acid",
    "salicylic acid",
    "mandelic acid",
    "citric acid",
    "tartaric acid",
    "malic acid",
    "azelaic acid",
    "pha",
    "bha",
    "aha",
)

_RETINOID_TERMS: tuple[str, ...] = (
    "retinoid",
    "retinol",
    "retinal",
    "tretinoin",
    "adapalene",
    "tazarotene",
)

_PREGNANCY_FLAGS: tuple[str, ...] = _RETINOID_TERMS + (
    "hydroquinone",
    "benzoyl peroxide",
    "salicylic acid",
)


def classify_ingredients(
    *,
    ingredients: Sequence[str],
    primary_concerns: Sequence[str],
    secondary_concerns: Sequence[str],
    skin_type: str | None,
    sensitivity: str | None,
    pregnant_or_breastfeeding: bool | None = None,
) -> IngredientClassification:
    """
    Classify ingredients into prioritize / caution groups based on profile traits.
    """

    primary_slugs = {slugify(value) for value in primary_concerns if value}
    secondary_slugs = {slugify(value) for value in secondary_concerns if value}
    all_concern_slugs = primary_slugs | secondary_slugs
    sensitivity_slug = slugify(sensitivity) if sensitivity else None
    skin_type_slug = slugify(skin_type) if skin_type else None

    prioritize: List[SummaryIngredient] = []
    caution: List[SummaryIngredient] = []

    for ingredient in ingredients:
        if not ingredient:
            continue

        ingredient_lower = ingredient.lower()

        caution_reason = _check_caution(
            ingredient_lower=ingredient_lower,
            primary_slugs=primary_slugs,
            secondary_slugs=secondary_slugs,
            all_concern_slugs=all_concern_slugs,
            skin_type_slug=skin_type_slug,
            sensitivity_slug=sensitivity_slug,
            pregnant_or_breastfeeding=pregnant_or_breastfeeding,
        )
        if caution_reason:
            caution.append({"name": ingredient, "reason": caution_reason})
            continue

        prioritize_reason = _check_prioritize(
            ingredient_lower=ingredient_lower,
            primary_slugs=primary_slugs,
            secondary_slugs=secondary_slugs,
            all_concern_slugs=all_concern_slugs,
            skin_type_slug=skin_type_slug,
            sensitivity_slug=sensitivity_slug,
        )
        if prioritize_reason:
            prioritize.append({"name": ingredient, "reason": prioritize_reason})

    return {"prioritize": prioritize, "caution": caution}


def filter_products_by_skin_profile(
    queryset: QuerySet["Product"],
    *,
    primary_slugs: Sequence[str],
) -> QuerySet["Product"]:
    """
    Early-filter products before scoring, based on conservative safety rules.
    Returns a queryset limited to items deemed safe for the provided traits.
    """

    primary_slug_set = set(primary_slugs)
    if "damaged-skin-barrier" not in primary_slug_set:
        return queryset

    queryset = queryset.prefetch_related(
        Prefetch("ingredients", to_attr="prefetched_ingredients_check")
    )

    safe_ids: list[int] = []
    for product in queryset:
        entries = getattr(product, "prefetched_ingredients_check", []) or []
        names: list[str] = []

        for entry in entries:
            # Depending on prefetch depth we may get Ingredient objects or through objects.
            name = getattr(entry, "common_name", None)
            if not name:
                ingredient_obj = getattr(entry, "ingredient", None)
                name = getattr(ingredient_obj, "common_name", None)
            if name:
                names.append(name.lower())

        has_problematic = any(
            acid in ingredient_name
            for ingredient_name in names
            for acid in _PROBLEMATIC_ACIDS
        )

        if not has_problematic:
            safe_ids.append(product.id)

    if not safe_ids:
        return queryset.model.objects.none()

    return queryset.filter(id__in=safe_ids)


def _check_caution(
    *,
    ingredient_lower: str,
    primary_slugs: Set[str],
    secondary_slugs: Set[str],
    all_concern_slugs: Set[str],
    skin_type_slug: str | None,
    sensitivity_slug: str | None,
    pregnant_or_breastfeeding: bool | None,
) -> str | None:
    """
    Check if an ingredient should be used with caution.
    Returns the reason string if caution is needed, None otherwise.
    """
    
    # Damaged barrier restrictions
    if "damaged-skin-barrier" in primary_slugs or "damaged-skin-barrier" in secondary_slugs:
        if any(term in ingredient_lower for term in _PROBLEMATIC_ACIDS):
            return "Can worsen barrier impairment while healing"

        if any(term in ingredient_lower for term in (*_RETINOID_TERMS, "high strength", "vitamin c", "ascorbic acid")):
            return "Pause until barrier is fully repaired"

    has_sensitivity = sensitivity_slug in {"yes", "sometimes"}
    has_redness = "redness" in all_concern_slugs

    # Sensitivity and redness checks
    if has_sensitivity or has_redness:
        if any(term in ingredient_lower for term in _RETINOID_TERMS):
            return "Pause until the barrier feels comfortable again"

        if has_sensitivity and any(term in ingredient_lower for term in ("glycolic acid", "salicylic acid", "lactic acid")):
            if any(level in ingredient_lower for level in ("10%", "15%", "20%")):
                return "Can worsen barrier impairment while healing"

    # Skin type-specific restrictions
    if skin_type_slug == "oily":
        if "lactic acid" in ingredient_lower:
            return "Too rich for oily skin—can upset oil balance"
        if "shea butter" in ingredient_lower:
            return "May clog pores; keep textures lightweight"

    # Pregnancy restrictions
    if pregnant_or_breastfeeding:
        if any(term in ingredient_lower for term in _PREGNANCY_FLAGS):
            return "Not recommended during pregnancy or breastfeeding"

    # Sensitivity triggers
    if "menthol" in ingredient_lower:
        return "Cooling agents can sting reactive skin"

    if any(term in ingredient_lower for term in ("fragrance", "parfum")):
        if has_sensitivity or has_redness:
            return "A common trigger for diffuse redness"

    if any(term in ingredient_lower for term in ("alcohol denat", "sd alcohol", "isopropyl alcohol")):
        if "damaged-skin-barrier" in all_concern_slugs or has_sensitivity:
            return "Can tip your skin into a reactive state"

    # Physical scrubs
    if any(term in ingredient_lower for term in ("walnut shell", "apricot seed", "microbeads", "scrub")):
        if "damaged-skin-barrier" in all_concern_slugs or has_redness:
            return "Can cause micro-tears and redness"

    # Harsh cleansers
    if any(term in ingredient_lower for term in ("sodium lauryl sulfate", "sls")):
        if "damaged-skin-barrier" in all_concern_slugs or has_sensitivity:
            return "Can strip natural oils and worsen dryness"

    return None


def _check_prioritize(
    *,
    ingredient_lower: str,
    primary_slugs: Set[str],
    secondary_slugs: Set[str],
    all_concern_slugs: Set[str],
    skin_type_slug: str | None,
    sensitivity_slug: str | None,
) -> str | None:
    """
    Check if an ingredient should be prioritized.
    Returns the reason string if it should be prioritized, None otherwise.
    """
    
    has_sensitivity = sensitivity_slug in {"yes", "sometimes"}
    
    # Barrier repair
    if "damaged-skin-barrier" in primary_slugs or "damaged-skin-barrier" in secondary_slugs:
        if any(term in ingredient_lower for term in ("panthenol", "ceramide", "niacinamide", "centella", "madecassoside", "cica", "colloidal oatmeal")):
            return "Calms inflammation and aids recovery"

    # Dehydration
    if "dehydrated-skin" in all_concern_slugs:
        if any(term in ingredient_lower for term in ("hyaluronic acid", "glycerin", "beta-glucan", "sodium pca")):
            return "Attracts moisture; apply to damp skin after cleansing"

    # Redness and sensitivity
    if "redness" in all_concern_slugs or "damaged-skin-barrier" in all_concern_slugs:
        if any(term in ingredient_lower for term in ("green tea", "centella", "azelaic acid", "niacinamide", "allantoin", "bisabolol", "licorice root")):
            return "Soothes redness; apply to affected areas first"

    # Acne and breakouts
    if any(concern in all_concern_slugs for concern in ("acne-breakouts", "acne", "blackheads", "excess-oil")):
        if "damaged-skin-barrier" not in primary_slugs:
            if any(term in ingredient_lower for term in ("salicylic acid", "benzoyl peroxide", "niacinamide", "tea tree", "zinc")):
                return "Targets breakouts; introduce slowly to avoid irritation"

    # Acne scars and hyperpigmentation
    if any(concern in all_concern_slugs for concern in ("acne-scars", "hyperpigmentation", "dark-spots")):
        # Retinoids only if no sensitivity issues
        if any(term in ingredient_lower for term in _RETINOID_TERMS):
            if not any(issue in all_concern_slugs for issue in ("redness", "damaged-skin-barrier")) and not has_sensitivity:
                return "Encourages regeneration to soften textural scars"

        if any(term in ingredient_lower for term in ("vitamin c", "niacinamide", "alpha arbutin", "kojic acid", "tranexamic acid", "azelaic acid")):
            return "Brightens and evens skin tone over time"

    # Anti-aging
    if any(concern in all_concern_slugs for concern in ("fine-lines-wrinkles", "dull-skin")):
        if "damaged-skin-barrier" not in primary_slugs:
            # Retinoids only if no sensitivity
            if any(term in ingredient_lower for term in _RETINOID_TERMS):
                if not has_sensitivity:
                    return "Boosts collagen and improves texture"
            
            if any(term in ingredient_lower for term in ("peptide", "vitamin c", "coenzyme q10", "resveratrol")):
                return "Boosts collagen and improves texture"

    # Dull skin with skin type consideration
    if "dull-skin" in all_concern_slugs:
        # Glycolic acid for oily/combination skin
        if "glycolic acid" in ingredient_lower and skin_type_slug in {"oily", "combination", "normal"}:
            if "damaged-skin-barrier" not in primary_slugs:
                return "Resurfaces to reveal brighter, smoother skin"
        
        # Lactic acid only for dry/normal skin
        if "lactic acid" in ingredient_lower and skin_type_slug in {"dry", "normal"}:
            if "damaged-skin-barrier" not in primary_slugs:
                return "Offers mild exfoliation plus hydration"
        
        # General brighteners
        if any(term in ingredient_lower for term in ("vitamin c", "niacinamide", "alpha arbutin", "licorice")):
            return "Brightens and revitalizes complexion"

    # Rice extract
    if any(term in ingredient_lower for term in ("rice extract", "rice ferment")):
        if "dull-skin" in all_concern_slugs or "hyperpigmentation" in all_concern_slugs:
            return "Brightening & scar fading; use AM/PM"

    # Hyaluronic acid
    if "hyaluronic acid" in ingredient_lower:
        return "Attracts moisture; apply to damp skin after cleansing"

    # Panthenol
    if "panthenol" in ingredient_lower:
        return "Aids skin barrier repair; use daily in AM/PM"

    return None
