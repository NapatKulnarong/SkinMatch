from __future__ import annotations

from decimal import Decimal
import base64

import pytest
from django.core.management import call_command
from django.test import override_settings
from django.utils.text import slugify

from quiz.catalog_loader import reset_sample_catalog_state
from quiz.models import (
    Ingredient,
    Product,
    ProductConcern,
    ProductIngredient,
    ProductSkinType,
    QuizSession,
    SkinConcern,
    SkinTypeTag,
)
from quiz.recommendations import recommend_products
from quiz.views import calculate_results


@pytest.mark.django_db(transaction=True)
def test_load_sample_command_populates_catalog():
    reset_sample_catalog_state()
    call_command("load_sample", "--reset", verbosity=0)

    assert Product.objects.filter(is_active=True).exists()

    recommendations, summary = recommend_products(
        primary_concerns=["Acne & Breakouts"],
        secondary_concerns=[],
        eye_area_concerns=[],
        skin_type=None,
        sensitivity=None,
        restrictions=[],
        budget=None,
        limit=5,
    )

    assert recommendations, "Sample catalog should produce at least one recommendation."
    assert isinstance(summary, dict)


@pytest.mark.django_db
def test_admin_created_product_can_be_recommended():
    concern, _ = SkinConcern.objects.get_or_create(
        key="uneven-texture",
        defaults={"name": "Uneven Texture"},
    )
    ingredient = Ingredient.objects.create(
        key="test-ingredient",
        common_name="Test Ingredient",
    )
    skin_type, _ = SkinTypeTag.objects.get_or_create(
        key="combination",
        defaults={"name": "Combination"},
    )

    product = Product.objects.create(
        slug="test-brand-smoothing-serum",
        name="Smoothing Serum",
        brand="Test Brand",
        origin_country=Product.Origin.UNITED_STATES,
        category=Product.Category.SERUM,
        summary="Radiance boosting serum tailored for uneven texture.",
        description="",
        hero_ingredients="Test Ingredient",
        price=Decimal("28.00"),
        currency=Product.Currency.USD,
        is_active=True,
    )

    ProductConcern.objects.create(
        product=product,
        concern=concern,
        weight=90,
    )
    ProductIngredient.objects.create(
        product=product,
        ingredient=ingredient,
        order=0,
        highlight=True,
    )
    ProductSkinType.objects.create(
        product=product,
        skin_type=skin_type,
        compatibility=90,
    )

    recommendations, _ = recommend_products(
        primary_concerns=["Uneven Texture"],
        secondary_concerns=[],
        eye_area_concerns=[],
        skin_type="Combination",
        sensitivity=None,
        restrictions=[],
        budget=None,
        limit=10,
    )

    assert any(rec.product == product for rec in recommendations), (
        "Newly added admin products with matching traits should appear in recommendations."
    )


@override_settings(QUIZ_AUTO_SEED_SAMPLE=True)
@pytest.mark.django_db(transaction=True)
def test_calculate_results_auto_seeds_catalog_when_empty():
    reset_sample_catalog_state()
    ProductSkinType.objects.all().delete()
    ProductIngredient.objects.all().delete()
    ProductConcern.objects.all().delete()
    Product.objects.all().delete()

    session = QuizSession.objects.create()
    session.profile_snapshot = {
        "primary_concerns": ["Acne & Breakouts"],
        "secondary_concerns": [],
        "eye_area_concerns": [],
        "skin_type": "Oily",
        "sensitivity": None,
        "ingredient_restrictions": [],
        "budget": "mid",
    }

    result = calculate_results(session, include_products=True)

    assert result["recommendations"], "Auto-seeded catalog should generate matches."
    assert Product.objects.filter(is_active=True).exists()
    for recommendation in result["recommendations"]:
        if recommendation["price_snapshot"] is not None:
            product = Product.objects.get(id=recommendation["product_id"])
            assert recommendation["currency"] == product.currency
            assert recommendation["price_snapshot"] == float(product.price)
        if recommendation["product_url"]:
            assert recommendation["product_url"].startswith(("http://", "https://"))


@pytest.mark.django_db
def test_budget_preference_respects_currency_conversion():
    reset_sample_catalog_state()
    Product.objects.all().delete()
    ProductConcern.objects.all().delete()
    ProductIngredient.objects.all().delete()
    ProductSkinType.objects.all().delete()

    concern, _ = SkinConcern.objects.get_or_create(
        key="acne-breakouts",
        defaults={"name": "Acne & Breakouts"},
    )

    def create_product(name: str, price: str) -> Product:
        product = Product.objects.create(
            slug=slugify(name),
            name=name,
            brand=name.split()[0],
            origin_country=Product.Origin.THAI,
            category=Product.Category.SERUM,
            price=Decimal(price),
            currency=Product.Currency.THB,
            is_active=True,
        )
        ProductConcern.objects.create(product=product, concern=concern, weight=90)
        return product

    create_product("Budget Serum", "450.00")  # ~USD 12.6 -> affordable
    premium_product = create_product("Luxury Serum", "2200.00")  # ~USD 61.6 -> premium

    session = QuizSession.objects.create()
    session.profile_snapshot = {
        "primary_concerns": ["Acne & Breakouts"],
        "secondary_concerns": [],
        "eye_area_concerns": [],
        "skin_type": "Combination",
        "sensitivity": None,
        "ingredient_restrictions": [],
        "budget": "premium",
    }

    result = calculate_results(session, include_products=True)
    top = result["recommendations"][0]
    assert top["product_id"] == str(premium_product.id)


