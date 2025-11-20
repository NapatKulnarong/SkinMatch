from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from quiz.models import Product, ProductReview


class ProductReviewSanitizationTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = get_user_model().objects.create_user(
            username="reviewer",
            email="review@example.com",
            password="safe-password",
        )
        self.client.force_login(self.user)
        self.product = Product.objects.create(
            slug="test-product",
            name="Test Product",
            brand="SkinMatch Labs",
            origin_country=Product.Origin.SOUTH_KOREA,
            category=Product.Category.SERUM,
            summary="",
            description="",
            hero_ingredients="",
            price=Decimal("29.00"),
            currency=Product.Currency.USD,
        )

    def test_review_comment_is_sanitized_and_trimmed(self):
        payload = {
            "rating": 5,
            "comment": "  <b>Love</b> this formula <script>alert('oops')</script> ",
            "is_public": True,
        }
        url = f"/api/quiz/products/{self.product.id}/reviews"

        response = self.client.post(url, data=payload, format="json")
        self.assertEqual(response.status_code, 200)

        body = response.json()
        self.assertEqual(body["comment"], "Love this formula alert('oops')")

        review = ProductReview.objects.get(product=self.product, user=self.user)
        self.assertEqual(review.comment, "Love this formula alert('oops')")
