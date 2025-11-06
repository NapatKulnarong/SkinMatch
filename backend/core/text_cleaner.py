# core/text_cleaner.py
import re

def clean_ocr_text(raw: str) -> str:
    s = raw.replace("\u200b", "")                       # zero-width
    s = s.replace("\ufeff", "")                         # BOM
    s = re.sub(r"[^\S\r\n]{2,}", " ", s)               # collapse multi-spaces
    s = re.sub(r"[ \t]+\n", "\n", s)                   # trim end-of-line spaces
    s = re.sub(r"\n{3,}", "\n\n", s)                   # collapse blank lines
    # common OCR confusions
    s = s.replace("NME", "NMF")
    s = s.replace("Oat: Extract", "Oat Extract").replace("Minaral", "Mineral")
    s = s.replace("Ceramida", "Ceramide").replace("Goramide", "Ceramide")
    s = re.sub(r"\bC10- ?30\b", "C 10-30", s)
    # basic Thai fixes (expand as you see new patterns)
    s = s.replace("พิว", "ผิว").replace("ชุ่มษื้น", "ชุ่มชื้น").replace("เขิว", "ผิว")
    return s.strip()