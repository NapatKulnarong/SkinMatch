from __future__ import annotations

from datetime import date
from typing import Iterable, List

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandParser
from django.utils import timezone

from core.models import UserProfile, SkinProfile
from quiz.models import Product, ProductReview, QuizSession, MatchPick


class Command(BaseCommand):
    help = (
        "Create a deterministic admin account plus three demo members with fully populated "
        "profile information so reviewers can log in immediately."
    )

    DEMO_ACCOUNTS: list[dict] = [
        {
            "username": "skinmatch_admin",
            "email": "admin@skinmatch.demo",
            "password": "AdminPass#123",
            "first_name": "Meera",
            "last_name": "Suthep",
            "is_staff": True,
            "is_superuser": True,
            "profile": {
                "gender": UserProfile.Gender.FEMALE,
                "date_of_birth": date(1990, 3, 15),
                "role": UserProfile.Role.ADMIN,
                "avatar_url": "https://i.pinimg.com/736x/50/b9/c3/50b9c3327898515e8c08290214d79bf4.jpg",
                "is_verified": True,
                "accept_policies": True,
            },
        },
        {
            "username": "Testuser001",
            "email": "testuser001@gmail.com",
            "password": "GlowPass#123",
            "first_name": "Alice",
            "last_name": "Rendell",
            "profile": {
                "gender": UserProfile.Gender.FEMALE,
                "date_of_birth": date(2005, 5, 16),
                "role": UserProfile.Role.MEMBER,
                "avatar_url": "https://i.pinimg.com/736x/16/8c/e2/168ce242e80235a4147118b02225f243.jpg",
                "is_verified": True,
                "accept_policies": True,
            },
            "history": [
                {
                    "profile": {
                        "primary_concerns": ["Dull-skin"],
                        "secondary_concerns": ["Fine-lines-wrinkles"],
                        "eye_area_concerns": ["None"],
                        "skin_type": SkinProfile.SkinType.DRY,
                        "sensitivity": SkinProfile.Sensitivity.SOMETIMES,
                        "ingredient_restrictions": [],
                        "budget": SkinProfile.Budget.AFFORDABLE,
                        "pregnant_or_breastfeeding": False,
                    },
                    "answer_snapshot": {
                        "region": "Bangkok",
                        "routine_frequency": "twice_daily",
                        "search_terms": ["brightening", "essence layering"],
                    },
                    "strategy_notes": [
                        "AM: Vit C serum, then essence. Hydrate & brighten!",
                        "PM: Double cleanse. Oil first, then gentle cleanser.",
                        "Essence layering: Apply thin essence before thicker one.",
                        "Mask 2x/week: Alternate hydrating & brightening masks.",
                        "Lactic Acid PM: Use 2-3x/week. Follow with hydrating oil.",
                        "Niacinamide AM/PM: Layer under moisturizer for radiance.",
                        "Hyaluronic Acid: Apply to damp skin for max hydration.",
                        "Rice extract essence: Use AM/PM for gentle brightening.",
                    ],
                    "ingredients_prioritize": [
                        {"name": "Rice Extract (Oryza Sativa)", "reason": "Brightening & scar fading; use AM/PM"},
                        {"name": "Niacinamide", "reason": "Brightens and revitalizes complexion"},
                        {"name": "Lactic Acid", "reason": "Offers mild exfoliation plus hydration"},
                        {"name": "Licorice Root", "reason": "Targets dull spots for even tone"},
                        {"name": "Vitamin C", "reason": "Boosts collagen and improves texture"},
                        {"name": "Hyaluronic Acid", "reason": "Attracts moisture; apply after cleansing"},
                    ],
                    "ingredients_caution": [
                        {"name": "Heavy silicones", "reason": "Can make skin look flat instead of luminous."},
                        {"name": "Drying alcohols", "reason": "Dehydrates skin and accentuates lines."},
                        {"name": "Foaming sulphate cleansers", "reason": "Strip essential oils and worsen dryness."},
                    ],
                    "top_ingredients": [
                        "Rice Extract (Oryza Sativa)",
                        "Niacinamide",
                        "Lactic Acid",
                        "Licorice Root",
                        "Vitamin C",
                        "Hyaluronic Acid",
                    ],
                    "products": [
                        {"slug": "lululun-precious-red-face-mask", "score": 83.0},
                        {"slug": "missha-time-revolution-the-first-treatment-essence", "score": 83.0},
                        {"slug": "sunday-riley-good-genes-all-in-one-lactic-acid-treatment", "score": 75.0},
                        {"slug": "biossance-squalane-vitamin-c-rose-oil", "score": 75.0},
                        {"slug": "neogen-real-ferment-micro-essence", "score": 75.0},
                        {"slug": "glow-recipe-avocado-melt-retinol-sleeping-mask", "score": 75.0},
                        {"slug": "shiseido-ultimune-power-infusing-concentrate", "score": 75.0},
                        {"slug": "drunk-elephant-c-firma-fresh-day-serum", "score": 75.0},
                    ],
                }
            ],
        },
        {
            "username": "Testuser002",
            "email": "testuser002@gmail.com",
            "password": "RoutinePass#123",
            "first_name": "Napat",
            "last_name": "Jirawat",
            "is_staff": False,
            "is_superuser": False,
            "profile": {
                "gender": UserProfile.Gender.MALE,
                "date_of_birth": date(1997, 7, 4),
                "role": UserProfile.Role.MEMBER,
                "avatar_url": "https://i.pinimg.com/736x/5d/09/41/5d0941ec145ef1b59e98c1ee8d4f4c6d.jpg",
                "is_verified": True,
                "accept_policies": True,
            },
            "history": [
                {
                    "profile": {
                        "primary_concerns": ["Acne-scars"],
                        "secondary_concerns": ["Redness"],
                        "eye_area_concerns": ["Dark circles"],
                        "skin_type": SkinProfile.SkinType.DRY,
                        "sensitivity": SkinProfile.Sensitivity.YES,
                        "ingredient_restrictions": ["fragrance-free", "no menthol"],
                        "budget": SkinProfile.Budget.PREMIUM,
                        "pregnant_or_breastfeeding": True,
                    },
                    "answer_snapshot": {
                        "region": "Chiang Mai",
                        "routine_frequency": "morning_only",
                        "lifestyle": "busy professional",
                    },
                    "strategy_notes": [
                        "AM: Start with a gentle, hydrating toner (Muji).",
                        "PM: Alternate toners (Klairs) for varied benefits.",
                        "Apply essence (COSRX) after toner, while skin is damp.",
                        "Layer Vitamin C serum in the AM for antioxidant protection.",
                        "Use Centella Asiatica treatment on red areas, AM or PM.",
                        "Hydrate with Hyaluronic Acid serum before heavier creams.",
                        "PM: Panthenol treatment to soothe & repair overnight.",
                        "Always finish with a rich moisturizer to lock in hydration.",
                    ],
                    "ingredients_prioritize": [
                        {"name": "Hyaluronic Acid", "reason": "Attracts moisture; apply on damp skin after cleansing"},
                        {"name": "Panthenol", "reason": "Aids skin barrier repair; use daily in AM/PM"},
                        {"name": "Green Tea", "reason": "Soothes redness; apply to affected areas first"},
                        {"name": "Centella Asiatica Extract", "reason": "Calms inflammation & redness"},
                        {"name": "Vitamin C", "reason": "Brightens and evens skin tone over time"},
                        {"name": "Retinoids", "reason": "Encourage regeneration to soften textural scars"},
                    ],
                    "ingredients_caution": [
                        {"name": "Aggressive scrubs", "reason": "Create more inflammation and delay healing."},
                        {"name": "Added fragrance", "reason": "A common trigger for diffuse redness."},
                        {"name": "Menthol", "reason": "Cooling agents can sting reactive skin."},
                        {"name": "Foaming sulphate cleansers", "reason": "Strip essential oils and worsen dryness."},
                        {"name": "Synthetic fragrance", "reason": "Common trigger for sensitised skin."},
                        {"name": "High-dose exfoliants", "reason": "Introduce slowly and buffer with moisturiser."},
                        {"name": "Retinoids", "reason": "Avoid during pregnancy and breastfeeding."},
                        {"name": "High-dose salicylic acid", "reason": "Keep concentrations at or below 2% leave-on."},
                    ],
                    "top_ingredients": [
                        "Hyaluronic Acid",
                        "Panthenol",
                        "Green Tea",
                        "Centella Asiatica Extract",
                        "Vitamin C",
                        "Retinoids",
                    ],
                    "products": [
                        {"slug": "muji-sensitive-skin-toning-water-high-moisture", "score": 37.0},
                        {"slug": "dear-klairs-supple-preparation-unscented-toner", "score": 37.0},
                        {"slug": "cosrx-advanced-snail-96-mucin-power-essence", "score": 37.0},
                        {"slug": "skink1004-madagascar-centella-ampoule", "score": 35.0},
                        {"slug": "etude-soonjung-ph-55-relief-toner", "score": 35.0},
                        {"slug": "ole-henriksen-strength-trainer-peptide-boost-moisturizer", "score": 35.0},
                        {"slug": "dr-jart-ceramidin-cream", "score": 25.0},
                        {"slug": "dr-jart-cicapair-tiger-grass-color-correcting-treatment", "score": 23.0},
                    ],
                }
            ],
        },
        {
            "username": "Testuser003",
            "email": "testuser003@gmail.com",
            "password": "FreshPass#123",
            "first_name": "Patcha",
            "last_name": "Veerasak",
            "profile": {
                "gender": UserProfile.Gender.PREFER_NOT,
                "date_of_birth": date(1999, 11, 21),
                "role": UserProfile.Role.MEMBER,
                "avatar_url": "https://i.pinimg.com/736x/5b/28/9b/5b289b42b57ba3b639c97be8ffe1d41b.jpg",
                "is_verified": False,
                "accept_policies": True,
            },
            "history": [
                {
                    "profile": {
                        "primary_concerns": ["Dull Skin"],
                        "secondary_concerns": ["Acne Scars"],
                        "eye_area_concerns": ["None"],
                        "skin_type": SkinProfile.SkinType.DRY,
                        "sensitivity": SkinProfile.Sensitivity.SOMETIMES,
                        "ingredient_restrictions": [],
                        "budget": SkinProfile.Budget.AFFORDABLE,
                        "pregnant_or_breastfeeding": False,
                    },
                    "answer_snapshot": {
                        "region": "Bangkok",
                        "routine_frequency": "twice_daily",
                        "search_terms": ["glow", "vitamin c"],
                    },
                    "strategy_notes": [
                        "AM: Vit C serum first for antioxidant protection. Follow with hydrating serum.",
                        "PM: Tranexamic Acid serum, then Alpha Arbutin serum for scar fading.",
                        "Hydrate! Apply Hyaluronic Acid serum on damp skin, AM & PM.",
                        "Seal in serums with a rich moisturizer. Prioritize Panthenol for dry skin.",
                        "Mask 2-3x/week. Alternate hydrating (Mediheal) & brightening (Lululun).",
                        "Use toner after cleansing to prep skin for serum absorption.",
                        "Layer serums based on consistency: thinnest to thickest.",
                        "Rice extract (Oryza Sativa) can be incorporated in any step for soothing.",
                    ],
                    "ingredients_prioritize": [
                        {"name": "Vitamin C", "reason": "Brightens and evens skin tone over time"},
                        {"name": "Alpha Arbutin", "reason": "Brightens and evens skin tone over time"},
                        {"name": "Tranexamic Acid", "reason": "Targets persistent acne scars"},
                        {"name": "Hyaluronic Acid", "reason": "Attracts moisture; apply on damp skin"},
                        {"name": "Panthenol", "reason": "Aids skin barrier repair; use daily AM/PM"},
                        {"name": "Rice Extract (Oryza Sativa)", "reason": "Brightening & scar fading benefits"},
                    ],
                    "ingredients_caution": [
                        {"name": "Heavy silicones", "reason": "Can make skin look flat instead of luminous."},
                        {"name": "Aggressive scrubs", "reason": "Trigger inflammation and delay healing."},
                        {"name": "Foaming sulphate cleansers", "reason": "Strip essential oils and worsen dryness."},
                        {"name": "Drying alcohols", "reason": "Can tip skin into a reactive state."},
                    ],
                    "top_ingredients": [
                        "Vitamin C",
                        "Alpha Arbutin",
                        "Tranexamic Acid",
                        "Hyaluronic Acid",
                        "Panthenol",
                        "Rice Extract",
                    ],
                    "products": [
                        {"slug": "yanhee-vitamin-c-serum", "score": 63.0},
                        {"slug": "mediheal-n-m-f-aquaring-ampoule-mask", "score": 63.0},
                        {"slug": "lululun-precious-red-face-mask", "score": 63.0},
                        {"slug": "dear-klairs-freshly-juiced-vitamin-c-drop", "score": 63.0},
                        {"slug": "cute-press-1st-skin-booster-serum", "score": 63.0},
                        {"slug": "snail-white-miracle-intensive-repair-serum", "score": 63.0},
                        {"slug": "laneige-water-sleeping-mask", "score": 63.0},
                        {"slug": "hada-labo-gokujyun-hyaluronic-acid-lotion", "score": 63.0},
                    ],
                }
            ],
        },
    ]

    REVIEW_COMMENTS = [
        "Leaves my skin bouncy without any greasy finish.",
        "Visible glow after two weeks and the texture stays calm.",
        "Pairs perfectly with my sunscreen—zero pilling.",
    ]

    def add_arguments(self, parser: CommandParser) -> None:
        parser.add_argument(
            "--reset-passwords",
            action="store_true",
            help="Also reset the password for each demo account to the values in this command.",
        )

    def handle(self, *args, **options):
        reset_passwords: bool = options.get("reset_passwords", False)
        User = get_user_model()
        seed_timestamp = timezone.now()
        created_count = 0

        self.demo_products: List[Product] = list(
            Product.objects.filter(is_active=True).order_by("brand", "name")[:12]
        )
        if not self.demo_products:
            self.stderr.write(
                self.style.WARNING(
                    "No products found. Run `python manage.py load_sample_catalog` before seeding reviews."
                )
            )

        for account in self.DEMO_ACCOUNTS:
            username = account["username"]
            user_defaults = {
                "email": account["email"],
                "first_name": account["first_name"],
                "last_name": account["last_name"],
                "is_staff": account.get("is_staff", False),
                "is_superuser": account.get("is_superuser", False),
                "is_active": True,
            }
            user, created = User.objects.get_or_create(username=username, defaults=user_defaults)
            user_dirty = False

            for field, value in user_defaults.items():
                if getattr(user, field) != value:
                    setattr(user, field, value)
                    user_dirty = True

            if created or reset_passwords:
                user.set_password(account["password"])
                user_dirty = True

            if user_dirty:
                user.save()

            profile_payload = dict(account.get("profile", {}))
            accept_policies = profile_payload.pop("accept_policies", False)
            if accept_policies:
                profile_payload.setdefault("terms_accepted_at", seed_timestamp)
                profile_payload.setdefault("privacy_policy_accepted_at", seed_timestamp)
            profile_payload.setdefault("role", UserProfile.Role.MEMBER)

            profile, _ = UserProfile.objects.get_or_create(user=user)
            profile_dirty = False
            for field, value in profile_payload.items():
                if getattr(profile, field) != value:
                    setattr(profile, field, value)
                    profile_dirty = True

            if profile_dirty:
                profile.save()

            created_count += 1 if created else 0
            action = "created" if created else "updated"
            self.stdout.write(
                self.style.SUCCESS(
                    f"{action.title()} demo account '{username}' "
                    f"({'password reset' if reset_passwords and not created else 'ready'})"
                )
            )

            self._ensure_demo_history(user, account.get("history"))
            self._ensure_demo_reviews(user)

        self.stdout.write(
            self.style.NOTICE(
                "Demo accounts available:\n"
                "  • Admin: skinmatch_admin / AdminPass#123\n"
                "  • Member: Testuser001 / GlowPass#123\n"
                "  • Member: Testuser002 / RoutinePass#123\n"
                "  • Member: Testuser003 / FreshPass#123"
            )
        )
        self.stdout.write(
            self.style.SUCCESS(f"Processed {len(self.DEMO_ACCOUNTS)} accounts (created {created_count}).")
        )

    # ------------------------------------------------------------------ helpers

    def _ensure_demo_history(self, user, history_blueprints=None):
        if user.skin_profiles.exists():
            return

        from quiz.views import calculate_results, _persist_skin_profile

        blueprints = history_blueprints or []
        if not blueprints:
            return
        for blueprint in blueprints:
            if blueprint.get("products"):
                self._seed_manual_history(user, blueprint)
                continue
            profile_payload = dict(blueprint["profile"])
            answer_snapshot = self._build_answer_snapshot(blueprint)
            session = QuizSession.objects.create(
                user=user,
                answer_snapshot=answer_snapshot,
                profile_snapshot=profile_payload,
                completed_at=timezone.now(),
            )
            result_payload = calculate_results(session, include_products=True)
            session.result_summary = result_payload
            session.save(update_fields=["answer_snapshot", "profile_snapshot", "completed_at", "result_summary"])
            _persist_skin_profile(session, profile_payload)

    def _seed_manual_history(self, user, blueprint: dict):
        products_config = blueprint.get("products") or []
        if not products_config:
            return
        profile_payload = dict(blueprint["profile"])
        answer_snapshot = self._build_answer_snapshot(blueprint)
        session = QuizSession.objects.create(
            user=user,
            answer_snapshot=answer_snapshot,
            profile_snapshot=profile_payload,
            completed_at=timezone.now(),
        )
        recommendations = []
        for rank, product_cfg in enumerate(products_config, start=1):
            product = self._get_product(product_cfg.get("slug"))
            if not product:
                continue
            score = product_cfg.get("score", 63.0)
            recommendation_entry = self._serialize_product_reco(
                product,
                rank,
                score,
                rationale=product_cfg.get("rationale"),
            )
            recommendations.append(recommendation_entry)
            MatchPick.objects.create(
                session=session,
                product=product,
                product_slug=product.slug,
                product_name=product.name,
                brand=product.brand,
                category=product.category,
                rank=rank,
                score=score,
                ingredients=recommendation_entry.get("ingredients", []),
                price_snapshot=product.price,
                currency=product.currency,
                rationale=product_cfg.get("rationale") or {},
                image_url=product.image or "",
                product_url=product.product_url or "",
            )

        summary = {
            "primary_concerns": list(profile_payload.get("primary_concerns") or []),
            "top_ingredients": blueprint.get("top_ingredients")
            or [item.get("name") for item in blueprint.get("ingredients_prioritize", [])],
            "ingredients_to_prioritize": blueprint.get("ingredients_prioritize", []),
            "ingredients_caution": blueprint.get("ingredients_caution", []),
            "category_breakdown": blueprint.get("category_breakdown", {}),
            "generated_at": timezone.now().isoformat(),
            "score_version": "demo-v1",
        }
        session.result_summary = {
            "summary": summary,
            "strategy_notes": list(blueprint.get("strategy_notes") or []),
            "recommendations": recommendations,
        }
        session.save(update_fields=["answer_snapshot", "profile_snapshot", "completed_at", "result_summary"])

        from quiz.views import _persist_skin_profile

        _persist_skin_profile(session, profile_payload)

    def _get_product(self, slug: str | None) -> Product | None:
        if not slug:
            return None
        slug = slug.strip().lower()
        if not hasattr(self, "_product_lookup"):
            self._product_lookup = {}
        if slug in self._product_lookup:
            return self._product_lookup[slug]
        try:
            product = Product.objects.get(slug=slug, is_active=True)
        except Product.DoesNotExist:
            product = None
            self.stderr.write(self.style.WARNING(f"Missing product seed for slug '{slug}'"))
        self._product_lookup[slug] = product
        return product

    def _serialize_product_reco(self, product: Product, rank: int, score: float, rationale: dict | None = None) -> dict:
        hero = [
            part.strip()
            for part in (product.hero_ingredients or "").split(",")
            if part and part.strip()
        ]
        price_value = float(product.price) if product.price is not None else None
        rating_value = float(product.rating) if product.rating is not None else 0
        return {
            "product_id": str(product.id),
            "slug": product.slug,
            "brand": product.brand,
            "product_name": product.name,
            "category": product.category,
            "rank": rank,
            "score": round(score, 2),
            "price_snapshot": price_value,
            "currency": product.currency,
            "image_url": product.image or None,
            "product_url": product.product_url or None,
            "ingredients": hero[:3],
            "rationale": rationale or {},
            "average_rating": rating_value,
            "review_count": product.review_count,
        }

    def _build_answer_snapshot(self, blueprint: dict) -> dict:
        snapshot = dict(blueprint.get("answer_snapshot") or {})
        profile = blueprint["profile"]
        snapshot.setdefault("primary_concerns", profile.get("primary_concerns", []))
        snapshot.setdefault("secondary_concerns", profile.get("secondary_concerns", []))
        snapshot.setdefault("eye_area_concerns", profile.get("eye_area_concerns", []))
        snapshot.setdefault("skin_type", profile.get("skin_type"))
        snapshot.setdefault("sensitivity", profile.get("sensitivity"))
        snapshot.setdefault("ingredient_restrictions", profile.get("ingredient_restrictions", []))
        snapshot.setdefault("budget", profile.get("budget"))
        snapshot.setdefault("pregnant_or_breastfeeding", profile.get("pregnant_or_breastfeeding"))
        return snapshot

    def _pick_products(self, count: int, offset: int = 0) -> List[Product]:
        if not self.demo_products:
            return []
        pool = self.demo_products
        results: List[Product] = []
        for i in range(count):
            idx = (offset + i) % len(pool)
            results.append(pool[idx])
        return results

    def _ensure_demo_reviews(self, user):
        if not self.demo_products:
            return
        comment_templates = list(self.REVIEW_COMMENTS)
        products = self._pick_products(2, offset=len(user.username))
        for idx, product in enumerate(products):
            comment = comment_templates[idx % len(comment_templates)]
            rating = min(5, 4 + idx)
            defaults = {
                "rating": rating,
                "comment": f"{comment} ({product.name})",
                "is_public": True,
                "is_anonymous": False,
            }
            ProductReview.objects.update_or_create(
                product=product,
                user=user,
                defaults=defaults,
            )
