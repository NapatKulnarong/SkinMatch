from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from quiz.models import Product, ProductReview


class SkincareHubApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.primary_user = get_user_model().objects.create_user(
            username="primary",
            email="primary@example.com",
            password="safe-password",
        )
        self.secondary_user = get_user_model().objects.create_user(
            username="secondary",
            email="secondary@example.com",
            password="safe-password",
        )
        self.product_a = Product.objects.create(
            slug="radiant-serum",
            name="Radiant Repair Serum",
            brand="SkinMatch Labs",
            origin_country=Product.Origin.SOUTH_KOREA,
            category=Product.Category.SERUM,
            hero_ingredients="Green tea, Niacinamide, Peptides",
            summary="Lightweight repair serum",
            price=Decimal("42.00"),
            currency=Product.Currency.USD,
        )
        self.product_b = Product.objects.create(
            slug="glow-guard",
            name="Glow Guard Sunscreen",
            brand="Solar Shield",
            origin_country=Product.Origin.JAPAN,
            category=Product.Category.SUNSCREEN,
            hero_ingredients="Zinc Oxide, Ceramides",
            summary="Daily SPF",
            price=Decimal("35.00"),
            currency=Product.Currency.USD,
        )
        self.product_c = Product.objects.create(
            slug="ultra-moist",
            name="Ultra Moist Cream",
            brand="HydraLab",
            origin_country=Product.Origin.UNITED_STATES,
            category=Product.Category.MOISTURIZER,
            hero_ingredients="Squalane, Hyaluronic acid",
            summary="Deep moisture cream",
            price=Decimal("50.00"),
            currency=Product.Currency.USD,
            rating=Decimal("4.9"),
            review_count=150,
        )

        ProductReview.objects.create(
            product=self.product_a,
            user=self.primary_user,
            rating=4,
            comment="Soothing finish",
        )
        ProductReview.objects.create(
            product=self.product_a,
            user=self.secondary_user,
            rating=5,
            comment="My skin glows",
        )
        ProductReview.objects.create(
            product=self.product_b,
            user=self.primary_user,
            rating=5,
            comment="Perfect sunscreen",
        )

    def test_product_suggestions_surface_best_match(self):
        response = self.client.get("/api/quiz/products/suggest", {"q": "Radiant"})
        self.assertEqual(response.status_code, 200)

        payload = response.json()
        self.assertEqual(payload["query"], "Radiant")
        self.assertGreaterEqual(len(payload["suggestions"]), 1)
        first = payload["suggestions"][0]
        self.assertEqual(first["slug"], self.product_a.slug)
        self.assertEqual(first["brand"], self.product_a.brand)
        self.assertEqual(first["hero_ingredients"], ["Green tea", "Niacinamide", "Peptides"])
        self.assertEqual(first["average_rating"], 4.5)
        self.assertEqual(first["review_count"], 2)

    def test_product_search_orders_by_match_score(self):
        response = self.client.get("/api/quiz/products/search", {"q": "Glow"})
        self.assertEqual(response.status_code, 200)

        payload = response.json()
        slugs = [item["slug"] for item in payload["results"]]
        self.assertIn(self.product_b.slug, slugs)
        self.assertEqual(slugs[0], self.product_b.slug)

    def test_top_products_prioritize_user_reviews(self):
        response = self.client.get("/api/quiz/products/top", {"limit": 3})
        self.assertEqual(response.status_code, 200)

        payload = response.json()
        self.assertEqual(len(payload), 3)
        first_two_ids = {payload[0]["product_id"], payload[1]["product_id"]}
        expected_reviewed = {str(self.product_a.id), str(self.product_b.id)}
        self.assertEqual(first_two_ids, expected_reviewed)
        # Ensure fallback product without user reviews can still appear when limit allows
        self.assertEqual(payload[2]["product_id"], str(self.product_c.id))

    def test_product_detail_by_slug_matches_uuid_endpoint(self):
        by_slug = self.client.get(f"/api/quiz/products/slug/{self.product_b.slug}")
        self.assertEqual(by_slug.status_code, 200)

        by_id = self.client.get(f"/api/quiz/products/{self.product_b.id}")
        self.assertEqual(by_id.status_code, 200)

        self.assertEqual(by_slug.json(), by_id.json())
