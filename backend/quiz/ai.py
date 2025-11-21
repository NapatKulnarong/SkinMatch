from __future__ import annotations

import logging
import os
from collections import Counter
from typing import Iterable, List, Sequence

logger = logging.getLogger(__name__)

try:  # Optional dependency – configured only when installed
    import google.generativeai as _genai  # type: ignore
except ModuleNotFoundError:  # pragma: no cover - optional
    _genai = None

try:  # Optional Google API error class for model availability
    from google.api_core.exceptions import NotFound as _ModelNotFound  # type: ignore
except Exception:  # pragma: no cover - optional
    _ModelNotFound = None  # type: ignore

try:  # Optional enum helpers for safety configuration
    from google.generativeai.types import HarmBlockThreshold, HarmCategory  # type: ignore
except Exception:  # pragma: no cover - optional
    HarmBlockThreshold = HarmCategory = None  # type: ignore
    _SAFETY_SETTINGS: dict | None = None
else:
    _SAFETY_SETTINGS = {
        HarmCategory.HARM_CATEGORY_HATE_SPEECH: HarmBlockThreshold.BLOCK_NONE,
        HarmCategory.HARM_CATEGORY_HARASSMENT: HarmBlockThreshold.BLOCK_NONE,
        HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT: HarmBlockThreshold.BLOCK_NONE,
        HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT: HarmBlockThreshold.BLOCK_NONE,
    }

_CONFIGURED = False


def _ensure_configured() -> None:
    """Best-effort configuration of the Gemini client, if available."""
    global _CONFIGURED, _genai
    if _CONFIGURED:
        return

    _CONFIGURED = True
    if _genai is None:
        return

    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key:
        logger.warning("GOOGLE_API_KEY not set; skipping Gemini strategy notes.")
        _genai = None
        return

    try:
        _genai.configure(api_key=api_key)
    except Exception:  # pragma: no cover - network/SDK failure
        logger.exception("Unable to configure Google Generative AI – disabling strategy note generation.")
        _genai = None


def generate_strategy_notes(
    *,
    traits: dict,
    summary: dict,
    recommendations: Sequence[dict],
) -> List[str]:
    """
    Produce a set of routine strategy notes.
    """
    fallback = _fallback_strategy_notes(traits, summary, recommendations)

    _ensure_configured()
    if _genai is None:
        return fallback

    prompt = _build_prompt(traits=traits, summary=summary, recommendations=recommendations)
    
    # FIXED: Use working models first
    configured_model = (os.getenv("GOOGLE_GEMINI_MODEL") or "").strip()
    candidate_models = [
        "gemini-2.0-flash-exp",  # Current experimental model (most reliable)
        "gemini-exp-1206",       # Experimental model
        configured_model or None,
        "gemini-1.5-flash-002",
        "gemini-1.5-flash",
        "gemini-1.5-flash-latest",
    ]

    generation_config = {
        "temperature": 0.3,
        "max_output_tokens": 1024,
        "candidate_count": 1,
    }
    
    # FIXED: Always apply safety settings
    generation_kwargs = {}
    if _SAFETY_SETTINGS:
        generation_kwargs["safety_settings"] = _SAFETY_SETTINGS

    tried: set[str] = set()
    for model_name in candidate_models:
        if not model_name or model_name in tried:
            continue
        tried.add(model_name)
        try:
            logger.info(f"Attempting Gemini model: {model_name}")
            model = _genai.GenerativeModel(model_name, generation_config=generation_config)
            response = model.generate_content(prompt, **generation_kwargs)
            
            logger.info(f"Gemini model '{model_name}' responded")
            
            ai_notes = _extract_notes(response)
            if ai_notes:
                logger.info(f"✓ Generated {len(ai_notes)} strategy notes using {model_name}")
                return ai_notes
            logger.warning(f"Gemini model '{model_name}' returned no actionable notes; trying next candidate.")
        except Exception as exc:
            if _ModelNotFound and isinstance(exc, _ModelNotFound):
                logger.warning(f"Gemini model '{model_name}' not found; trying next candidate.")
                continue
            # Handle quota/rate limit errors gracefully
            exc_str = str(exc)
            if "429" in exc_str or "quota" in exc_str.lower() or "rate limit" in exc_str.lower():
                logger.warning(f"Gemini model '{model_name}' quota exceeded; trying next candidate.")
                continue
            logger.exception(f"Gemini model '{model_name}' failed with error: {exc}")
            # Don't break, try next model
            continue

    logger.warning("All Gemini models failed. Using fallback heuristics.")
    return fallback


