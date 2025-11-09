import math
import cv2
import numpy as np
from PIL import Image

def _deskew(gray: np.ndarray) -> np.ndarray:
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

def preprocess_for_ocr(pil_img: Image.Image) -> Image.Image:
    # upscale a bit
    img = cv2.cvtColor(np.array(pil_img), cv2.COLOR_RGB2BGR)
    img = cv2.resize(img, None, fx=1.8, fy=1.8, interpolation=cv2.INTER_CUBIC)

    # denoise + illumination smooth
    img = cv2.bilateralFilter(img, d=7, sigmaColor=75, sigmaSpace=75)
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    # mild closing to connect broken strokes
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (2, 2))
    gray = cv2.morphologyEx(gray, cv2.MORPH_CLOSE, kernel, iterations=1)

    # deskew if needed
    gray = _deskew(gray)

    # CLAHE for contrast
    clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8))
    gray = clahe.apply(gray)

    # Adaptive threshold (works well on curved labels)
    th = cv2.adaptiveThreshold(
        gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 35, 11
    )

    # Light open to clear pepper noise
    th = cv2.morphologyEx(th, cv2.MORPH_OPEN, kernel, iterations=1)

    # Unsharp mask
    blur = cv2.GaussianBlur(th, (0, 0), 1.0)
    sharp = cv2.addWeighted(th, 1.5, blur, -0.5, 0)

    return Image.fromarray(sharp)