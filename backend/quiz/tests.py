from django.test import SimpleTestCase, TestCase

from .ai import generate_strategy_notes
from .models import Ingredient, Product, ProductIngredient


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


class IngredientSuggestionEndpointTests(TestCase):
    def _create_ingredient_with_products(
        self,
        *,
        key: str,
        common_name: str,
        inci_name: str = "",
        product_count: int = 1,
    ) -> Ingredient:
        ingredient = Ingredient.objects.create(
            key=key,
            common_name=common_name,
            inci_name=inci_name,
        )
        for index in range(product_count):
            product = Product.objects.create(
                slug=f"{key}-product-{index}",
                name=f"{common_name} Product {index}",
                brand=f"Brand {index}",
                origin_country=Product.Origin.SOUTH_KOREA,
                category=Product.Category.SERUM,
            )
            ProductIngredient.objects.create(
                product=product,
                ingredient=ingredient,
                order=index,
                highlight=index == 0,
            )
        return ingredient

    def test_exact_common_name_scores_above_inci_and_prefix_matches(self):
        exact = self._create_ingredient_with_products(
            key="niacinamide",
            common_name="Niacinamide",
            inci_name="Nicotinamide",
            product_count=1,
        )
        inci_match = self._create_ingredient_with_products(
            key="nicotinamide",
            common_name="Nicotinamide",
            inci_name="Niacinamide",
            product_count=3,
        )
        prefix_match = self._create_ingredient_with_products(
            key="niacinamide-complex",
            common_name="Niacinamide Complex",
            product_count=2,
        )

        response = self.client.get("/api/quiz/ingredients/suggest", {"q": "niacinamide"})
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["query"], "niacinamide")

        keys = [item["key"] for item in payload["suggestions"]]
        self.assertTrue(keys, "Expected at least one suggestion to be returned.")
        self.assertEqual(keys[:3], [exact.key, inci_match.key, prefix_match.key])

        lookup = {item["key"]: item for item in payload["suggestions"]}
        self.assertEqual(lookup[exact.key]["product_count"], 1)
        self.assertEqual(lookup[inci_match.key]["product_count"], 3)
        self.assertEqual(lookup[prefix_match.key]["product_count"], 2)

    def test_slug_match_outranks_simple_prefix_match(self):
        slug_match = self._create_ingredient_with_products(
            key="vitamin-c",
            common_name="L-Ascorbic Acid",
            inci_name="Vitamin C",
            product_count=1,
        )
        prefix_heavy = self._create_ingredient_with_products(
            key="vitamin-c-serum",
            common_name="Vitamin C Serum",
            product_count=4,
        )
        prefix_light = self._create_ingredient_with_products(
            key="vitamin-c-ester",
            common_name="Vitamin C Ester",
            product_count=2,
        )

        response = self.client.get("/api/quiz/ingredients/suggest", {"q": "vitamin c"})
        self.assertEqual(response.status_code, 200)
        payload = response.json()

        keys = [item["key"] for item in payload["suggestions"]]
        self.assertEqual(keys[:3], [slug_match.key, prefix_heavy.key, prefix_light.key])

    def test_trimmed_query_and_limit_cap_results(self):
        entries = [
            self._create_ingredient_with_products(
                key=f"vitamin-{index}",
                common_name=f"Vitamin {index}",
                product_count=index + 1,
            )
            for index in range(5)
        ]

        response = self.client.get(
            "/api/quiz/ingredients/suggest",
            {"q": "  vitamin  ", "limit": 2},
        )
        self.assertEqual(response.status_code, 200)

        payload = response.json()
        self.assertEqual(payload["query"], "vitamin")
        self.assertEqual(len(payload["suggestions"]), 2)

        first_suggestion = payload["suggestions"][0]
        self.assertEqual(first_suggestion["product_count"], entries[-1].products.count())
        self.assertTrue(
            all(item["product_count"] >= 1 for item in payload["suggestions"]),
            "Expected product counts to surface for each suggestion.",
        )

    def test_blank_query_returns_empty_payload(self):
        response = self.client.get("/api/quiz/ingredients/suggest", {"q": ""})
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["query"], "")
        self.assertEqual(payload["suggestions"], [])