def generate_ingredient_benefit(ingredient: str) -> str | None:
    """
    Return a concise, consumer-friendly benefit for a single ingredient using Gemini when available.
    """
    name = _clean_text(ingredient)
    if not name:
        return None

    _ensure_configured()
    if _genai is None:
        return None

    prompt = (
        f"In one short sentence (max 22 words), describe the skincare benefit of the ingredient '{name}'. "
        "Be precise, avoid marketing fluff, and keep it understandable to shoppers."
    )

    generation_config = {
        "temperature": 0.15,
        "max_output_tokens": 120,
        "candidate_count": 1,
    }

    generation_kwargs = {}
    if _SAFETY_SETTINGS:
        generation_kwargs["safety_settings"] = _SAFETY_SETTINGS

    configured_model = (os.getenv("GOOGLE_GEMINI_MODEL") or "").strip()
    candidate_models = [
        "gemini-2.0-flash-exp",
        configured_model or None,
        "gemini-1.5-flash-002",
        "gemini-1.5-flash",
    ]

    tried: set[str] = set()
    for model_name in candidate_models:
        if not model_name or model_name in tried:
            continue
        tried.add(model_name)
        try:
            model = _genai.GenerativeModel(model_name, generation_config=generation_config)
            response = model.generate_content(prompt, **generation_kwargs)
            benefit = _extract_first_line(response)
            if benefit:
                logger.info("Generated Gemini benefit for ingredient '%s' using %s", name, model_name)
                return benefit
            logger.warning("Gemini model '%s' returned no benefit for ingredient '%s'", model_name, name)
        except Exception as exc:
            if _ModelNotFound and isinstance(exc, _ModelNotFound):
                logger.warning("Gemini model '%s' not found for ingredient benefit.", model_name)
                continue
            exc_str = str(exc)
            if "429" in exc_str or "quota" in exc_str.lower() or "rate limit" in exc_str.lower():
                logger.warning("Gemini model '%s' quota exceeded for ingredient benefit.", model_name)
                continue
            logger.exception("Gemini ingredient benefit failed on model %s", model_name)
            continue

    logger.warning("Gemini unavailable for ingredient '%s'; falling back to catalog or default placeholder.", name)
    return None


def _extract_first_line(response) -> str | None:
    if response is None:
        return None

    chunks: list[str] = []
    text_attr = getattr(response, "text", None)
    if isinstance(text_attr, str):
        chunks.append(text_attr)

    candidates = getattr(response, "candidates", None) or []
    for candidate in candidates:
        finish_reason = getattr(candidate, "finish_reason", None)
        finish_reason_str = str(finish_reason)
        if finish_reason in (2, 3, "SAFETY", "BLOCKED") or "SAFETY" in finish_reason_str:
            continue

        content = getattr(candidate, "content", None)
        parts_iterable = getattr(content, "parts", None) or getattr(candidate, "parts", None) or []
        for part in parts_iterable:
            text_fragment = getattr(part, "text", None)
            if text_fragment:
                chunks.append(text_fragment)

    for chunk in chunks:
        for raw_line in chunk.splitlines():
            cleaned = raw_line.strip().lstrip("-•*0123456789. \t").strip()
            if cleaned:
                return cleaned
    return None