@pytest.mark.django_db
def test_recommendation_prefers_uploaded_product_image(tmp_path, settings):
    reset_sample_catalog_state()
    settings.QUIZ_AUTO_SEED_SAMPLE = False
    media_root = tmp_path / "media"
    media_root.mkdir(parents=True, exist_ok=True)
    settings.MEDIA_ROOT = str(media_root)

    ProductSkinType.objects.all().delete()
    ProductIngredient.objects.all().delete()
    ProductConcern.objects.all().delete()
    Product.objects.all().delete()

    concern, _ = SkinConcern.objects.get_or_create(
        key="acne-breakouts",
        defaults={"name": "Acne & Breakouts"},
    )
    ingredient = Ingredient.objects.create(
        key="hydrating-agent",
        common_name="Hydrating Agent",
    )
    skin_type, _ = SkinTypeTag.objects.get_or_create(
        key="oily",
        defaults={"name": "Oily"},
    )

    product = Product.objects.create(
        slug="local-image-product",
        name="Local Image Serum",
        brand="Test Brand",
        origin_country=Product.Origin.THAI,
        category=Product.Category.SERUM,
        summary="Serum with local image upload.",
        description="",
        hero_ingredients="Hydrating Agent",
        price=Decimal("650.00"),
        currency=Product.Currency.THB,
        product_url="https://store.example.com/products/123",
        image_url="https://example.com/fallback.jpg",
        is_active=True,
    )

    products_dir = media_root / "products"
    products_dir.mkdir(parents=True, exist_ok=True)
    png_bytes = base64.b64decode(
        b"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/xcAAuMB9c5ajVIAAAAASUVORK5CYII="
    )
    image_path = products_dir / "test-product.png"
    image_path.write_bytes(png_bytes)
    product.image = f"products/{image_path.name}"
    product.save(update_fields=["image"])

    ProductConcern.objects.create(
        product=product,
        concern=concern,
        weight=90,
    )
    ProductIngredient.objects.create(
        product=product,
        ingredient=ingredient,
        order=0,
        highlight=True,
    )
    ProductSkinType.objects.create(
        product=product,
        skin_type=skin_type,
        compatibility=95,
    )

    session = QuizSession.objects.create()
    session.profile_snapshot = {
        "primary_concerns": ["Acne & Breakouts"],
        "secondary_concerns": [],
        "eye_area_concerns": [],
        "skin_type": "Oily",
        "sensitivity": None,
        "ingredient_restrictions": [],
        "budget": "mid",
    }

    result = calculate_results(session, include_products=True)
    recommendation = result["recommendations"][0]

    assert recommendation["image_url"] is not None
    assert recommendation["image_url"].endswith(".png")
    assert recommendation["image_url"].startswith(settings.MEDIA_URL)
    assert recommendation["product_url"] == "https://store.example.com/products/123"

    pick = session.picks.first()
    assert pick is not None
    assert pick.image_url.endswith(".png")
    assert pick.product_url == "https://store.example.com/products/123"


@pytest.mark.django_db
def test_recommendation_uses_placeholder_when_no_image():
    reset_sample_catalog_state()
    ProductSkinType.objects.all().delete()
    ProductIngredient.objects.all().delete()
    ProductConcern.objects.all().delete()
    Product.objects.all().delete()

    concern, _ = SkinConcern.objects.get_or_create(
        key="dull-skin",
        defaults={"name": "Dull Skin"},
    )
    ingredient = Ingredient.objects.create(
        key="vitamin-c",
        common_name="Vitamin C",
    )

    product = Product.objects.create(
        slug="placeholder-serum",
        name="Glow Serum",
        brand="Bright Labs",
        origin_country=Product.Origin.UNITED_STATES,
        category=Product.Category.SERUM,
        summary="Serum without explicit imagery.",
        description="",
        hero_ingredients="Vitamin C",
        price=Decimal("1200.00"),
        currency=Product.Currency.THB,
        product_url="https://store.example.com/placeholder",
        is_active=True,
    )

    ProductConcern.objects.create(
        product=product,
        concern=concern,
        weight=70,
    )
    ProductIngredient.objects.create(
        product=product,
        ingredient=ingredient,
        order=0,
        highlight=True,
    )

    session = QuizSession.objects.create()
    session.profile_snapshot = {
        "primary_concerns": ["Dull Skin"],
        "secondary_concerns": [],
        "eye_area_concerns": [],
        "skin_type": "Normal",
        "sensitivity": None,
        "ingredient_restrictions": [],
        "budget": "mid",
    }

    result = calculate_results(session, include_products=True)
    recommendation = result["recommendations"][0]
    assert recommendation["image_url"].startswith("data:image/svg+xml;utf8,")
    assert recommendation["product_url"] == "https://store.example.com/placeholder"
