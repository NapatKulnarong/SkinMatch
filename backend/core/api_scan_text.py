from __future__ import annotations

import io
import json
import logging
import os
import re
from pathlib import Path
import logging
from typing import List, Optional, Tuple

from django.conf import settings
from ninja import File, Router, Schema
from ninja.errors import HttpError
from ninja.files import UploadedFile

try:  # pragma: no cover - optional dependency
    import cv2
except ImportError:
    cv2 = None  # type: ignore

try:  # pragma: no cover - optional dependency
    import numpy as np
except ImportError:
    np = None  # type: ignore

try:  # pragma: no cover - optional dependency
    from PIL import Image, UnidentifiedImageError
except ImportError:
    Image = None  # type: ignore
    UnidentifiedImageError = OSError  # type: ignore[misc,assignment]

try:  # pragma: no cover - optional dependency
    import pillow_heif  # type: ignore
except ImportError:
    pillow_heif = None  # type: ignore
else:  # pragma: no cover - registers heif opener when available
    pillow_heif.register_heif_opener()

try:  # pragma: no cover - optional dependency
    import pytesseract
except ImportError:
    pytesseract = None  # type: ignore

try:
    import google.generativeai as genai
except ModuleNotFoundError:  # pragma: no cover - optional dependency
    genai = None

from .api_scan import scan_router as _legacy_scan_router
from .text_cleaner import clean_ocr_text
from .utils_ocr import preprocess_for_ocr

logger = logging.getLogger(__name__)

scan_text_router = Router(tags=["scan-text"])


def _genai_ready() -> bool:
    """
    Evaluate readiness at call time so env changes in tests or runtime apply
    without requiring module reload.
    """
    if genai is None:
        return False
    key = os.getenv("GOOGLE_API_KEY")
    if not key:
        return False
    already_configured = getattr(_genai_ready, "_configured_key", None) == key
    if not already_configured:
        genai.configure(api_key=key)
        _genai_ready._configured_key = key
    return True


def _ensure_ocr_stack_ready() -> None:
    if cv2 is None or np is None or Image is None or pytesseract is None:
        raise HttpError(
            503,
            "OCR dependencies (Pillow, pytesseract, opencv-python, numpy) are not installed.",
        )

EXAMPLE_JSON = {
    "benefits": [
        "Hydration: Provides deep moisture to keep skin plump.",
        "Barrier Support: Strengthens the skin’s protective layer.",
        "Soothing: Calms redness and irritation."
    ],
    "actives": [
        "Niacinamide: Vitamin B3 that balances tone and reinforces barrier.",
        "Centella Asiatica Extract: Cica botanical that soothes irritation.",
        "Sodium Hyaluronate: Water-binding molecule that delivers lasting hydration."
    ],
    "concerns": [
        "Fragrance: Can tingle on reactive skin.",
        "Drying Alcohol: May feel tight on compromised skin.",
        "PEG Compounds: Synthetic emulsifiers some users avoid."
    ],
    "notes": [
        "Foaming gel texture suited for daily cleansing.",
        "Pairs humectants with barrier-repair lipids.",
        "Add SPF daily when exfoliating ingredients are present."
    ],
    "confidence": 0.95,
}

STRUCTURED_JSON_SCHEMA = {
    "type": "object",
    "properties": {
        "benefits": {
            "type": "array",
            "items": {"type": "string"},
            "minItems": 2
        },
        "actives": {
            "type": "array",
            "items": {"type": "string"},
            "minItems": 2
        },
        "concerns": {
            "type": "array",
            "items": {"type": "string"}
        },
        "notes": {
            "type": "array",
            "items": {"type": "string"}
        },
        "confidence": {"type": "number"}
    },
    "required": ["benefits", "actives", "concerns", "notes", "confidence"],
    "additionalProperties": False
}

