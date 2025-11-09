import re

_TH_EN_OK = r"ก-๙a-zA-Z0-9"
_PUNCT = r"\.,;:!?\(\)\[\]/%\-+&'\""

def clean_ocr_text(raw: str) -> str:
    s = raw or ""

    # normalize spaces & newlines
    s = s.replace("\u200b", "")  # zero-width
    s = re.sub(r"[ \t]{2,}", " ", s)
    s = re.sub(r"\n{3,}", "\n\n", s)

    # strip obvious OCR garbage chars
    s = re.sub(fr"[^{_TH_EN_OK}\s{_PUNCT}]", " ", s)

    # collapse isolated single latin letters (common OCR noise)
    s = re.sub(r"\b([A-Za-z])\b(?!['-])", " ", s)

    # tighten extra spaces again
    s = re.sub(r"[ \t]{2,}", " ", s)
    s = re.sub(r"\n +", "\n", s)

    # common Thai fixes you’ve seen
    s = s.replace("พิว", "ผิว").replace("ชุ่มษื้น", "ชุ่มชื้น").replace("เขิว", "ผิว")

    return s.strip()