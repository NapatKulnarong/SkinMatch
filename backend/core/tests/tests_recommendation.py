from __future__ import annotations

from decimal import Decimal

from django.test import TestCase

from quiz.models import (
    Ingredient,
    Product,
    ProductConcern,
    ProductIngredient,
    ProductSkinType,
    SkinConcern,
    SkinTypeTag,
)
from quiz.recommendations import recommend_products


class RecommendProductsTestCase(TestCase):
    """Integration tests for quiz.recommendations.recommend_products."""

    @classmethod
    def setUpTestData(cls):
        cls.barrier_concern = SkinConcern.objects.create(
            key="damaged-skin-barrier",
            name="Damaged Skin Barrier",
        )
        cls.redness_concern = SkinConcern.objects.create(
            key="redness",
            name="Redness",
        )
        cls.acne_scar_concern = SkinConcern.objects.create(
            key="acne-scars",
            name="Acne Scars",
        )

        cls.skin_dry = SkinTypeTag.objects.create(key="dry", name="Dry")
        cls.skin_normal = SkinTypeTag.objects.create(key="normal", name="Normal")

        cls.lactic_acid = Ingredient.objects.create(
            key="lactic-acid",
            common_name="Lactic Acid",
        )
        cls.panthenol = Ingredient.objects.create(
            key="panthenol",
            common_name="Panthenol",
        )
        cls.ceramides = Ingredient.objects.create(
            key="ceramides",
            common_name="Ceramides",
        )
        cls.retinol = Ingredient.objects.create(
            key="retinol",
            common_name="Retinol",
        )
        cls.niacinamide = Ingredient.objects.create(
            key="niacinamide",
            common_name="Niacinamide",
        )

        cls.lactic_serum = Product.objects.create(
            slug="lactic-serum",
            name="Lactic Acid Serum",
            brand="TestLab",
            origin_country=Product.Origin.UNITED_STATES,
            category=Product.Category.SERUM,
            price=Decimal("32"),
            currency=Product.Currency.USD,
            summary="Exfoliating blend",
        )
        ProductIngredient.objects.create(
            product=cls.lactic_serum,
            ingredient=cls.lactic_acid,
            order=1,
        )
        ProductConcern.objects.create(
            product=cls.lactic_serum,
            concern=cls.barrier_concern,
        )
        ProductSkinType.objects.create(
            product=cls.lactic_serum,
            skin_type=cls.skin_dry,
        )

        cls.barrier_cream = Product.objects.create(
            slug="barrier-cream",
            name="Barrier Repair Cream",
            brand="DermCare",
            origin_country=Product.Origin.UNITED_STATES,
            category=Product.Category.MOISTURIZER,
            price=Decimal("28"),
            currency=Product.Currency.USD,
            summary="Ceramide-rich cream",
        )
        ProductIngredient.objects.create(
            product=cls.barrier_cream,
            ingredient=cls.panthenol,
            order=1,
        )
        ProductIngredient.objects.create(
            product=cls.barrier_cream,
            ingredient=cls.ceramides,
            order=2,
        )
        ProductConcern.objects.create(
            product=cls.barrier_cream,
            concern=cls.barrier_concern,
        )
        ProductConcern.objects.create(
            product=cls.barrier_cream,
            concern=cls.redness_concern,
        )
        ProductSkinType.objects.create(
            product=cls.barrier_cream,
            skin_type=cls.skin_dry,
        )

        cls.retinol_serum = Product.objects.create(
            slug="retinol-serum",
            name="Retinol Regeneration Serum",
            brand="DermCare",
            origin_country=Product.Origin.UNITED_STATES,
            category=Product.Category.SERUM,
            price=Decimal("46"),
            currency=Product.Currency.USD,
            summary="Retinoid treatment",
        )
        ProductIngredient.objects.create(
            product=cls.retinol_serum,
            ingredient=cls.retinol,
            order=1,
        )
        ProductConcern.objects.create(
            product=cls.retinol_serum,
            concern=cls.acne_scar_concern,
        )
        ProductConcern.objects.create(
            product=cls.retinol_serum,
            concern=cls.redness_concern,
        )
        ProductSkinType.objects.create(
            product=cls.retinol_serum,
            skin_type=cls.skin_normal,
        )

        cls.niacinamide_serum = Product.objects.create(
            slug="niacinamide-serum",
            name="Niacinamide Brightening Serum",
            brand="GlowLabs",
            origin_country=Product.Origin.UNITED_STATES,
            category=Product.Category.SERUM,
            price=Decimal("24"),
            currency=Product.Currency.USD,
            summary="Brightening and calming",
        )
        ProductIngredient.objects.create(
            product=cls.niacinamide_serum,
            ingredient=cls.niacinamide,
            order=1,
        )
        ProductConcern.objects.create(
            product=cls.niacinamide_serum,
            concern=cls.acne_scar_concern,
        )
        ProductConcern.objects.create(
            product=cls.niacinamide_serum,
            concern=cls.redness_concern,
        )
        ProductSkinType.objects.create(
            product=cls.niacinamide_serum,
            skin_type=cls.skin_normal,
        )

    def test_damaged_barrier_filters_problematic_acids(self):
        recommendations, summary = recommend_products(
            primary_concerns=["damaged-skin-barrier"],
            secondary_concerns=["redness"],
            eye_area_concerns=[],
            skin_type="dry",
            sensitivity="sometimes",
            restrictions=[],
            budget=None,
        )

        product_ids = {rec.product.id for rec in recommendations}
        self.assertIn(self.barrier_cream.id, product_ids)
        self.assertNotIn(self.lactic_serum.id, product_ids)

        prioritized_names = summary.get("top_ingredients", [])
        self.assertIn("Panthenol", prioritized_names)
        self.assertIn("Ceramides", prioritized_names)

    def test_sensitivity_flags_retinoids_with_caution(self):
        recommendations, summary = recommend_products(
            primary_concerns=["acne-scars"],
            secondary_concerns=["redness"],
            eye_area_concerns=[],
            skin_type="normal",
            sensitivity="sometimes",
            restrictions=[],
            budget=None,
        )

        product_ids = {rec.product.id for rec in recommendations}
        self.assertIn(self.retinol_serum.id, product_ids)

        caution_names = {item["name"] for item in summary.get("ingredients_caution", [])}
        self.assertIn("Retinol", caution_names)

    def test_acne_scars_prioritize_niacinamide_when_no_sensitivity(self):
        recommendations, summary = recommend_products(
            primary_concerns=["acne-scars"],
            secondary_concerns=[],
            eye_area_concerns=[],
            skin_type="normal",
            sensitivity="no",
            restrictions=[],
            budget=None,
        )

        product_ids = [rec.product.id for rec in recommendations]
        self.assertIn(self.niacinamide_serum.id, product_ids)
        self.assertIn(self.retinol_serum.id, product_ids)

        top_ingredients = summary.get("top_ingredients", [])
        self.assertIn("Niacinamide", top_ingredients)
        self.assertIn("Retinol", top_ingredients)

    def test_barrier_items_appear_top_when_high_sensitivity(self):
        recs, summary = recommend_products(
            primary_concerns=["damaged-skin-barrier"],
            secondary_concerns=["redness"],
            eye_area_concerns=[],
            skin_type="dry",
            sensitivity="yes",
            restrictions=[],
            budget=None,
        )

        top_labels = set(summary.get("top_ingredients", []))
        self.assertTrue({"Panthenol", "Ceramides"} & top_labels)

        top3 = recs[:3]
        top3_ids = {rec.product.id for rec in top3}
        self.assertIn(self.barrier_cream.id, top3_ids)

        soothing_hits = []
        for rec in top3:
            names = {str(value).lower() for value in rec.ingredients}
            soothing_hits.append(names)

        self.assertTrue(
            any(names & {"panthenol", "ceramides", "centella", "centella asiatica"} for names in soothing_hits)
        )

    def test_unknown_concern_slug_produces_no_primary_hits(self):
        recs, summary = recommend_products(
            primary_concerns=["non-existent-concern"],
            secondary_concerns=[],
            eye_area_concerns=[],
            skin_type="normal",
            sensitivity="no",
            restrictions=[],
            budget=None,
        )
        self.assertTrue(all("primary_concerns" not in rec.rationale for rec in recs))

        primary_concerns = summary.get("primary_concerns", [])
        self.assertTrue(primary_concerns, "Expected at least one readable concern in summary")

        normalized = [p.replace("-", " ").strip().lower() for p in primary_concerns]
        self.assertIn("non existent concern", normalized)


    def test_high_sensitivity_with_only_harsh_actives_left(self):
        recs, summary = recommend_products(
            primary_concerns=["damaged-skin-barrier"],
            secondary_concerns=[],
            eye_area_concerns=[],
            skin_type="normal",
            sensitivity="high",
            restrictions=["panthenol", "ceramides"],
            budget=None,
        )
        self.assertEqual(recs, [])
    
    def test_stable_sort_when_scores_tie(self):
        recs, _ = recommend_products(
            primary_concerns=["acne-scars"],
            secondary_concerns=[],
            eye_area_concerns=[],
            skin_type="normal",
            sensitivity="no",
            restrictions=[],
            budget=None,
        )
        slugs = [r.product.slug for r in recs]
        self.assertEqual(slugs, sorted(slugs))