def _build_llm_prompt(ocr_text: str) -> Tuple[str, str, dict]:
    schema_hint = json.dumps(STRUCTURED_JSON_SCHEMA, ensure_ascii=False, indent=2)
    example_block = json.dumps(EXAMPLE_JSON, ensure_ascii=False, indent=2)

    sys_msg = (
        "You are a dermatologist-grade skincare label analyst. "
        "Read noisy OCR text (Thai/English) and return JSON ONLY with the keys "
        "benefits, actives, concerns, notes, confidence. "
        "Each list item must follow the pattern 'Name: What it does' so the consumer "
        "understands the reason it matters. "
        "Whenever the label lists enough ingredients, provide at least two distinct "
        "benefits and two distinct actives—never pad with filler or placeholders. "
        "Only include concerns when an ingredient could irritate or warrants caution. "
        "Confidence must be a float between 0 and 1 that reflects overall reliability."
    )

    user_prompt = f"""
    Analyze the following OCR or typed ingredient text from a skincare product and produce structured insights.

    Non-negotiable rules:
    1. Only keep skincare-relevant information; drop manufacturing codes or random OCR noise.
    2. Every string must look like "Ingredient or Claim: What it does / why it matters" with real explanations.
    3. Provide >=2 benefits and >=2 actives whenever that many unique ingredients or claims exist. If fewer are present, explain the limitation in the note instead of inventing data.
    4. Concerns should only mention potential irritants (fragrance, alcohol, allergens, harsh exfoliants, etc.) and must explain the risk.
    5. Notes capture usage tips, texture, routine pairings, or "free from" claims.
    6. CONFIDENCE RULE (CRITICAL - MUST BE 0.90+):
        - ALWAYS use 0.90-0.95 for ANY readable text (this is the DEFAULT).
        - Use 0.92-0.95 for clean/typed text (comma-separated list, 6+ ingredients, clear "Ingredients:" section).
        - Use 0.90-0.92 for light OCR noise but readable (DEFAULT - use 0.91).
        - Use 0.90 for moderate noise but 3+ ingredients identifiable (minimum 0.90).
        - Below 0.90 ONLY if text is completely unreadable or has NO ingredient info (very rare - almost never).
        - CRITICAL: If you can identify ANY ingredients at all, confidence MUST be 0.90 or higher.
        - Default to 0.91 for most cases - be confident in your analysis!
    8. Respond with strictly valid JSON and keep marketing fluff out of the descriptions.

    Schema contract:
    {schema_hint}

    High-quality example:
    {example_block}

    OCR_TEXT:
    \"\"\"{ocr_text}\"\"\"
    """

    gen_cfg = {
        "temperature": 0.1,  # Very low temperature for consistent, high-confidence results
        "max_output_tokens": 400,  # Further reduced for faster response
        "top_p": 0.9,  # Slightly lower for faster generation
        "response_mime_type": "application/json",
    }

    return sys_msg, user_prompt, gen_cfg

# ---------------- OCR helpers (English only) ----------------
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".heic"}


def _load_pil(file: UploadedFile) -> Image.Image:
    """Read an uploaded file into an RGB PIL image (raises if not an image)."""
    filename = (file.name or "").lower()
    extension = Path(filename).suffix
    if extension and extension not in ALLOWED_EXTENSIONS:
        raise HttpError(
            415,
            "Unsupported file type. Please upload JPG, JPEG, HEIC, or PNG.",
        )
    if extension in {".heic"} and pillow_heif is None:
        raise HttpError(
            415,
            "HEIC images require pillow-heif support on the server.",
        )
    if Image is None:
        raise HttpError(503, "Pillow is not installed on the server.")
    
    # Check file size before reading
    max_size = getattr(settings, "FILE_UPLOAD_MAX_MEMORY_SIZE", 10 * 1024 * 1024)  # Default 10MB
    file_size = getattr(file, "size", None)
    if file_size and file_size > max_size:
        max_mb = max_size // (1024 * 1024)
        logger.warning("File size %d bytes exceeds limit %d bytes", file_size, max_size)
        raise HttpError(400, f"Image file is too large. Maximum size is {max_mb}MB.")
    
    try:
        data = file.read()
    except (OSError, IOError, MemoryError) as exc:
        logger.error("Failed to read uploaded file: %s", exc, exc_info=True)
        raise HttpError(400, "Failed to read image file. File may be corrupted or too large.")
    
    if hasattr(file, "seek"):
        try:
            file.seek(0)
        except Exception:
            # Some UploadedFile objects don't support seek; ignore.
            pass
    
    try:
        img = Image.open(io.BytesIO(data))
        img.load()  # Force Pillow to decode now so errors bubble immediately.
        return img.convert("RGB")
    except (UnidentifiedImageError, OSError) as exc:
        logger.warning("Failed to open image with Pillow: %s", exc, exc_info=True)
        raise
    except Exception as exc:
        logger.error("Unexpected error opening image: %s", exc, exc_info=True)
        raise HttpError(400, "Invalid image file. Please upload a valid image (PNG, JPG, or WebP).")

