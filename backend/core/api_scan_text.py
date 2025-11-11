from __future__ import annotations

import io, os, re, json
from typing import List, Optional, Tuple

from ninja.errors import HttpError
import cv2
import numpy as np
from PIL import Image
import pytesseract
from ninja import Router, File, Schema
from ninja.files import UploadedFile

try:
    import google.generativeai as genai
except ModuleNotFoundError:
    genai = None

API_KEY = os.getenv("GOOGLE_API_KEY")
if genai is not None and API_KEY:
    genai.configure(api_key=API_KEY)

from .utils_ocr import preprocess_for_ocr
from .text_cleaner import clean_ocr_text

scan_text_router = Router(tags=["scan-text"])

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
    6. confidence is a decimal between 0 and 1 (0.65+ only when the answer is trustworthy; go lower if the OCR text is messy).
    7. Confidence calibration:
        - 0.92 or higher when the text is clean/typed (comma-separated list, 6+ recognizable ingredients, or clear "Ingredients:" section).
        - 0.8–0.9 when there is light OCR noise but key actives/claims are intact.
        - Below 0.7 ONLY when the text is mostly noise or missing ingredient info.
        - Never default to a low confidence when the text is structured and readable.
    8. Respond with strictly valid JSON and keep marketing fluff out of the descriptions.

    Schema contract:
    {schema_hint}

    High-quality example:
    {example_block}

    OCR_TEXT:
    \"\"\"{ocr_text}\"\"\"
    """

    gen_cfg = {
        "temperature": 0.2,
        "max_output_tokens": 1024,
        "top_p": 0.4,
        "response_mime_type": "application/json",
    }

    return sys_msg, user_prompt, gen_cfg

# ---------------- OCR helpers (English only) ----------------
def _load_pil(file: UploadedFile) -> Image.Image:
    data = file.read()
    return Image.open(io.BytesIO(data)).convert("RGB")

def _load_image(file: UploadedFile) -> Image.Image:
    """Backwards-compatible alias expected by legacy tests."""
    return _load_pil(file)

def _preprocess(image: Image.Image) -> Image.Image:
    """Backwards-compatible wrapper so tests can patch preprocessing."""
    if preprocess_for_ocr:
        return preprocess_for_ocr(image)
    return image

def _pil_to_bgr(pil_img: Image.Image) -> np.ndarray:
    return cv2.cvtColor(np.array(pil_img), cv2.COLOR_RGB2BGR)

def _ocr_text(pil_img: Image.Image) -> str:
    if preprocess_for_ocr:
        pil_img = preprocess_for_ocr(pil_img)
        return pytesseract.image_to_string(pil_img, lang="eng")

    img = _pil_to_bgr(pil_img)
    img = cv2.resize(img, None, fx=1.6, fy=1.6, interpolation=cv2.INTER_CUBIC)
    img = cv2.bilateralFilter(img, d=7, sigmaColor=75, sigmaSpace=75)
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    th = cv2.adaptiveThreshold(
        gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 35, 11
    )
    return pytesseract.image_to_string(th, lang="eng")

def _ocr_text_from_file(file: UploadedFile) -> str:
    """Run full preprocess -> OCR -> cleanup"""
    data = file.read()
    pil = Image.open(io.BytesIO(data)).convert("RGB")

    # Preprocess + clean up
    pre_pil = preprocess_for_ocr(pil)
    pre_np = cv2.cvtColor(np.array(pre_pil), cv2.COLOR_RGB2BGR)
    raw_text = cv2_to_text(pre_np)
    return clean_ocr_text(raw_text)

def cv2_to_text(img: np.ndarray) -> str:
    return pytesseract.image_to_string(img, lang="tha+eng")

# ---------------- Fallback extractor (English keywords) ----------------
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

    return {
        "benefits": benefits[:8],
        "actives": sorted(set(actives)),
        "concerns": sorted(set(concerns)),
        "notes": notes[:6],
        "confidence": 0.55,
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
    os.getenv("GOOGLE_GEMINI_MODEL") or "gemini-2.0-flash",
    "gemini-2.5-flash",
    "gemini-1.5-flash",
]

# ---------------- LLM call (English prompt) # With Description ----------------
def _call_gemini_for_json(ocr_text: str) -> dict | None:
    if genai is None or not os.getenv("GOOGLE_API_KEY"):
        return None

    sys_msg, user_prompt, gen_cfg = _build_llm_prompt(ocr_text)

    for model_name in _GEMINI_MODELS:
        try:
            model = genai.GenerativeModel(model_name, system_instruction=sys_msg, generation_config=gen_cfg)
            resp = model.generate_content(user_prompt)
            raw = getattr(resp, "text", None)
            if not raw and hasattr(resp, "candidates"):
                cand = resp.candidates[0]
                parts = getattr(cand, "content", None)
                if parts and getattr(parts, "parts", None):
                    chunks = [getattr(p, "text", "") for p in parts.parts if getattr(p, "text", "")]
                    raw = "\n".join(chunks).strip()

            if not raw:
                continue

            data = json.loads(raw)
            for k in ["benefits", "actives", "concerns", "notes", "confidence"]:
                if k not in data:
                    raise ValueError(f"Missing key: {k}")
            return data
        except Exception as e:
            print(f"[LLM analyze] {model_name} failed: {e}")
            continue
    return None

def _shape_guard(d: dict) -> bool:
    keys = {"benefits", "actives", "concerns", "notes", "confidence"}
    return isinstance(d, dict) and keys.issubset(set(d.keys()))

def _call_one_model(model_name: str, user_prompt: str, sys_msg: str, gen_cfg: dict) -> dict | None:
    try:
        # --- 1 Force Gemini to output JSON ---
        model = genai.GenerativeModel(
            model_name,
            system_instruction=sys_msg,
            generation_config={
                **gen_cfg,
                "response_mime_type": "application/json",  # ← ensures Gemini replies in strict JSON only
            },
        )
        # --- 2 Run the model safely ---
        resp = model.generate_content(user_prompt, safety_settings = {"HARM_CATEGORY_HATE_SPEECH": "BLOCK_NONE", 
                                                                      "HARM_CATEGORY_HARASSMENT": "BLOCK_NONE", 
                                                                      "HARM_CATEGORY_SEXUALLY_EXPLICIT": "BLOCK_NONE", 
                                                                      "HARM_CATEGORY_DANGEROUS_CONTENT": "BLOCK_NONE",})
    except Exception as e:
        print(f"[LLM] Model {model_name} API call failed: {type(e).__name__}: {str(e)}")
        return None

    # --- 3 Extract raw text (Gemini SDK differences) ---
    raw = getattr(resp, "text", None)
    if not raw and getattr(resp, "candidates", None):
        cand0 = resp.candidates[0]
        parts = getattr(cand0, "content", None)
        if parts and getattr(parts, "parts", None):
            chunks = [getattr(p, "text", "") for p in parts.parts if getattr(p, "text", "")]
            raw = "\n".join(chunks).strip()

    if not raw:
        return None

    # --- 4 Try to parse JSON, with debug help ---
    try:
        data = json.loads(raw)
    except Exception as e:
        print("[LLM] JSON parse failed, raw:", raw[:400])
        return None

    # --- 5 Normalize confidence key (ai_confidence → confidence) ---
    if "confidence" not in data and "ai_confidence" in data:
        data["confidence"] = data["ai_confidence"]

    # --- ⑥ Return only if it has required shape ---
    return data if _shape_guard(data) else None

def _call_gemini_ensemble(ocr_text: str) -> dict | None:
    if genai is None or not os.getenv("GOOGLE_API_KEY"):
        return None

    sys_msg, user_prompt, gen_cfg = _build_llm_prompt(ocr_text)

    models = [
        os.getenv("GOOGLE_GEMINI_MODEL") or "gemini-1.5-pro",
        "gemini-2.0-flash-exp",
        "gemini-1.5-flash",
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
    base_conf = sum(float(r.get("confidence", 0.6)) for r in results) / len(results)
    if len(results) >= 2:
        j = _jaccard(results[0].get("actives", []), results[1].get("actives", []))
        coverage = sum(len(r.get("actives", [])) for r in results) / max(1, len(results) * 6)
        coverage = min(1.0, coverage)
        bonus = 0.08 + 0.12 * j + 0.1 * coverage  # up to +0.3 when actives overlap strongly
    else:
        bonus = 0.0
    final_conf = max(0.0, min(1.0, base_conf + bonus))

    return {
        "benefits": bens,
        "actives": acts,
        "concerns": cons,
        "notes": notes,
        "confidence": final_conf,
    }

# ---------------- utilities ----------------
def _derive_free_from(notes: List[str]) -> List[str]:
    out: list[str] = []
    for n in notes:
        m = re.search(r"free\s*from[:\s]+(.+)", n, flags=re.I) or re.search(r"\b([\w\s/,-]+)-free\b", n, flags=re.I)
        if m:
            tail = m.group(1) if m.lastindex else n
            toks = re.split(r"[,/|]| and ", tail, flags=re.I)
            out.extend([t.strip() for t in toks if t.strip()])
    return sorted(set(out))

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

def _combine_lists(primary, fallback):
    primary_norm = norm_list(primary)
    fallback_norm = norm_list(fallback)
    existing = {item.lower() for item in primary_norm}
    combined = list(primary_norm)
    for item in fallback_norm:
        if item.lower() not in existing:
            combined.append(item)
            existing.add(item.lower())
    return combined

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

def _generate_insights_with_retry(text: str, max_attempts: int = 4):
    gemini_available = genai is not None and os.getenv("GOOGLE_API_KEY")
    
    # Try Gemini first for high-quality results
    if gemini_available:
        attempt = 0
        while attempt < max_attempts:
            primary = _call_gemini_ensemble(text)
            if primary:
                # Use fallback to supplement Gemini results
                fallback = _fallback_extract(text)
                combined = {
                    "benefits": _combine_lists(primary.get("benefits", []), fallback.get("benefits", [])),
                    "actives": _combine_lists(primary.get("actives", []), fallback.get("actives", [])),
                    "concerns": _combine_lists(primary.get("concerns", []), fallback.get("concerns", [])),
                    "notes": _combine_lists(primary.get("notes", []), fallback.get("notes", [])),
                }
                confidence = primary.get("confidence", 0.0)
                total_items = sum(len(values) for values in combined.values())
                
                # Return high-quality results (confidence >= 0.8 and sufficient items)
                if confidence >= 0.8 and total_items >= 3:
                    return combined, float(confidence)
            
            attempt += 1
        
        # Gemini is configured but failed - log warning and fall back to heuristic
        print(f"[WARNING] Gemini API failed after {max_attempts} attempts, falling back to heuristic extraction")
        # Continue to fallback below
    
    # Gemini not configured - use fallback as last resort
    fallback_result = _fallback_extract(text)
    fallback_items = sum(len(v) for v in [
        fallback_result.get("benefits", []), 
        fallback_result.get("actives", []), 
        fallback_result.get("concerns", []), 
        fallback_result.get("notes", [])
    ])
    
    # Return fallback only if it has at least some useful content
    if fallback_items >= 2:
        return {
            "benefits": fallback_result.get("benefits", []),
            "actives": fallback_result.get("actives", []),
            "concerns": fallback_result.get("concerns", []),
            "notes": fallback_result.get("notes", []),
        }, float(fallback_result.get("confidence", 0.55))
    
    # Only fail if we truly have nothing
    raise HttpError(503, "Unable to analyze the content. Please check that the text contains ingredient information and try again.")

# ---------------- Endpoint ----------------
@scan_text_router.post("/label/analyze-llm", response=LabelLLMOut)
def analyze_label_llm(request, file: UploadedFile = File(...)):
    text = _ocr_text_from_file(file)
    combined, confidence = _generate_insights_with_retry(text)

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

    combined, confidence = _generate_insights_with_retry(text)

    return LabelLLMOut(
        raw_text=text,
        benefits=combined["benefits"][:8],
        actives=combined["actives"],
        concerns=combined["concerns"],
        notes=combined["notes"][:6],
        confidence=float(confidence),
    )