def _extract_notes(response) -> List[str]:
    if response is None:
        return []

    lines: List[str] = []
    candidates = getattr(response, "candidates", None) or []

    for candidate in candidates:
        finish_reason = getattr(candidate, "finish_reason", None)
        
        # Better finish reason detection
        finish_reason_str = str(finish_reason)
        safety_ratings = getattr(candidate, "safety_ratings", None)
        
        # Check if blocked by safety - log details
        if finish_reason in (2, 3, "SAFETY", "BLOCKED") or "SAFETY" in finish_reason_str:
            logger.warning(f"⚠ Gemini BLOCKED - Finish reason: {finish_reason}")
            if safety_ratings:
                logger.warning("Safety ratings:")
                for rating in safety_ratings:
                    category = getattr(rating, "category", "UNKNOWN")
                    probability = getattr(rating, "probability", "UNKNOWN")
                    blocked = getattr(rating, "blocked", False)
                    logger.warning(f"  - {category}: {probability} (blocked={blocked})")
            else:
                logger.warning("  No safety ratings provided")
            continue

        content = getattr(candidate, "content", None)
        parts_iterable = []
        if content is not None:
            parts_iterable = getattr(content, "parts", []) or []
        else:  # pragma: no cover - older SDKs expose parts directly
            parts_iterable = getattr(candidate, "parts", []) or []

        for part in parts_iterable:
            text_fragment = getattr(part, "text", None)
            if not text_fragment:
                continue
            for raw_line in text_fragment.splitlines():
                cleaned = raw_line.strip()
                if not cleaned:
                    continue
                cleaned = cleaned.lstrip("-•*0123456789. \t").strip()
                if not cleaned:
                    continue
                lines.append(cleaned)
                if len(lines) >= 8:
                    return lines

    return lines


def _fallback_strategy_notes(traits: dict, summary: dict, recommendations: Sequence[dict]) -> List[str]:
    notes: List[str] = []
    primary = _clean_list(traits.get("primary_concerns"))
    secondary = _clean_list(traits.get("secondary_concerns"))
    eye_concerns = _clean_list(traits.get("eye_area_concerns"))
    restrictions = _clean_list(traits.get("restrictions"))
    skin_type = _clean_text(traits.get("skin_type"))
    sensitivity = _clean_text(traits.get("sensitivity"))
    budget = _clean_text(traits.get("budget"))
    top_ingredients = _clean_list(summary.get("top_ingredients"))

    if primary:
        concerns = _format_list(primary[:2])
        notes.append(f"Anchor your routine around formulas that target {concerns}.")

    if secondary:
        notes.append(
            f"Layer in weekly treatments to address secondary goals like {_format_list(secondary[:2])} without overloading skin."
        )

    if top_ingredients:
        notes.append(f"Keep key ingredients such as {_format_list(top_ingredients[:3])} in rotation for steady progress.")

    cat_breakdown = summary.get("category_breakdown") or {}
    if isinstance(cat_breakdown, dict) and cat_breakdown:
        dominant = Counter({str(k): float(v or 0) for k, v in cat_breakdown.items()}).most_common(2)
        if dominant:
            focus = _format_list([label for label, _ in dominant])
            notes.append(f"Expect the routine to lean on {focus} steps to keep results consistent.")

    if skin_type:
        notes.append(_skin_type_tip(skin_type))

    if sensitivity and sensitivity.lower() in {"yes", "sometimes"}:
        notes.append("Buffer stronger actives with moisturiser sandwiches to keep sensitivity in check.")

    if eye_concerns:
        notes.append("Give the eye area dedicated hydration and SPF coverage to maintain resilience.")

    if restrictions:
        notes.append(f"Double-check INCI lists to avoid restricted ingredients like {_format_list(restrictions[:3])}.")

    if budget:
        notes.append(f"Balance spend by pairing a hero treatment with budget-friendly maintenance staples.")

    category_focus = [rec.get("category") for rec in recommendations[:3] if rec.get("category")]
    if category_focus:
        notes.append(f"Your matches spotlight {_format_list(category_focus)} to support daily consistency.")

    ingredients_from_recs = []
    for rec in recommendations[:3]:
        ingredients_from_recs.extend(_clean_list(rec.get("ingredients")))
    if ingredients_from_recs:
        top_rec_ingredients = Counter(ingredients_from_recs).most_common(2)
        if top_rec_ingredients:
            notes.append(
                f"Layer standout actives such as {_format_list([name for name, _ in top_rec_ingredients])} with plenty of barrier support."
            )

    # Ensure uniqueness while preserving order
    seen = set()
    deduped = []
    for note in notes:
        if note and note not in seen:
            deduped.append(note)
            seen.add(note)
        if len(deduped) >= 8:
            break
    
    # Ensure we always return at least one note
    if not deduped:
        deduped.append("Keep routines gentle and consistent—your skin will reward the steady care.")
    
    return deduped


