from __future__ import annotations

import io, os, re, json
from typing import List, Optional

import cv2
import numpy as np
from PIL import Image
import pytesseract
from ninja import Router, File, Schema
from ninja.files import UploadedFile

try:
    import google.generativeai as genai  # type: ignore
except ModuleNotFoundError:
    genai = None

API_KEY = os.getenv("GOOGLE_API_KEY")
if genai is not None and API_KEY:
    genai.configure(api_key=API_KEY)

from .utils_ocr import preprocess_for_ocr
from .text_cleaner import clean_ocr_text

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

def _ocr_text_from_file(file: UploadedFile) -> str:
    """Run full preprocess → OCR → cleanup"""
    data = file.read()
    pil = Image.open(io.BytesIO(data)).convert("RGB")

    # Preprocess + clean up
    pre_pil = preprocess_for_ocr(pil)
    pre_np = cv2.cvtColor(np.array(pre_pil), cv2.COLOR_RGB2BGR)
    raw_text = cv2_to_text(pre_np)
    return clean_ocr_text(raw_text)

def cv2_to_text(img: np.ndarray) -> str:
    import pytesseract
    return pytesseract.image_to_string(img, lang="tha+eng")

# ---------------- Fallback extractor (English keywords) ----------------
def _fallback_extract(text: str) -> dict:
    t = text.lower()
    def has(p: str) -> bool:
        return re.search(p, t, flags=re.I) is not None

    actives: list[str] = []
    if has(r"\bniacinamide\b"): actives.append("Niacinamide")
    if has(r"\burea\b"): actives.append("Urea")
    if has(r"saccharide\s+isomerate"): actives.append("Saccharide Isomerate")
    if has(r"beta\s*glucan|oat\s*extract|avena\s+sativa"): actives.append("Avena Sativa (Oat) Extract")
    if has(r"\bceramide\b"): actives.append("Ceramide Complex")
    if has(r"\bpanthenol\b"): actives.append("Panthenol")
    if has(r"tocopheryl\s*acetate|vitamin\s*e"): actives.append("Tocopheryl Acetate")
    if has(r"oryza\s+sativa.*bran\s*oil"): actives.append("Oryza Sativa (Rice) Bran Oil")
    if has(r"aloe\s+barbadensis"): actives.append("Aloe Barbadensis Leaf Juice Powder")

    concerns: list[str] = []
    if has(r"\bfragrance\b|\bparfum\b"): concerns.append("Fragrance")
    if has(r"\balcohol\s*denat\b|\bethanol\b|\bisopropyl\s+alcohol\b"):concerns.append("Drying Alcohol")
    if has(r"\bparaben"): concerns.append("Parabens")
    if has(r"\bmineral\s*oil\b"): concerns.append("Mineral Oil")
    if has(r"\bmit\b|\bmethylisothiazolinone\b"): concerns.append("MIT")

    # Free-from overrides
    if has(r"\balcohol[-\s]?free\b|free\s+from\s+alcohol"):concerns = [c for c in concerns if "alcohol" not in c.lower()]
    if has(r"\bparaben[-\s]?free\b|free\s+from\s+parabens?"):concerns = [c for c in concerns if "paraben" not in c.lower()]
    if has(r"\bmineral\s*oil[-\s]?free\b|free\s+from\s+mineral\s+oil"):concerns = [c for c in concerns if "mineral oil" not in c.lower()]

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

    sys_msg = (
        "You are a skincare label analyst. Analyze the OCR text (Thai/English) "
        "and extract structured product facts. Each category should include both "
        "a concise name and a one-line description. Return strictly valid JSON."
    )

    schema_hint = {
        "type": "object",
        "properties": {
            "benefits": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "name": {"type": "string"},
                        "description": {"type": "string"}
                    },
                    "required": ["name", "description"]
                }
            },
            "actives": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "name": {"type": "string"},
                        "description": {"type": "string"}
                    },
                    "required": ["name", "description"]
                }
            },
            "concerns": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "name": {"type": "string"},
                        "description": {"type": "string"}
                    },
                    "required": ["name", "description"]
                }
            },
            "notes": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "name": {"type": "string"},
                        "description": {"type": "string"}
                    },
                    "required": ["name", "description"]
                }
            },
            "confidence": {"type": "number"}
        },
        "required": ["benefits", "actives", "concerns", "notes", "confidence"],
        "additionalProperties": False
    }

    user_prompt = f"""
    You are a dermatologist-grade skincare product analyst.
    Analyze the OCR text below and extract structured product insights.

    Rules:
    - Ignore non-ingredient text, random codes, or numbers unrelated to skincare.
    - Use only meaningful skincare terms (ingredients, claims, or cautions).
    - Return concise one-line descriptions — no marketing fluff.
    - Assign a "confidence" score between 0 and 1, where:
        * 1.0 = highly confident (clear ingredient list & claims)
        * 0.7–0.9 = fairly confident (some OCR noise but recognizable)
        * <0.6 = uncertain (many garbled or missing terms)

    Output format:
    {
    "actives": [{"name": "Niacinamide", "description": "Improves skin tone and barrier resilience"}],
    "benefits": [{"name": "Hydration Boost", "description": "Locks in moisture and soothes dryness"}],
    "concerns": [{"name": "Fragrance", "description": "May irritate sensitive skin"}],
    "notes": [{"name": "Alcohol-free", "description": "Gentle for daily use"}],
    "confidence": 0.92
    }

    OCR_TEXT:
    \"\"\"{ocr_text}\"\"\"
    """

    gen_cfg = {
    "temperature": 0.2,        # less creativity → more precision
    "max_output_tokens": 768, # longer if OCR text is long
    "top_p": 0.8,
    "response_mime_type": "application/json",
    }

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

    sys_msg = (
        "You are a dermatologist-grade skincare product analyst. "
        "Extract concise, factual insights from OCR text (Thai/English). "
        "Return JSON ONLY that matches the schema exactly. Include all required keys - especially 'confidence' as a number between 0 and 1."
    )
    user_prompt = f"""
    Analyze the OCR text below and extract structured product insights.

    Rules:
    - Use concise one-line descriptions.
    - Ignore marketing fluff or nonsense OCR fragments.
    - If label says “free from X”, do NOT list X under concerns.
    - confidence: 0..1 (1=very sure, 0.7-0.9=pretty sure, <0.6=uncertain).

    Schema:
    {json.dumps(schema_hint, ensure_ascii=False, indent=2)}

    OCR_TEXT:
    \"\"\"{ocr_text}\"\"\"
    """

    gen_cfg = {
        "temperature": 0.4,
        "max_output_tokens": 2048,
        "top_p": 0.8,
        "response_mime_type": "application/json",
    }

    models = [
        os.getenv("GOOGLE_GEMINI_MODEL") or "gemini-1.5-pro",
        "gemini-2.5-flash",
    ]

    results = []
    for name in models:
        try:
            r = _call_one_model(name, user_prompt, sys_msg, gen_cfg)
            if r: results.append(r)
        except Exception as e:
            print(f"[LLM analyze] model {name} failed: {e}")

    if not results:
        return None
    if len(results) == 1:
        return results[0]

    # Merge two+ results
    acts = _merge_lists(*(r.get("actives", []) for r in results))
    bens = _merge_lists(*(r.get("benefits", []) for r in results))
    cons = _merge_lists(*(r.get("concerns", []) for r in results))
    notes = _merge_lists(*(r.get("notes", []) for r in results))

    # Agreement bonus from actives overlap (strongest signal)
    if len(results) >= 2:
        j = _jaccard(results[0].get("actives", []), results[1].get("actives", []))
    else:
        j = 0.0

    base_conf = sum(float(r.get("confidence", 0.6)) for r in results) / len(results)
    final_conf = max(0.0, min(1.0, base_conf * (0.9 + 0.2 * j)))  # + up to +20% w/ agreement

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

def norm_list(xs) -> list[str]:
    return [str(s).strip() for s in (xs or []) if str(s).strip()]

# ---------------- Output schema ----------------
class LabelLLMOut(Schema):
    raw_text: str
    benefits: List[str]
    actives: List[str]
    concerns: List[str]
    notes: List[str]
    confidence: float

# ---------------- Endpoint ----------------
@scan_text_router.post("/label/analyze-llm", response=LabelLLMOut)
def analyze_label_llm(request, file: UploadedFile = File(...)):
    text = _ocr_text_from_file(file)
    llm = _call_gemini_ensemble(text) or _fallback_extract(text)

    def norm_list(xs): return [str(s).strip() for s in xs if str(s).strip()]
    return LabelLLMOut(
        raw_text=text,
        benefits=norm_list(llm.get("benefits", []))[:8],
        actives=sorted(set(norm_list(llm.get("actives", [])))),
        concerns=sorted(set(norm_list(llm.get("concerns", [])))),
        notes=norm_list(llm.get("notes", []))[:6],
        confidence=float(
            llm.get("confidence") if llm.get("confidence") is not None
            else llm.get("ai_confidence", 0.5)
        ),
    )