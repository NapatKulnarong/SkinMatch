# backend/core/utils_ocr.py
"""
High-quality preprocessing utilities for OCR on product labels
(Thai + English, glare-heavy surfaces, curved bottles, etc.)
"""

import cv2
import numpy as np
from PIL import Image


def preprocess_for_ocr(pil_img: Image.Image) -> Image.Image:
    """
    Enhance the image for better OCR accuracy using a sequence of
    denoising, contrast, threshold, and sharpening steps.
    Returns a Pillow Image ready for pytesseract.image_to_string().
    """
    # Convert from Pillow (RGB) → OpenCV (BGR)
    img = cv2.cvtColor(np.array(pil_img), cv2.COLOR_RGB2BGR)

    # Upscale to help Tesseract read small Thai/English text
    img = cv2.resize(img, None, fx=1.8, fy=1.8, interpolation=cv2.INTER_CUBIC)

    # Smooth noise while preserving edges
    img = cv2.bilateralFilter(img, d=7, sigmaColor=75, sigmaSpace=75)

    # Convert to grayscale
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    # Local contrast enhancement (CLAHE)
    clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8))
    gray = clahe.apply(gray)

    # Adaptive threshold to manage uneven lighting/glare
    th = cv2.adaptiveThreshold(
        gray,
        255,
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY,
        35,
        11,
    )

    # Light morphological cleanup (remove speckles)
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (1, 1))
    th = cv2.morphologyEx(th, cv2.MORPH_OPEN, kernel, iterations=1)

    # Slight sharpening (Unsharp mask)
    blur = cv2.GaussianBlur(th, (0, 0), 1.0)
    sharp = cv2.addWeighted(th, 1.5, blur, -0.5, 0)

    # Convert back to Pillow for pytesseract
    return Image.fromarray(sharp)