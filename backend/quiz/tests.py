from django.test import SimpleTestCase

from .ai import generate_strategy_notes


class StrategyNoteFallbackTests(SimpleTestCase):
    def test_generate_strategy_notes_returns_fallback_when_model_missing(self):
        traits = {
            "primary_concerns": ["Excess oil", "Acne & breakouts"],
            "secondary_concerns": ["Damaged skin barrier"],
            "eye_area_concerns": ["Dark circles"],
            "skin_type": "Combination",
            "sensitivity": "Sometimes",
            "restrictions": ["Fragrance"],
            "budget": "Mid-range",
        }
        summary = {
            "top_ingredients": ["Niacinamide", "Salicylic acid", "Centella asiatica"],
            "category_breakdown": {"Serum": 0.8, "Moisturiser": 0.6},
            "generated_at": "2025-10-28T00:00:00Z",
        }
        recommendations = [
            {
                "product_name": "Clarifying Serum",
                "brand": "Glow Lab",
                "category": "Serum",
                "ingredients": ["Niacinamide", "Zinc", "Beta-glucan"],
            },
            {
                "product_name": "Barrier Balm",
                "brand": "Calm Skin",
                "category": "Moisturiser",
                "ingredients": ["Ceramides", "Centella asiatica"],
            },
        ]

        notes = generate_strategy_notes(
            traits=traits,
            summary=summary,
            recommendations=recommendations,
        )

        self.assertTrue(notes, "Expected fallback strategy notes when Gemini is unavailable.")
        for note in notes:
            self.assertIsInstance(note, str)
            self.assertTrue(note.strip())