def _clean_list(value) -> List[str]:
    if not value:
        return []
    if isinstance(value, (list, tuple, set)):
        return [_clean_text(item) for item in value if _clean_text(item)]
    text = _clean_text(value)
    return [text] if text else []


def _clean_text(value) -> str:
    if value is None:
        return ""
    text = str(value).strip()
    return text


def _format_list(items: Iterable[str]) -> str:
    items = [item.strip() for item in items if item and item.strip()]
    if not items:
        return ""
    if len(items) == 1:
        return items[0]
    if len(items) == 2:
        return f"{items[0]} and {items[1]}"
    return ", ".join(items[:-1]) + f", and {items[-1]}"


def _skin_type_tip(skin_type: str) -> str:
    normalized = skin_type.lower()
    if normalized == "oily":
        return "Balance oil by pairing mattifying actives with lightweight gel hydration."
    if normalized == "dry":
        return "Build your routine around cushiony textures and richer moisturisers to seal moisture in."
    if normalized == "combination":
        return "Multi-moisturise—use gels on oilier zones and creams on dry patches for tailored comfort."
    return "Keep your routine balanced with staples that maintain a healthy skin barrier."


def _build_prompt(*, traits: dict, summary: dict, recommendations: Sequence[dict]) -> str:
    """
    FIXED: Professional, neutral prompt to avoid safety blocks.
    """
    primary = _format_list(_clean_list(traits.get("primary_concerns")))
    secondary = _format_list(_clean_list(traits.get("secondary_concerns")))
    skin_type = _clean_text(traits.get("skin_type")) or "not specified"
    sensitivity = _clean_text(traits.get("sensitivity")) or "not specified"
    budget = _clean_text(traits.get("budget")) or "not specified"
    restrictions = _format_list(_clean_list(traits.get("restrictions")))
    ingredients = _format_list(_clean_list(summary.get("top_ingredients")))
    
    categories = summary.get("category_breakdown") or {}
    cat_summary = []
    if isinstance(categories, dict):
        for label, count in list(categories.items())[:4]:
            cat_summary.append(f"{label} ({count})")

    rec_summary = []
    for rec in recommendations[:3]:
        name = rec.get("product_name") or "Product"
        brand = rec.get("brand") or ""
        category = rec.get("category") or ""
        rec_summary.append(f"{brand} {name} ({category})")

    prompt = f"""Generate 6-8 practical skincare routine tips (each under 140 characters).

SKINCARE PROFILE:
- Primary focus: {primary or 'General maintenance'}
- Additional areas: {secondary or 'None specified'}
- Skin type: {skin_type}
- Sensitivity: {sensitivity}
- Budget: {budget}
- Key ingredients: {ingredients or 'Standard cosmetics'}
- Product types: {', '.join(cat_summary) if cat_summary else 'Various categories'}

SAMPLE PRODUCTS:
{chr(10).join(f'- {item}' for item in rec_summary[:3]) if rec_summary else '- General skincare products'}

REQUIREMENTS:
- Focus on application order (thin to thick consistency)
- Include AM/PM timing suggestions
- Mention ingredient layering strategies
- Keep each tip concise and actionable
- Use professional skincare terminology

Return only the tips as bullet points."""

    return prompt
    
