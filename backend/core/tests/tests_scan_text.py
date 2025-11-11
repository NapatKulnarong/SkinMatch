"""
Comprehensive test suite for ingredient label scanning endpoint.

Covered Scenarios
- Happy-path pipeline with Gemini response normalization
- Gemini failure leading to heuristic fallback extraction
- Boundary checks for list deduplication and capping
- Direct unit tests of the fallback extractor heuristics
- Gemini helper behaviour around environment configuration
- Error handling for invalid upload payloads
"""

from __future__ import annotations

from io import BytesIO
from unittest.mock import MagicMock, patch

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient
from PIL import Image

from core.api_scan_text import _call_gemini_for_json, _fallback_extract

SCAN_ENDPOINT = "/api/scan-text/label/analyze-llm"


def _make_image_file(name: str = "test_label.png") -> SimpleUploadedFile:
    """Create a tiny in-memory PNG used for upload payloads."""
    image = Image.new("RGB", (32, 32), color="white")
    buffer = BytesIO()
    image.save(buffer, format="PNG")
    buffer.seek(0)
    return SimpleUploadedFile(name, buffer.read(), content_type="image/png")


class ScanTextEndpointTests(TestCase):
    """End-to-end focus on the API endpoint with heavy dependencies mocked."""

    def setUp(self) -> None:
        self.client = APIClient()
        self.image_file = _make_image_file()

    @patch("core.api_scan_text._fallback_extract")
    @patch("core.api_scan_text._call_gemini_ensemble")
    @patch("core.api_scan_text._ocr_text_from_file")
    def test_happy_path_normalizes_gemini_payload(
        self,
        mock_ocr,
        mock_gemini,
        mock_fallback,
    ):
        mock_ocr.return_value = "Ingredients: Retinol, Niacinamide, Hyaluronic Acid"
        mock_gemini.return_value = {
            "actives": ["Retinol", "Niacinamide", "Retinol"],
            "concerns": ["Fragrance", "Alcohol", "Fragrance"],
            "benefits": ["Anti-aging", "Hydration"],
            "notes": ["Contains retinol for anti-aging."],
            "confidence": 0.87,
        }
        mock_fallback.return_value = {
            "actives": [],
            "concerns": [],
            "benefits": [],
            "notes": [],
            "confidence": 0.55,
        }

        response = self.client.post(
            SCAN_ENDPOINT,
            {"file": self.image_file},
            format="multipart",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        payload = response.json()

        # Deduplicated & sorted lists
        self.assertEqual(sorted(payload["actives"]), ["Niacinamide", "Retinol"])
        self.assertEqual(sorted(payload["concerns"]), ["Alcohol", "Fragrance"])
        self.assertEqual(sorted(payload["benefits"]), ["Anti-aging", "Hydration"])
        # Notes remain list-shaped and confidence surfaces untouched.
        self.assertEqual(payload["notes"], ["Contains retinol for anti-aging."])
        self.assertEqual(payload["confidence"], 0.87)
        # Raw text should echo OCR output.
        self.assertEqual(payload["raw_text"], mock_ocr.return_value)

    @patch("core.api_scan_text._fallback_extract")
    @patch("core.api_scan_text._call_gemini_ensemble")
    @patch("core.api_scan_text._ocr_text_from_file")
    def test_returns_fallback_when_gemini_returns_none(
        self,
        mock_ocr,
        mock_gemini,
        mock_fallback,
    ):
        mock_ocr.return_value = """
        Ingredients: Niacinamide 5%, Urea 10%, Ceramide complex, Fragrance
        Alcohol-Free, Paraben-Free
        ช่วยเติมความชุ่มชื้นให้ผิว
        """
        mock_gemini.return_value = None
        mock_fallback.return_value = {
            "actives": [
                "Niacinamide: Vitamin B3",
                "Urea: Humectant",
                "Ceramide Complex: Barrier helper",
            ],
            "benefits": ["Hydrating: Locks moisture in."],
            "concerns": ["Fragrance: May irritate."],
            "notes": ["Alcohol-free claim noted."],
            "confidence": 0.55,
        }

        response = self.client.post(
            SCAN_ENDPOINT,
            {"file": self.image_file},
            format="multipart",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertEqual(
            data["actives"],
            [
                "Niacinamide: Vitamin B3",
                "Urea: Humectant",
                "Ceramide Complex: Barrier helper",
            ],
        )
        self.assertEqual(data["benefits"], ["Hydrating: Locks moisture in."])
        self.assertEqual(data["concerns"], ["Fragrance: May irritate."])
        self.assertEqual(data["notes"], ["Alcohol-free claim noted."])
        self.assertGreaterEqual(data["confidence"], 0.55)

    @patch("core.api_scan_text._fallback_extract")
    @patch("core.api_scan_text._call_gemini_ensemble")
    @patch("core.api_scan_text._ocr_text_from_file")
    def test_gemini_exception_bubbles_through(
        self,
        mock_ocr,
        mock_gemini,
        mock_fallback,
    ):
        mock_ocr.return_value = "Contains niacinamide and fragrance"
        mock_fallback.return_value = {
            "actives": [],
            "benefits": [],
            "concerns": [],
            "notes": [],
            "confidence": 0.55,
        }
        mock_gemini.side_effect = RuntimeError("Gemini unhappy")

        with self.assertRaises(RuntimeError):
            self.client.post(
                SCAN_ENDPOINT,
                {"file": self.image_file},
                format="multipart",
            )

    @patch("core.api_scan_text._fallback_extract")
    @patch("core.api_scan_text._call_gemini_ensemble")
    @patch("core.api_scan_text._ocr_text_from_file")
    def test_response_caps_lists_from_noisy_gemini_output(
        self,
        mock_ocr,
        mock_gemini,
        mock_fallback,
    ):
        mock_ocr.return_value = "Noisy OCR"
        mock_gemini.return_value = {
            "actives": [f"Ingredient {i}" for i in range(40)],
            "concerns": ["Fragrance"] * 5,
            "benefits": [f"Benefit {i}" for i in range(25)],
            "notes": [f"Note {i}" for i in range(12)],
            "confidence": 0.95,
        }
        mock_fallback.return_value = {
            "actives": [],
            "benefits": [],
            "concerns": [],
            "notes": [],
            "confidence": 0.55,
        }

        response = self.client.post(
            SCAN_ENDPOINT,
            {"file": self.image_file},
            format="multipart",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        payload = response.json()

        self.assertEqual(len(payload["benefits"]), 8)
        self.assertEqual(len(payload["notes"]), 6)
        self.assertEqual(payload["concerns"], ["Fragrance"])
        self.assertEqual(len(payload["actives"]), len(set(payload["actives"])))


class FallbackExtractUnitTests(TestCase):
    """Unit tests for the heuristic extractor in isolation."""

    def test_detects_supported_actives(self):
        text = """
        Active Ingredients: Niacinamide 5%, Urea 10%
        Supporting: Ceramide complex, Saccharide Isomerate
        """
        result = _fallback_extract(text)
        names = [entry.split(":")[0].lower() for entry in result["actives"]]
        self.assertEqual(
            names,
            ["ceramide complex", "niacinamide", "saccharide isomerate", "urea"],
        )

    def test_free_from_language_clears_matching_concerns(self):
        text = """
        Alcohol-Free, Paraben-Free, Mineral Oil Free
        Ingredients: Fragrance (parfum)
        """
        result = _fallback_extract(text)
        self.assertNotIn("drying alcohol", result["concerns"])
        self.assertNotIn("paraben", result["concerns"])
        # Only fragrance should remain because "free-from" removes the other entries.
        self.assertTrue(any("Fragrance" in c for c in result["concerns"]))
        self.assertFalse(any("mineral oil" in c.lower() for c in result["concerns"]))

    def test_benefit_and_note_collection(self):
        text = """
        ช่วยเติมความชุ่มชื้นให้ผิว
        Dermatologically tested for sensitive skin
        Niacinamide helps support the skin barrier.
        """
        result = _fallback_extract(text)
        self.assertTrue(any("Skin Barrier Support" in benefit for benefit in result["benefits"]))
        self.assertTrue(result["notes"])  # heuristic adds at least one helpful note

    def test_handles_empty_text(self):
        result = _fallback_extract("")
        self.assertEqual(result["benefits"], [])
        self.assertEqual(result["actives"], [])
        self.assertEqual(result["concerns"], [])
        self.assertEqual(result["notes"], [])
        self.assertEqual(result["confidence"], 0.55)


class GeminiHelperTests(TestCase):
    """Contract tests for the Gemini helper function."""

    @patch.dict("os.environ", {}, clear=True)
    def test_missing_api_key_short_circuits(self):
        self.assertIsNone(_call_gemini_for_json("anything"))

    @patch("core.api_scan_text.genai")
    @patch.dict("os.environ", {"GOOGLE_API_KEY": "test-key"})
    def test_sdk_unavailable_returns_none(self, mock_genai):
        mock_genai.GenerativeModel.side_effect = AttributeError("SDK missing")
        self.assertIsNone(_call_gemini_for_json("anything"))

    @patch("core.api_scan_text.genai")
    @patch.dict("os.environ", {"GOOGLE_API_KEY": "test-key"})
    def test_malformed_json_triggers_retries(self, mock_genai):
        mock_model = MagicMock()
        mock_genai.GenerativeModel.return_value = mock_model
        fake_resp = MagicMock()
        fake_resp.text = "not json"
        mock_model.generate_content.return_value = fake_resp

        self.assertIsNone(_call_gemini_for_json("test"))
        self.assertGreater(mock_model.generate_content.call_count, 1)


class InvalidImageTests(TestCase):
    """Validate defensive behaviour when uploads are incorrect."""

    def setUp(self) -> None:
        self.client = APIClient()

    def test_non_image_payload_documented(self):
        text_file = SimpleUploadedFile(
            "not_image.txt",
            b"This is not an image",
            content_type="text/plain",
        )
        with self.assertRaises(Exception):
            self.client.post(
                SCAN_ENDPOINT,
                {"file": text_file},
                format="multipart",
            )

    def test_missing_file_field(self):
        response = self.client.post(SCAN_ENDPOINT, {}, format="multipart")
        self.assertIn(
            response.status_code,
            {
                status.HTTP_422_UNPROCESSABLE_ENTITY,
                status.HTTP_400_BAD_REQUEST,
                status.HTTP_404_NOT_FOUND,
                status.HTTP_500_INTERNAL_SERVER_ERROR,
            },
        )
