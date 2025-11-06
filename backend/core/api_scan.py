from ninja import Router, File, Schema
from ninja.files import UploadedFile
from PIL import Image
from ninja.errors import HttpError
from pyzbar.pyzbar import decode
from io import BytesIO
from quiz.models import Product

scan_router = Router(tags=["Scan"])

class ScanOut(Schema):
    ok: bool
    barcode: str
    product: dict | None = None
    message: str | None = None

@scan_router.post("/scan", response=ScanOut)
def scan_barcode(request, file: UploadedFile = File(...)):
    # Decode
    try:
        image = Image.open(BytesIO(file.read()))
        decoded_objects = decode(image)
        if not decoded_objects:
            return {"ok": False, "barcode": None, "message": "No barcode detected."}

        barcode_value = decoded_objects[0].data.decode("utf-8")
        return {"ok": True, "barcode": barcode_value, "message": "Barcode detected."}
    except Exception as e:
        return {"ok": False, "message": f"Error decoding: {e}"}
    
@scan_router.post("/resolve", response=ScanOut)
def scan_and_resolve(request, file: UploadedFile = File(...)):
    # Decode and resolve in database
    try:
        image = Image.open(BytesIO(file.read()))
        decoded_objects = decode(image)
        if not decoded_objects:
            return {"ok": False, "barcode": None, "message": "No barcode found."}

        barcode_value = decoded_objects[0].data.decode("utf-8")

        # Lookup product in the database
        product = Product.objects.filter(barcode=barcode_value, is_active=True).first()
        if not product:
            return {
                "ok": True,
                "barcode": barcode_value,
                "product": None,
                "message": "Barcode recognized, but product not found in database.",
            }

        # Serialize minimal product info
        product_data = {
            "id": str(product.id),
            "name": product.name,
            "brand": product.brand,
            "category": product.category,
            "price": float(product.price),
            "currency": product.currency,
            "image_url": product.image_url,
            "product_url": product.product_url,
        }

        return {
            "ok": True,
            "barcode": barcode_value,
            "product": product_data,
            "message": "Product found.",
        }

    except Exception as e:
        return {"ok": False, "message": f"Error decoding or resolving: {e}"}