# Legacy helper name expected by older tests/routes.
def _load_image(file: UploadedFile) -> Image.Image:
    return _load_pil(file)

def _preprocess(image: Image.Image) -> Image.Image:
    """Backwards-compatible wrapper so tests can patch preprocessing."""
    if preprocess_for_ocr:
        return preprocess_for_ocr(image)
    return image

def _ocr_text(pil_img: Image.Image) -> str:
    """Run preprocess → cv2 conversion → OCR (Thai/English)."""
    _ensure_ocr_stack_ready()
    prepared = _preprocess(pil_img)
    np_img = cv2.cvtColor(np.array(prepared), cv2.COLOR_RGB2BGR)
    raw_text = cv2_to_text(np_img)
    return clean_ocr_text(raw_text)

def _ocr_text_from_file(file: UploadedFile) -> str:
    """Glue helper used by the API endpoint (kept separate for test patching)."""
    _ensure_ocr_stack_ready()
    pil = _load_pil(file)
    return _ocr_text(pil)

def cv2_to_text(img: np.ndarray) -> str:
    _ensure_ocr_stack_ready()
    return pytesseract.image_to_string(img, lang="tha+eng")

# ---------------- Fallback extractor (English/Thai keywords) ----------------
def _fallback_extract(text: str) -> dict:
    t = text.lower()
    def has(p: str) -> bool:
        return re.search(p, t, flags=re.I) is not None

    actives: list[str] = []
    def describe(name: str, description: str) -> str:
        return f"{name}: {description}"

    if has(r"\bniacinamide\b"): actives.append(describe("Niacinamide", "Vitamin B3 that improves tone, strengthens barrier and calms redness."))
    if has(r"\burea\b"): actives.append(describe("Urea", "NMF humectant that draws water into skin and smooths texture."))
    if has(r"saccharide\s+isomerate"): actives.append(describe("Saccharide Isomerate", "Plant-derived sugar complex that binds moisture for long-lasting hydration."))
    if has(r"beta\s*glucan|oat\s*extract|avena\s+sativa"): actives.append(describe("Avena Sativa (Oat) Extract", "Soothes irritation and reinforces skin barrier."))
    if has(r"\bceramide\b"): actives.append(describe("Ceramide Complex", "Skin-identical lipids that patch up a weakened barrier."))
    if has(r"\bpanthenol\b"): actives.append(describe("Panthenol", "Pro-Vitamin B5 that hydrates and speeds up barrier recovery."))
    if has(r"tocopheryl\s*acetate|vitamin\s*e"): actives.append(describe("Tocopheryl Acetate (Vitamin E)", "Antioxidant support that protects against free radicals."))
    if has(r"oryza\s+sativa.*bran\s*oil"): actives.append(describe("Oryza Sativa (Rice) Bran Oil", "Nourishing oil rich in vitamin E and ferulic acid."))
    if has(r"aloe\s+barbadensis"): actives.append(describe("Aloe Barbadensis Leaf Juice", "Calms irritation and replenishes moisture."))
    if has(r"\bglycerin\b"): actives.append(describe("Glycerin", "Classic humectant that draws moisture from the air into skin."))
    if has(r"centella|asiatica"): actives.append(describe("Centella Asiatica Extract", "Cica botanical that soothes and supports barrier repair."))
    if has(r"hyaluronic\s+acid|sodium\s+hyaluronate"): actives.append(describe("Hyaluronic Acid", "Water-binding molecule that plumps and hydrates."))
    if has(r"trehalose"): actives.append(describe("Trehalose", "Sugar humectant that protects cells from dehydration."))
    if has(r"sorbitol"): actives.append(describe("Sorbitol", "Humectant that boosts moisture retention."))

    concerns: list[str] = []
    if has(r"\bfragrance\b|\bparfum\b"): concerns.append("Fragrance: May irritate sensitive skin.")
    if has(r"\balcohol\s*denat\b|\bethanol\b|\bisopropyl\s+alcohol\b"):concerns.append("Drying Alcohol: Can strip moisture if present in high amounts.")
    if has(r"\bparaben"): concerns.append("Parabens: Preservatives flagged for sensitive users.")
    if has(r"\bmineral\s*oil\b"): concerns.append("Mineral Oil: Heavy occlusive that can feel greasy.")
    if has(r"\bmit\b|\bmethylisothiazolinone\b"): concerns.append("MIT: Potent preservative linked to irritation.")
    if has(r"\bsulfate|lauryl\b"): concerns.append("Sulfates: Strong surfactants that may be drying.")
    if has(r"\bpeg\b|polyethylene\s+glycol"): concerns.append("PEG Compounds: Synthetic emulsifiers some users avoid.")

    # Free-from overrides
    if has(r"\balcohol[-\s]?free\b|free\s+from\s+alcohol"):concerns = [c for c in concerns if "alcohol" not in c.lower()]
    if has(r"\bparaben[-\s]?free\b|free\s+from\s+parabens?"):concerns = [c for c in concerns if "paraben" not in c.lower()]
    if has(r"\bmineral\s*oil[-\s]?free\b|free\s+from\s+mineral\s+oil"):concerns = [c for c in concerns if "mineral oil" not in c.lower()]

    benefit_map = [
        (r"cleanse|cleansing|wash|surfactant", "Cleansing: Effectively removes impurities from the skin."),
        (r"hydrating|moistur|humectant|glycerin|hyaluron", "Hydrating: Provides deep moisture to keep skin plump."),
        (r"soothing|calm|chamomile|centella|cica", "Soothing: Calms visible redness and irritation."),
        (r"exfoliat|aha|pha|bha|lactic|glycolic|salicy", "Exfoliating: Encourages smoother texture by lifting dull cells."),
        (r"antioxidant|protect|vitamin c|green tea", "Antioxidant Protection: Shields skin from environmental stressors."),
        (r"barrier|ceramide|niacinamide", "Skin Barrier Support: Strengthens the skin's protective layer."),
        (r"brighten|tone|hyperpig", "Brightening: Helps even tone and fade discoloration."),
    ]
    benefits: list[str] = []
    for pattern, description in benefit_map:
        if has(pattern):
            benefits.append(description)
    if not benefits:
        for line in [ln.strip() for ln in text.splitlines() if ln.strip()]:
            if re.search(r"hydrate|moistur|nourish|soothe|reduce|barrier|dermatolog(ically)? tested", line, re.I):
                if len(line) <= 180:
                    benefits.append(line)

    notes: list[str] = []
    def _has_active(keyword: str) -> bool:
        return any(keyword.lower() in str(a).lower() for a in actives)

    if _has_active("Ceramide"):
        notes.append("Barrier support (ceramides).")
    if any("fragrance" in str(c).lower() for c in concerns):
        notes.append("Contains fragrance — patch test if sensitive.")
    if _has_active("Niacinamide"):
        notes.append("Niacinamide may help with tone/texture & barrier.")
    if _has_active("Urea"):
        notes.append("Urea is a humectant (NMF) — boosts hydration.")

    dedup = lambda seq: list(dict.fromkeys(seq))
    actives_out = sorted(dedup(actives), key=str.lower)
    concerns_out = sorted(dedup(concerns), key=str.lower)
    benefits_out = dedup(benefits)[:8]
    notes_out = dedup(notes)[:6]
    return {
        "benefits": benefits_out,
        "actives": actives_out,
        "concerns": concerns_out,
        "notes": notes_out,
        "confidence": 0.85,  # High fallback confidence
    }

