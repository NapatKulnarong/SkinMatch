# backend/core/api_scan_text.py
from __future__ import annotations

import io, os, re, json
from typing import List, Optional

import cv2
import numpy as np
from PIL import Image
import pytesseract
from ninja import Router, File, Schema
from ninja.files import UploadedFile

# Optional Gemini SDK (falls back if not configured)
try:
    import google.generativeai as genai  # type: ignore
except ModuleNotFoundError:
    genai = None

# --- Optional project helpers (safe fallbacks if missing) ---
try:
    from .utils_ocr import preprocess_for_ocr  # if you kept it
except Exception:  # pragma: no cover
    preprocess_for_ocr = None  # type: ignore

def clean_ocr_text(s: str) -> str:
    s = s.replace("\u200b", "").replace("\ufeff", "")
    s = re.sub(r"[^\S\r\n]{2,}", " ", s)  # collapse multi-spaces
    s = re.sub(r"\n{3,}", "\n\n", s)       # collapse blank lines
    return s.strip()

scan_text_router = Router(tags=["scan-text"])

# ---------------- OCR helpers (English only) ----------------
def _load_pil(file: UploadedFile) -> Image.Image:
    data = file.read()
    return Image.open(io.BytesIO(data)).convert("RGB")

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

# ---------------- Fallback extractor (English keywords) ----------------
def _fallback_extract(text: str) -> dict:
    t = text.lower()
    def has(p: str) -> bool:
        return re.search(p, t, flags=re.I) is not None

    actives: list[str] = []
    if has(r"\bniacinamide\b"): actives.append("Niacinamide")
    if has(r"\burea\b"): actives.append("Urea")
    if has(r"saccharide\s+isomerate"): actives.append("Saccharide Isomerate")
    if has(r"beta\s*glucan|oat\s*extract|avena\s+sativa"):
        actives.append("Avena Sativa (Oat) Extract")
    if has(r"\bceramide\b"): actives.append("Ceramide Complex")
    if has(r"\bpanthenol\b"): actives.append("Panthenol")
    if has(r"tocopheryl\s*acetate|vitamin\s*e"): actives.append("Tocopheryl Acetate")
    if has(r"oryza\s+sativa.*bran\s*oil"): actives.append("Oryza Sativa (Rice) Bran Oil")
    if has(r"aloe\s+barbadensis"): actives.append("Aloe Barbadensis Leaf Juice Powder")

    concerns: list[str] = []
    if has(r"\bfragrance\b|\bparfum\b"): concerns.append("Fragrance")
    if has(r"\balcohol\s*denat\b|\bethanol\b|\bisopropyl\s+alcohol\b"):
        concerns.append("Drying Alcohol")
    if has(r"\bparaben"): concerns.append("Parabens")
    if has(r"\bmineral\s*oil\b"): concerns.append("Mineral Oil")
    if has(r"\bmit\b|\bmethylisothiazolinone\b"): concerns.append("MIT")

    # Free-from overrides
    if has(r"\balcohol[-\s]?free\b|free\s+from\s+alcohol"):
        concerns = [c for c in concerns if "alcohol" not in c.lower()]
    if has(r"\bparaben[-\s]?free\b|free\s+from\s+parabens?"):
        concerns = [c for c in concerns if "paraben" not in c.lower()]
    if has(r"\bmineral\s*oil[-\s]?free\b|free\s+from\s+mineral\s+oil"):
        concerns = [c for c in concerns if "mineral oil" not in c.lower()]

    benefits: list[str] = []
    for line in [ln.strip() for ln in text.splitlines() if ln.strip()]:
        if re.search(r"hydrate|moistur|nourish|soothe|reduce|barrier|dermatolog(ically)? tested", line, re.I):
            if len(line) <= 180:
                benefits.append(line)

    notes: list[str] = []
    if any("Ceramide" in a for a in actives): notes.append("Barrier support (ceramides).")
    if any("fragrance" in c.lower() for c in concerns): notes.append("Contains fragrance — patch test if sensitive.")
    if any("Niacinamide" == a for a in actives): notes.append("Niacinamide may help with tone/texture & barrier.")
    if any("Urea" == a for a in actives): notes.append("Urea is a humectant (NMF) — boosts hydration.")

    return {
        "benefits": benefits[:8],
        "actives": sorted(set(actives)),
        "concerns": sorted(set(concerns)),
        "notes": notes[:6],
        "confidence": 0.55,
    }

