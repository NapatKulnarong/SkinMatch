import json
from decimal import Decimal

import pytest
from django.contrib.auth import get_user_model

from quiz.models import Ingredient, Product, ProductIngredient, ProductReview


pytestmark = pytest.mark.django_db


@pytest.fixture
def user(db):
    return get_user_model().objects.create_user(
        username="reviewer",
        email="reviewer@example.com",
        password="safe-password",
    )


@pytest.fixture
def another_user(db):
    return get_user_model().objects.create_user(
        username="second",
        email="second@example.com",
        password="safe-password",
    )


@pytest.fixture
def make_product(db):
    def _make(slug: str, brand: str, name: str, hero: str = ""):
        return Product.objects.create(
            slug=slug,
            name=name,
            brand=brand,
            origin_country=Product.Origin.SOUTH_KOREA,
            category=Product.Category.SERUM,
            hero_ingredients=hero,
            summary="",
            price=Decimal("30.00"),
            currency=Product.Currency.USD,
        )

    return _make


def test_top_five_products_prioritize_reviewed(client, user, another_user, make_product):
    top = make_product("prime", "Alpha", "Prime Serum")
    strong = make_product("strong", "Beta", "Strong Shield")
    solid = make_product("solid", "Gamma", "Solid Skin")
    mid = make_product("mid", "Delta", "Mid Dew")
    low = make_product("low", "Epsilon", "Low Light")
    extra = make_product("extra", "Zeta", "Extra One")

    ProductReview.objects.create(product=top, user=user, rating=5, comment="Great")
    ProductReview.objects.create(product=top, user=another_user, rating=4, comment="Nice")
    ProductReview.objects.create(product=strong, user=user, rating=5, comment="Perfect")
    ProductReview.objects.create(product=solid, user=user, rating=4, comment="Good")
    ProductReview.objects.create(product=mid, user=user, rating=3, comment="Okay")
    ProductReview.objects.create(product=low, user=user, rating=2, comment="Meh")

    response = client.get("/api/quiz/products/top")
    assert response.status_code == 200

    payload = response.json()
    returned_ids = [item["product_id"] for item in payload]

    assert len(returned_ids) == 5
    assert returned_ids[:4] == [
        str(strong.id),
        str(top.id),
        str(solid.id),
        str(mid.id),
    ]
    assert str(extra.id) not in returned_ids


def test_product_detail_surfaces_hero_ingredients(client, make_product):
    ingredient = Ingredient.objects.create(
        common_name="Licorice Root",
        inci_name="Glycyrrhiza Glabra",
        benefits="Calms redness",
    )
    product = make_product(
        slug="bright-glow",
        brand="GlowCo",
        name="Bright Glow Serum",
        hero="Licorice Root, Niacinamide",
    )
    ProductIngredient.objects.create(product=product, ingredient=ingredient, order=1, highlight=True)

    response = client.get(f"/api/quiz/products/{product.id}")
    assert response.status_code == 200

    data = response.json()
    assert data["hero_ingredients"] == ["Licorice Root", "Niacinamide"]
    ingredient_names = [entry["name"] for entry in data["ingredients"]]
    assert "Licorice Root" in ingredient_names


def test_ingredient_benefit_prefers_catalog_entry(client):
    Ingredient.objects.create(
        common_name="Centella Asiatica",
        inci_name="Centella Asiatica Extract",
        benefits="Soothes irritation and supports barrier recovery.",
    )

    response = client.get("/api/quiz/ingredients/benefit", {"name": "Centella Asiatica"})
    assert response.status_code == 200

    data = response.json()
    assert data["benefit"].startswith("Soothes irritation")
    assert data["source"] == "catalog"


def test_ingredient_benefit_falls_back_to_gemini(monkeypatch, client):
    call_log = {}

    def fake_gemini_lookup(name: str):
        call_log["name"] = name
        return "Hydrates and balances skin tone."

    monkeypatch.setattr("quiz.views.generate_ingredient_benefit", fake_gemini_lookup)

    response = client.get("/api/quiz/ingredients/benefit", {"name": "NewLeaf"})
    assert response.status_code == 200

    data = response.json()
    assert data["benefit"] == "Hydrates and balances skin tone."
    assert data["source"] == "gemini"
    assert call_log["name"] == "NewLeaf"


def test_submitting_review_updates_counts(client, user, another_user, make_product):
    product = make_product("review-me", "ReviewCo", "Review Me")
    client.force_login(user)

    url = f"/api/quiz/products/{product.id}/reviews"
    payload = {"rating": 5, "comment": "Amazing product"}
    response = client.post(url, data=json.dumps(payload), content_type="application/json")
    assert response.status_code == 200

    product.refresh_from_db()
    assert product.review_count == 1
    assert float(product.rating) == 5.0

    # Another user adds a review; counts and averages should update
    client.force_login(another_user)
    payload2 = {"rating": 3, "comment": "It was fine"}
    response = client.post(url, data=json.dumps(payload2), content_type="application/json")
    assert response.status_code == 200

    product.refresh_from_db()
    assert product.review_count == 2
    assert pytest.approx(float(product.rating), rel=1e-3) == 4.0