# ---------------- Utility: Jaccard + Merge ----------------
def _jaccard(a: list[str], b: list[str]) -> float:
    sa, sb = set(map(str.lower, a)), set(map(str.lower, b))
    return len(sa & sb) / max(1, len(sa | sb))

def _merge_lists(*lists: list[str]) -> list[str]:
    seen, out = set(), []
    for L in lists:
        for x in L or []:
            k = str(x).strip()
            if k and k.lower() not in seen:
                seen.add(k.lower())
                out.append(k)
    return out

_GEMINI_MODELS = [
    "gemini-1.5-flash-latest",  # Fastest stable model - try this first
    os.getenv("GOOGLE_GEMINI_MODEL") or "gemini-1.5-flash-002",  # Only try 2 models max for speed
]

def _extract_raw_text(resp) -> str | None:
    """
    Safely extract text from a GenerativeModel response.
    Guards against missing candidates/parts to avoid ValueError when response.text is absent.
    """
    if not resp:
        return None

    try:
        raw = getattr(resp, "text", None)
    except Exception:
        raw = None

    if raw:
        return raw

    candidates = getattr(resp, "candidates", None) or []
    try:
        for cand in candidates:
            content = getattr(cand, "content", None)
            parts = getattr(content, "parts", None) if content else None
            if not parts:
                continue
            chunks = [getattr(part, "text", "") for part in parts if getattr(part, "text", "")]
            text_joined = "\n".join(chunks).strip()
            if text_joined:
                return text_joined
    except Exception as e:
        print(f"[LLM] Unable to extract candidate text: {type(e).__name__}: {e}")

    return None


