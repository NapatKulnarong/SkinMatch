# core/api_scan_text.py  (append to your existing file)
from __future__ import annotations
import io, json, re, os
from typing import List
import cv2, numpy as np
from PIL import Image
import pytesseract
from ninja import Router, File, Schema
from ninja.files import UploadedFile

# ❗ Gemini SDK is optional — reuse the instance configured in core/api.py
try:
    import google.generativeai as genai
except ModuleNotFoundError:
    genai = None

scan_text_router = Router(tags=["scan"])

# ---------- existing OCR helpers (or import yours) ----------
def _load_image(file: UploadedFile) -> np.ndarray:
    data = file.read()
    pil = Image.open(io.BytesIO(data)).convert("RGB")
    return cv2.cvtColor(np.array(pil), cv2.COLOR_RGB2BGR)

def _preprocess(img: np.ndarray) -> np.ndarray:
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    gray = cv2.bilateralFilter(gray, 7, 50, 50)
    thr = cv2.adaptiveThreshold(gray, 255, cv2.ADAPTIVE_THRESH_MEAN_C,
                                cv2.THRESH_BINARY, 35, 10)
    return thr

def _ocr_text(img: np.ndarray) -> str:
    return pytesseract.image_to_string(img, lang="tha+eng")

# ---------- fallback, same idea as before (short version) ----------
def _fallback_extract(text: str) -> dict:
    t = text.lower()
    def has(p): return re.search(p, t, flags=re.I)
    actives = []
    if has(r"\bniacinamide\b"): actives.append("niacinamide")
    if has(r"\burea\b"): actives.append("urea")
    if has(r"saccharide\s+isomerate"): actives.append("saccharide isomerate")
    if has(r"beta\s*glucan|oat\s*extract|avena\s+sativa"): actives.append("beta-glucan / oat extract")
    if has(r"\bceramide\b"): actives.append("ceramide complex")
    if has(r"\bpanthenol\b"): actives.append("panthenol")

    concerns = []
    if has(r"\bfragrance\b|\bparfum\b"): concerns.append("fragrance")
    if has(r"\balcohol\s*denat\b|\bethanol\b|\bisopropyl alcohol\b"): concerns.append("drying alcohol")
    if has(r"\bparaben"): concerns.append("paraben")
    if has(r"\bmineral\s*oil\b"): concerns.append("mineral oil")
    if has(r"\bmit\b|\bmethylisothiazolinone\b"): concerns.append("MIT")
    # free-from overrides
    if has(r"ปราศจาก\s*alcohol|alcohol[- ]?free"): concerns = [c for c in concerns if "alcohol" not in c]
    if has(r"ปราศจาก\s*paraben|paraben[- ]?free"): concerns = [c for c in concerns if "paraben" not in c]
    if has(r"ปราศจาก\s*mineral\s*oil|mineral\s*oil[- ]?free"): concerns = [c for c in concerns if "mineral oil" in c]

    benefits = []
    for line in [ln.strip() for ln in text.splitlines() if ln.strip()]:
        if re.search(r"บำรุง|ชุ่มชื้น|ลด|ช่วย|ปลอบประโลม|dermatolog(ically)? tested|hydrate|barrier", line, re.I):
            if len(line) <= 180:
                benefits.append(line)
    notes = []
    if "ceramide" in " ".join(actives): notes.append("Ceramide complex suggests barrier-repair focus.")
    if any("fragrance" in c for c in concerns): notes.append("Fragrance detected; sensitive skin may patch test.")
    if "niacinamide" in actives: notes.append("Niacinamide may help tone/texture & barrier support.")
    if "urea" in actives: notes.append("Urea is a humectant (NMF) — boosts hydration.")
    return {
        "benefits": benefits[:8],
        "actives": sorted(set(actives)),
        "concerns": sorted(set(concerns)),
        "notes": notes[:6],
        "confidence": 0.55,  # fallback is heuristic
    }

# ---------- pydantic response ----------
class LabelLLMOut(Schema):
    raw_text: str
    benefits: List[str]
    actives: List[str]
    concerns: List[str]
    notes: List[str]
    confidence: float

# ---------- Gemini call ----------
_GEMINI_MODELS = [
    os.getenv("GOOGLE_GEMINI_MODEL") or "gemini-2.0-flash",
    "gemini-2.5-flash",
    "gemini-1.5-flash",
]

def _call_gemini_for_json(ocr_text: str) -> dict | None:
    if genai is None or not os.getenv("GOOGLE_API_KEY"):
        return None

    sys_msg = (
        "You are a skincare label analyst. Extract concise facts from OCR text "
        "(Thai/English). Return STRICT JSON ONLY (no prose)."
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
Extract information from the following product label text. 
Focus on skincare context (ingredients/claims). 
If a “free from” box says the product is free of something (e.g., alcohol, parabens), DO NOT list it as a concern.

Return JSON only matching this schema:
{json.dumps(schema_hint, ensure_ascii=False)}

OCR_TEXT:
\"\"\"{ocr_text}\"\"\"
"""

    gen_cfg = {
        "temperature": 0.2,
        "max_output_tokens": 768,
        # Newer SDKs support forcing JSON responses:
        "response_mime_type": "application/json",
    }

    for model_name in _GEMINI_MODELS:
        try:
            model = genai.GenerativeModel(model_name, system_instruction=sys_msg, generation_config=gen_cfg)
            resp = model.generate_content(user_prompt, safety_settings={
                # be permissive; we’re analyzing labels
                "HARM_CATEGORY_HATE_SPEECH": "BLOCK_NONE",
                "HARM_CATEGORY_HARASSMENT": "BLOCK_NONE",
                "HARM_CATEGORY_SEXUALLY_EXPLICIT": "BLOCK_NONE",
                "HARM_CATEGORY_DANGEROUS_CONTENT": "BLOCK_NONE",
            })
            # Prefer resp.text but handle blocked/parts
            raw = getattr(resp, "text", None)
            if not raw:
                # try parts
                cand0 = resp.candidates[0]
                parts = getattr(cand0, "content", None)
                if parts and getattr(parts, "parts", None):
                    chunks = [getattr(p, "text", "") for p in parts.parts if getattr(p, "text", "")]
                    raw = "\n".join(chunks).strip()
            if not raw:
                continue
            data = json.loads(raw)
            # minimal shape validation
            for k in ["benefits", "actives", "concerns", "notes", "confidence"]:
                if k not in data:
                    raise ValueError("missing key " + k)
            return data
        except Exception as e:
            # try next model
            print(f"[LLM analyze] model {model_name} failed/blocked: {e}")
            continue
    return None

# ---------- The endpoint ----------
@scan_text_router.post("/label/analyze-llm", response=LabelLLMOut)
def analyze_label_llm(request, file: UploadedFile = File(...)):
    img = _load_image(file)
    pre = _preprocess(img)
    text = _ocr_text(pre)

    llm = _call_gemini_for_json(text)
    if not llm:
        llm = _fallback_extract(text)
    # Deduplicate & trim
    def norm_list(xs): return [s.strip() for s in xs if str(s).strip()]
    return LabelLLMOut(
        raw_text=text,
        benefits=norm_list(llm.get("benefits", []))[:8],
        actives=sorted(set(norm_list(llm.get("actives", [])))),
        concerns=sorted(set(norm_list(llm.get("concerns", [])))),
        notes=norm_list(llm.get("notes", []))[:6],
        confidence=float(llm.get("confidence", 0.5)),
    )