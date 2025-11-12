from decimal import Decimal

from django.test import TestCase
from rest_framework.test import APIClient

from quiz.models import Ingredient, Product, ProductIngredient


class QuizIngredientSuggestionAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.niacinamide = self._create_ingredient("niacinamide", "Niacinamide")
        self._attach_products(self.niacinamide, 3)

        self.nic = self._create_ingredient("nicotinamide", "Nicotinamide")
        self._attach_products(self.nic, 1)

        self.vitamin_c = self._create_ingredient("vitamin-c", "Vitamin C")
        self._attach_products(self.vitamin_c, 2)

    def _create_ingredient(self, key: str, common_name: str) -> Ingredient:
        return Ingredient.objects.create(key=key, common_name=common_name)

    def _attach_products(self, ingredient: Ingredient, count: int) -> None:
        for index in range(count):
            product = Product.objects.create(
                slug=f"{ingredient.key}-product-{index}",
                name=f"{ingredient.common_name} Product {index}",
                brand="Test Brand",
                origin_country=Product.Origin.SOUTH_KOREA,
                category=Product.Category.SERUM,
                price=Decimal("22.00"),
                currency=Product.Currency.THB,
            )
            ProductIngredient.objects.create(
                product=product,
                ingredient=ingredient,
                order=index,
                highlight=index == 0,
            )

    def test_suggestions_rank_by_relevance(self):
        response = self.client.get("/api/quiz/ingredients/suggest", {"q": "niacin"})
        self.assertEqual(response.status_code, 200)
        payload = response.json()

        self.assertEqual(payload["query"], "niacin")
        keys = [item["key"] for item in payload["suggestions"]]
        self.assertTrue(keys, "Expected at least one suggestion.")
        self.assertEqual(keys[0], "niacinamide")

        suggestion_lookup = {item["key"]: item for item in payload["suggestions"]}
        self.assertEqual(suggestion_lookup["niacinamide"]["product_count"], 3)

    def test_suggestions_respect_limit_and_trim_query(self):
        response = self.client.get(
            "/api/quiz/ingredients/suggest",
            {"q": "  vitamin c  ", "limit": 1},
        )
        self.assertEqual(response.status_code, 200)
        payload = response.json()

        self.assertEqual(payload["query"], "vitamin c")
        self.assertEqual(len(payload["suggestions"]), 1)
        self.assertEqual(payload["suggestions"][0]["key"], "vitamin-c")

    def test_suggestions_blank_query_returns_empty(self):
        response = self.client.get("/api/quiz/ingredients/suggest", {"q": ""})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"query": "", "suggestions": []})
