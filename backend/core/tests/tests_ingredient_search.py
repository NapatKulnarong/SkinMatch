from decimal import Decimal

from django.test import TestCase
from rest_framework.test import APIClient

from quiz.models import Ingredient, Product, ProductIngredient


class QuizIngredientSearchAPITests(TestCase):
    """Cover the quiz ingredient search endpoint exposed at /api/quiz/ingredients/search."""

    def setUp(self):
        self.client = APIClient()
        self.niacinamide = self._create_ingredient("niacinamide", "Niacinamide", "Nicotinamide")
        self._attach_products(self.niacinamide, count=2)

        self.vit_c = self._create_ingredient("vitamin-c", "Vitamin C", "L-Ascorbic Acid")
        self._attach_products(self.vit_c, count=3)

        self._create_ingredient("no-products", "Unlinked Ingredient")

    def _create_ingredient(self, key: str, common: str, inci: str = "") -> Ingredient:
        return Ingredient.objects.create(key=key, common_name=common, inci_name=inci)

    def _attach_products(self, ingredient: Ingredient, *, count: int = 1) -> None:
        for index in range(count):
            product = Product.objects.create(
                slug=f"{ingredient.key}-product-{index}",
                name=f"{ingredient.common_name} Product {index}",
                brand=f"Brand {index}",
                origin_country=Product.Origin.SOUTH_KOREA,
                category=Product.Category.SERUM,
                price=Decimal("15.50"),
                currency=Product.Currency.THB,
            )
            ProductIngredient.objects.create(
                product=product,
                ingredient=ingredient,
                order=index,
                highlight=index == 0,
            )

    def test_search_returns_exact_match_first(self):
        response = self.client.get("/api/quiz/ingredients/search", {"q": "Niacinamide", "limit": 5})
        self.assertEqual(response.status_code, 200)
        payload = response.json()

        self.assertEqual(payload["query"], "Niacinamide")
        self.assertTrue(payload["results"])
        first_entry = payload["results"][0]
        ingredient_payload = first_entry["ingredient"]

        self.assertEqual(ingredient_payload["common_name"], "Niacinamide")
        self.assertEqual(ingredient_payload["key"], "niacinamide")
        self.assertGreaterEqual(len(first_entry["products"]), 1)

    def test_search_blank_query_returns_400(self):
        response = self.client.get("/api/quiz/ingredients/search", {"q": "   "})
        self.assertEqual(response.status_code, 400)

    def test_search_ranks_exact_above_prefix_matches(self):
        response = self.client.get("/api/quiz/ingredients/search", {"q": "vitamin c"})
        self.assertEqual(response.status_code, 200)
        payload = response.json()

        keys = [entry["ingredient"]["key"] for entry in payload["results"]]
        self.assertTrue(keys, "Expected at least one search result.")
        self.assertEqual(
            keys[0],
            "vitamin-c",
            f"Exact slug should rank first, got order {keys[:3]}",
        )

    def test_search_excludes_ingredients_without_active_products(self):
        response = self.client.get("/api/quiz/ingredients/search", {"q": "ingredient"})
        self.assertEqual(response.status_code, 200)
        payload = response.json()

        keys = [entry["ingredient"]["key"] for entry in payload["results"]]
        self.assertNotIn("no-products", keys)