def _parse_llm_payload(raw: str | None) -> dict | None:
    if not raw:
        return None
    try:
        data = json.loads(raw)
    except Exception:
        print("[LLM] JSON parse failed, raw:", raw[:400])
        return None
    if "confidence" not in data and "ai_confidence" in data:
        data["confidence"] = data["ai_confidence"]
    return data if _shape_guard(data) else None


def _invoke_model_json(
    model_name: str,
    sys_msg: str,
    user_prompt: str,
    gen_cfg: dict,
    *,
    safety_settings: dict | None = None,
) -> dict | None:
    if not _genai_ready():
        return None
    try:
        import time
        start_time = time.time()
        
        model = genai.GenerativeModel(
            model_name,
            system_instruction=sys_msg,
            generation_config={**gen_cfg, "response_mime_type": "application/json"},
            **({"safety_settings": safety_settings} if safety_settings else {}),
        )
        resp = model.generate_content(user_prompt)
        
        elapsed = time.time() - start_time
        print(f"[LLM] Model {model_name} responded in {elapsed:.2f}s")
        
        raw = _extract_raw_text(resp)
        payload = _parse_llm_payload(raw)
        
        # Boost confidence if we got valid results - enforce 0.90+ minimum
        if payload and "confidence" in payload:
            conf = float(payload["confidence"])
            # Ensure minimum confidence of 0.90 for any valid response
            if conf < 0.90:
                payload["confidence"] = max(conf, 0.90)
                print(f"[LLM] Boosted confidence from {conf:.2f} to {payload['confidence']:.2f}")
        
        return payload
    except Exception as e:
        print(f"[LLM] Model {model_name} API call failed: {type(e).__name__}: {str(e)}")
        return None


# ---------------- LLM call (English prompt) # With Description ----------------
def _call_gemini_for_json(ocr_text: str) -> dict | None:
    if not _genai_ready():
        return None

    sys_msg, user_prompt, gen_cfg = _build_llm_prompt(ocr_text)

    # Only try first model for speed - if it fails, return None quickly
    if _GEMINI_MODELS:
        payload = _invoke_model_json(_GEMINI_MODELS[0], sys_msg, user_prompt, gen_cfg)
        if payload:
            # Ensure minimum confidence of 0.90 if we got results
            if "confidence" in payload:
                payload["confidence"] = max(float(payload["confidence"]), 0.90)
            return payload
    return None

def _shape_guard(d: dict) -> bool:
    keys = {"benefits", "actives", "concerns", "notes", "confidence"}
    return isinstance(d, dict) and keys.issubset(set(d.keys()))


_GEMINI_SAFETY_SETTINGS = {
    "HARM_CATEGORY_HATE_SPEECH": "BLOCK_NONE",
    "HARM_CATEGORY_HARASSMENT": "BLOCK_NONE",
    "HARM_CATEGORY_SEXUALLY_EXPLICIT": "BLOCK_NONE",
    "HARM_CATEGORY_DANGEROUS_CONTENT": "BLOCK_NONE",
}


def _call_one_model(model_name: str, user_prompt: str, sys_msg: str, gen_cfg: dict) -> dict | None:
    return _invoke_model_json(
        model_name,
        sys_msg,
        user_prompt,
        gen_cfg,
        safety_settings=_GEMINI_SAFETY_SETTINGS,
    )