# ---------------- Output schema ----------------
class LabelLLMOut(Schema):
    raw_text: str
    benefits: List[str]
    actives: List[str]
    concerns: List[str]
    notes: List[str]
    confidence: float
    free_from: List[str] = []

# ---------------- LLM call (English prompt) ----------------
_GEMINI_MODELS = [
    os.getenv("GOOGLE_GEMINI_MODEL") or "gemini-2.0-flash",
    "gemini-2.5-flash",
    "gemini-1.5-flash",
]

def _call_gemini_for_json(ocr_text: str) -> Optional[dict]:
    if genai is None or not os.getenv("GOOGLE_API_KEY"):
        return None

    sys_msg = (
        "You are a skincare label analyst. Extract concise facts from OCR text. "
        "Return STRICT JSON ONLY (no prose)."
    )
    schema_hint = {
        "type": "object",
        "properties": {
            "benefits": {"type": "array", "items": {"type": "string"}},
            "actives": {"type": "array", "items": {"type": "string"}},
            "concerns": {"type": "array", "items": {"type": "string"}},
            "notes": {"type": "array", "items": {"type": "string"}},
            "confidence": {"type": "number"}
        },
        "required": ["benefits", "actives", "concerns", "notes", "confidence"],
        "additionalProperties": False
    }
    user_prompt = f"""
Extract information from the following product label text (English).
Focus on skincare claims and ingredients.
If a “free from …” statement is present (e.g., alcohol-free, paraben-free), DO NOT list that item as a concern.

Return ONLY JSON matching this schema:
{json.dumps(schema_hint, ensure_ascii=False)}

OCR_TEXT:
\"\"\"{ocr_text}\"\"\"
"""

    gen_cfg = {
        "temperature": 0.2,
        "max_output_tokens": 768,
        "response_mime_type": "application/json",
    }

    for model_name in _GEMINI_MODELS:
        try:
            model = genai.GenerativeModel(model_name, system_instruction=sys_msg, generation_config=gen_cfg)
            resp = model.generate_content(user_prompt, safety_settings={
                "HARM_CATEGORY_HATE_SPEECH": "BLOCK_NONE",
                "HARM_CATEGORY_HARASSMENT": "BLOCK_NONE",
                "HARM_CATEGORY_SEXUALLY_EXPLICIT": "BLOCK_NONE",
                "HARM_CATEGORY_DANGEROUS_CONTENT": "BLOCK_NONE",
            })
            raw = getattr(resp, "text", None)
            if not raw and getattr(resp, "candidates", None):
                cand0 = resp.candidates[0]
                parts = getattr(cand0, "content", None)
                if parts and getattr(parts, "parts", None):
                    chunks = [getattr(p, "text", "") for p in parts.parts if getattr(p, "text", "")]
                    raw = "\n".join(chunks).strip()
            if not raw:
                continue
            data = json.loads(raw)
            for k in ["benefits", "actives", "concerns", "notes", "confidence"]:
                if k not in data:
                    raise ValueError(f"missing key {k}")
            return data
        except Exception as e:
            print(f"[LLM analyze] model {model_name} failed/blocked: {e}")
            continue
    return None

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

def norm_list(xs) -> list[str]:
    return [str(s).strip() for s in (xs or []) if str(s).strip()]

# ---------------- Endpoint ----------------
@scan_text_router.post("/label/analyze-llm", response=LabelLLMOut)
def analyze_label_llm(request, file: UploadedFile = File(...)):
    pil = _load_pil(file)
    raw = _ocr_text(pil)
    text = clean_ocr_text(raw)
 
    llm = _call_gemini_for_json(text) or _fallback_extract(text)

    benefits = norm_list(llm.get("benefits"))
    actives  = sorted(set(norm_list(llm.get("actives"))))
    concerns = sorted(set(norm_list(llm.get("concerns"))))
    notes    = norm_list(llm.get("notes"))[:6]
    free_from = _derive_free_from(notes)

    return LabelLLMOut(
        raw_text=text,
        benefits=benefits[:8],
        actives=actives,
        concerns=concerns,
        notes=notes,
        confidence=float(llm.get("confidence", 0.5)),
        free_from=free_from,
    )