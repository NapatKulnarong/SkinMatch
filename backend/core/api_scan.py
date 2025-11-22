from io import BytesIO
from typing import Optional

from ninja import File, Router, Schema
from ninja.errors import HttpError
from ninja.files import UploadedFile

try:  # pragma: no cover - optional dependency
    from PIL import Image
except ImportError:
    Image = None  # type: ignore

from quiz.models import Product

scan_router = Router(tags=["Scan"])

# Lazy import pyzbar to avoid ImportError when zbar library is not installed
def get_decode():
    try:
        from pyzbar.pyzbar import decode
        return decode
    except ImportError:
        raise ImportError(
            "pyzbar requires the zbar system library. "
            "On macOS, install it with: brew install zbar"
        )


def _ensure_pillow():
    if Image is None:
        raise HttpError(503, "Pillow is not installed on the server.")


def _decode_barcode(file: UploadedFile) -> Optional[str]:
    _ensure_pillow()
    decode = get_decode()
    image = Image.open(BytesIO(file.read()))
    decoded_objects = decode(image)
    if not decoded_objects:
        return None
    return decoded_objects[0].data.decode("utf-8")


def _serialize_product(product: Product) -> dict:
    return {
        "id": str(product.id),
        "name": product.name,
        "brand": product.brand,
        "category": product.category,
        "price": float(product.price),
        "currency": product.currency,
        "image_url": product.image_url,
        "product_url": product.product_url,
    }


class ScanOut(Schema):
    ok: bool
    barcode: str | None = None
    product: dict | None = None
    message: str | None = None


@scan_router.post("/scan", response=ScanOut)
def scan_barcode(request, file: UploadedFile = File(...)):
    try:
        barcode_value = _decode_barcode(file)
        if not barcode_value:
            return {"ok": False, "barcode": None, "message": "No barcode detected."}
        return {"ok": True, "barcode": barcode_value, "message": "Barcode detected."}
    except Exception as e:
        return {"ok": False, "message": f"Error decoding: {e}"}


@scan_router.post("/resolve", response=ScanOut)
def scan_and_resolve(request, file: UploadedFile = File(...)):
    try:
        barcode_value = _decode_barcode(file)
        if not barcode_value:
            return {"ok": False, "barcode": None, "message": "No barcode found."}

        product = Product.objects.filter(barcode=barcode_value, is_active=True).first()
        if not product:
            return {
                "ok": True,
                "barcode": barcode_value,
                "product": None,
                "message": "Barcode recognized, but product not found in database.",
            }

        return {
            "ok": True,
            "barcode": barcode_value,
            "product": _serialize_product(product),
            "message": "Product found.",
        }

    except Exception as e:
        return {"ok": False, "message": f"Error decoding or resolving: {e}"}