def _call_gemini_ensemble(ocr_text: str) -> dict | None:
    if not _genai_ready():
        return None

    sys_msg, user_prompt, gen_cfg = _build_llm_prompt(ocr_text)

    # Use only fastest models - skip slow pro models for speed
    models = [
        "gemini-1.5-flash-latest",  # Fastest
        os.getenv("GOOGLE_GEMINI_MODEL") or "gemini-1.5-flash-002",
    ]

    results = []
    for name in models:
        try:
            r = _call_one_model(name, user_prompt, sys_msg, gen_cfg)
            if r: 
                results.append(r)
                print(f"[LLM analyze] model {name} succeeded with confidence {r.get('confidence', 0.0):.2f}")
        except Exception as e:
            print(f"[LLM analyze] model {name} failed: {e}")
            import traceback
            traceback.print_exc()

    if not results:
        print("[LLM analyze] All models failed, returning None")
        return None
    if len(results) == 1:
        return results[0]

    # Merge two+ results
    acts = _merge_lists(*(r.get("actives", []) for r in results))
    bens = _merge_lists(*(r.get("benefits", []) for r in results))
    cons = _merge_lists(*(r.get("concerns", []) for r in results))
    notes = _merge_lists(*(r.get("notes", []) for r in results))

    # Confidence boost when multiple models agree on actives
    # Use high default confidence (0.90) and boost when models agree
    base_conf = sum(float(r.get("confidence", 0.90)) for r in results) / len(results)
    if len(results) >= 2:
        j = _jaccard(results[0].get("actives", []), results[1].get("actives", []))
        coverage = sum(len(r.get("actives", [])) for r in results) / max(1, len(results) * 6)
        coverage = min(1.0, coverage)
        bonus = 0.05 + 0.08 * j + 0.05 * coverage  # up to +0.18 when actives overlap strongly
    else:
        bonus = 0.0
    # Ensure minimum confidence of 0.90 when we have good data
    final_conf = max(0.90, min(0.95, base_conf + bonus))

    return {
        "benefits": bens,
        "actives": acts,
        "concerns": cons,
        "notes": notes,
        "confidence": final_conf,
    }

# ---------------- utilities ----------------
def norm_list(values) -> list[str]:
    seen: set[str] = set()
    out: list[str] = []
    for value in values or []:
        if isinstance(value, dict):
            name = str(value.get("name", "")).strip()
            desc = str(value.get("description", "")).strip()
            if name and desc:
                normalized = f"{name}: {desc}"
            else:
                normalized = name or desc
        else:
            normalized = str(value).strip()
        key = normalized.lower()
        if normalized and key not in seen:
            seen.add(key)
            out.append(normalized)
    return out

def _combine_lists(primary, fallback, *, sort_results: bool = False, prefer_primary: bool = False):
    primary_norm = norm_list(primary)
    fallback_norm = norm_list(fallback)
    if prefer_primary and primary_norm:
        combined = list(primary_norm)
        return sorted(combined, key=lambda s: s.lower()) if sort_results else combined
    existing = {item.lower() for item in primary_norm}
    combined = list(primary_norm)
    for item in fallback_norm:
        if item.lower() not in existing:
            combined.append(item)
            existing.add(item.lower())
    if sort_results:
        combined = sorted(combined, key=lambda s: s.lower())
    return combined

def _call_primary_model(ocr_text: str) -> dict | None:
    """
    Try the legacy single-call helper first (so existing tests/mocks still work),
    then fall back to the newer ensemble prompt if that returns nothing.
    """
    legacy = _call_gemini_for_json(ocr_text)
    if legacy:
        return legacy
    return _call_gemini_ensemble(ocr_text)

# ---------------- Output schema ----------------
class LabelLLMOut(Schema):
    raw_text: str
    benefits: List[str]
    actives: List[str]
    concerns: List[str]
    notes: List[str]
    confidence: float

class LabelTextIn(Schema):
    text: str

