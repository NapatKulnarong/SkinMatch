import pytest
from decimal import Decimal
from uuid import uuid4

from django.contrib.auth import get_user_model
from ninja.testing import TestClient

from core.api import api
from core.auth import create_access_token
from core.models import WishlistItem
from quiz.models import Product


User = get_user_model()
client = TestClient(api)


@pytest.fixture
def user(db):
    return User.objects.create_user(
        username="wishlist-user",
        email="wishlist@example.com",
        password="StrongPass!234",
    )


@pytest.fixture
def auth_header(user):
    token = create_access_token(user)
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def make_product(db):
    def _make(**overrides):
        slug = overrides.pop("slug", f"prod-{uuid4().hex[:8]}")
        defaults = {
            "slug": slug,
            "name": overrides.pop("name", f"Product {slug}"),
            "brand": overrides.pop("brand", "SkinMatch"),
            "origin_country": overrides.pop("origin_country", Product.Origin.SOUTH_KOREA),
            "category": overrides.pop("category", Product.Category.SERUM),
            "price": overrides.pop("price", Decimal("950.00")),
            "currency": overrides.pop("currency", Product.Currency.THB),
            "summary": overrides.pop("summary", "Hydrating booster"),
            "description": overrides.pop("description", "Test product"),
            "hero_ingredients": overrides.pop("hero_ingredients", "Niacinamide"),
            "product_url": overrides.pop("product_url", "https://example.com/product"),
        }
        defaults.update(overrides)
        return Product.objects.create(**defaults)

    return _make


@pytest.mark.django_db
def test_wishlist_initially_empty(auth_header):
    response = client.get("/api/wishlist", headers=auth_header)
    assert response.status_code == 200
    assert response.json() == []


@pytest.mark.django_db
def test_add_product_to_wishlist(user, auth_header, make_product):
    product = make_product()
    response = client.post(
        "/api/wishlist/add",
        json={"product_id": str(product.id)},
        headers=auth_header,
    )
    assert response.status_code == 200
    assert response.json() == {"ok": True, "status": "added"}
    assert WishlistItem.objects.filter(user=user, product=product).exists()


@pytest.mark.django_db
def test_add_product_twice_returns_already_saved(auth_header, make_product):
    product = make_product()

    first = client.post(
        "/api/wishlist/add",
        json={"product_id": str(product.id)},
        headers=auth_header,
    )
    assert first.status_code == 200

    second = client.post(
        "/api/wishlist/add",
        json={"product_id": str(product.id)},
        headers=auth_header,
    )
    assert second.status_code == 200
    assert second.json() == {"ok": True, "status": "already_saved"}


@pytest.mark.django_db
def test_remove_product_from_wishlist(user, auth_header, make_product):
    product = make_product()
    WishlistItem.objects.create(user=user, product=product)

    response = client.delete(f"/api/wishlist/{product.id}", headers=auth_header)
    assert response.status_code == 200
    assert response.json() == {"ok": True, "status": "removed"}
    assert not WishlistItem.objects.filter(user=user, product=product).exists()


@pytest.mark.django_db
def test_delete_nonexistent_product_is_idempotent(auth_header):
    random_id = uuid4()
    response = client.delete(f"/api/wishlist/{random_id}", headers=auth_header)
    assert response.status_code == 200
    assert response.json() == {"ok": True, "status": "not_present"}


@pytest.mark.django_db
def test_list_returns_serialized_product_fields(user, auth_header, make_product):
    product_one = make_product(name="Bright Serum")
    product_two = make_product(name="Calm Cream")
    WishlistItem.objects.create(user=user, product=product_one)
    WishlistItem.objects.create(user=user, product=product_two)

    response = client.get("/api/wishlist", headers=auth_header)
    assert response.status_code == 200

    payload = response.json()
    assert len(payload) == 2

    first = payload[0]
    assert set(first.keys()) == {
        "id",
        "slug",
        "name",
        "brand",
        "category",
        "price",
        "currency",
        "image",
        "product_url",
        "saved_at",
    }


@pytest.mark.django_db
def test_wishlist_endpoints_require_auth(make_product):
    product = make_product()

    assert client.get("/api/wishlist").status_code == 401
    assert (
        client.post("/api/wishlist/add", json={"product_id": str(product.id)}).status_code
        == 401
    )
    assert client.delete(f"/api/wishlist/{product.id}").status_code == 401
