import math
from typing import Any

try:  # pragma: no cover - optional dependency
    import cv2
except ImportError:
    cv2 = None  # type: ignore

try:  # pragma: no cover - optional dependency
    import numpy as np
except ImportError:
    np = None  # type: ignore

try:  # pragma: no cover - optional dependency
    from PIL import Image
except ImportError:
    Image = None  # type: ignore

NDArray = np.ndarray if np is not None else Any
PILImage = Image if Image is not None else Any


def _ensure_ocr_dependencies() -> None:
    if cv2 is None or np is None or Image is None:
        raise RuntimeError("OpenCV, NumPy, and Pillow are required for OCR preprocessing.")

def _deskew(gray: NDArray) -> NDArray:
    _ensure_ocr_dependencies()
    # Estimate skew via Hough lines; fall back to original if nothing found
    edges = cv2.Canny(gray, 50, 150, apertureSize=3)
    lines = cv2.HoughLines(edges, 1, np.pi/180, 120)
    if lines is None:
        return gray
    # pick median angle close to 0/π
    angles = []
    for rho_theta in lines[:100]:
        rho, theta = rho_theta[0]
        ang = (theta - np.pi/2)  # rotate so text baseline ~0
        if -math.radians(25) < ang < math.radians(25):
            angles.append(ang)
    if not angles:
        return gray
    angle = np.degrees(np.median(angles))
    (h, w) = gray.shape[:2]
    M = cv2.getRotationMatrix2D((w//2, h//2), angle, 1.0)
    return cv2.warpAffine(gray, M, (w, h), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)

def preprocess_for_ocr(pil_img: PILImage) -> PILImage:
    _ensure_ocr_dependencies()
    # Convert to OpenCV format
    img = cv2.cvtColor(np.array(pil_img), cv2.COLOR_RGB2BGR)
    
    # Smart scaling to balance OCR quality and memory usage
    # OCR works best at 1200-2000px width for ingredient labels
    height, width = img.shape[:2]
    max_dimension = max(width, height)
    
    # Only upscale if image is small (< 1000px) to improve OCR accuracy
    # Skip upscaling for medium/large images to save memory
    if max_dimension < 1000:
        # Upscale small images to improve OCR (but not too much to avoid memory issues)
        scale_factor = min(1.5, 1200 / max_dimension)  # Max 1.5x or up to 1200px
        if scale_factor > 1.1:  # Only upscale if significant
            img = cv2.resize(img, None, fx=scale_factor, fy=scale_factor, interpolation=cv2.INTER_CUBIC)
    elif max_dimension > 2000:
        # Downscale very large images to save memory (already handled in _load_pil, but double-check)
        scale_factor = 2000 / max_dimension
        img = cv2.resize(img, None, fx=scale_factor, fy=scale_factor, interpolation=cv2.INTER_AREA)

    # denoise + illumination smooth (use smaller kernel for memory efficiency)
    # Reduce bilateral filter parameters for large images to save memory
    if max_dimension > 1500:
        img = cv2.bilateralFilter(img, d=5, sigmaColor=50, sigmaSpace=50)
    else:
        img = cv2.bilateralFilter(img, d=7, sigmaColor=75, sigmaSpace=75)
    
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    
    # Clear img from memory early
    del img

    # mild closing to connect broken strokes
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (2, 2))
    gray = cv2.morphologyEx(gray, cv2.MORPH_CLOSE, kernel, iterations=1)

    # deskew if needed (skip for very large images to save memory)
    if max_dimension < 2000:
        gray = _deskew(gray)

    # CLAHE for contrast (reduce tile size for large images)
    if max_dimension > 1500:
        clahe = cv2.createCLAHE(clipLimit=2.5, tileGridSize=(4, 4))
    else:
        clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8))
    gray = clahe.apply(gray)

    # Adaptive threshold (works well on curved labels)
    # Use smaller block size for large images
    block_size = 35 if max_dimension < 1500 else 25
    th = cv2.adaptiveThreshold(
        gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, block_size, 11
    )
    
    # Clear gray from memory
    del gray

    # Light open to clear pepper noise
    th = cv2.morphologyEx(th, cv2.MORPH_OPEN, kernel, iterations=1)

    # Unsharp mask (skip for very large images to save memory)
    if max_dimension < 2000:
        blur = cv2.GaussianBlur(th, (0, 0), 1.0)
        sharp = cv2.addWeighted(th, 1.5, blur, -0.5, 0)
        del blur, th
        result = Image.fromarray(sharp)
        del sharp
    else:
        result = Image.fromarray(th)
        del th

    return result