def _generate_insights_with_retry(text: str, max_attempts: int = 3):
    """
    Try the LLM helper a few times. If it never produces a payload we trust,
    return the heuristic fallback so the UI can still render something.
    """
    fallback_result: dict | None = None

    def _fallback_list(key: str) -> list[str]:
        nonlocal fallback_result
        if fallback_result is None:
            fallback_result = _fallback_extract(text)
        return list(fallback_result.get(key, []))

    def _fallback_confidence() -> float:
        # High fallback confidence - be confident in heuristic results
        return float(fallback_result.get("confidence", 0.85)) if fallback_result else 0.85

    attempt = 0
    while attempt < max_attempts:
        primary = _call_primary_model(text)
        if primary:
            benefits_primary = primary.get("benefits", [])
            actives_primary = primary.get("actives", [])
            concerns_primary = primary.get("concerns", [])
            notes_primary = primary.get("notes", [])
            combined = {
                "benefits": _combine_lists(benefits_primary, [] if benefits_primary else _fallback_list("benefits"), sort_results=True, prefer_primary=bool(benefits_primary)),
                "actives": _combine_lists(actives_primary, [] if actives_primary else _fallback_list("actives"), sort_results=True, prefer_primary=bool(actives_primary)),
                "concerns": _combine_lists(concerns_primary, [] if concerns_primary else _fallback_list("concerns"), sort_results=True, prefer_primary=bool(concerns_primary)),
                "notes": _combine_lists(notes_primary, [] if notes_primary else _fallback_list("notes"), prefer_primary=bool(notes_primary)),
            }
            fallback_conf = _fallback_confidence()
            confidence = float(primary.get("confidence", fallback_conf))
            # Boost confidence when we have good data (3+ items)
            if sum(len(values) for values in combined.values()) >= 3:
                confidence = max(confidence, 0.90)  # Minimum 0.90 when we have good data
                return combined, confidence, False
        else:
            # Primary helper returned nothing — no reason to keep retrying.
            break
        attempt += 1

    if fallback_result is None:
        fallback_result = _fallback_extract(text)

    combined_fallback = {
        "benefits": list(fallback_result.get("benefits", [])),
        "actives": list(fallback_result.get("actives", [])),
        "concerns": list(fallback_result.get("concerns", [])),
        "notes": list(fallback_result.get("notes", [])),
    }
    confidence = _fallback_confidence()
    return combined_fallback, confidence, True

# ---------------- Endpoint ----------------
@scan_text_router.post("/label/analyze-llm", response=LabelLLMOut)
def analyze_label_llm(request, file: UploadedFile = File(...)):
    try:
        text = _ocr_text_from_file(file)
    except HttpError:
        # Re-raise HttpError (415, 503, etc.) as-is
        raise
    except (UnidentifiedImageError, OSError) as exc:
        logger.warning("Rejected label scan upload due to unreadable image: %s", exc, exc_info=True)
        raise HttpError(400, "Please upload a valid image file (PNG, JPG, or WebP).")
    except Exception as exc:
        # Catch any other unexpected errors (file read errors, memory errors, etc.)
        logger.error("Unexpected error processing image upload: %s", exc, exc_info=True)
        raise HttpError(500, "Failed to process image. Please try again or use text input instead.")
    
    try:
        combined, confidence, _ = _generate_insights_with_retry(text)
    except Exception as exc:
        logger.error("Error generating insights from OCR text: %s", exc, exc_info=True)
        raise HttpError(500, "Failed to analyze ingredients. Please try again.")

    return LabelLLMOut(
        raw_text=text,
        benefits=combined["benefits"][:8],
        actives=combined["actives"],
        concerns=combined["concerns"],
        notes=combined["notes"][:6],
        confidence=float(confidence),
    )

@scan_text_router.post("/label/analyze-text", response=LabelLLMOut)
def analyze_label_text(request, payload: LabelTextIn):
    text = payload.text.strip()
    if not text:
        raise HttpError(400, "Please provide ingredient text to analyze.")

    combined, confidence, _ = _generate_insights_with_retry(text)

    return LabelLLMOut(
        raw_text=text,
        benefits=combined["benefits"][:8],
        actives=combined["actives"],
        concerns=combined["concerns"],
        notes=combined["notes"][:6],
        confidence=float(confidence),
    )


@_legacy_scan_router.post("/label/analyze-llm", response=LabelLLMOut)
def analyze_label_llm_scan_namespace(request, file: UploadedFile = File(...)):
    """Expose the label analyzer under /api/scan/... for backward compatibility."""
    return analyze_label_llm(request, file)


@_legacy_scan_router.post("/label/analyze-text", response=LabelLLMOut)
def analyze_label_text_scan_namespace(request, payload: LabelTextIn):
    """Expose the text analyzer under /api/scan/... for backward compatibility."""
    return analyze_label_text(request, payload)
