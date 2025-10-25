from django.contrib import admin

from .models import (
    Ingredient,
    MatchPick,
    Product,
    ProductReview,
    ProductConcern,
    ProductIngredient,
    ProductSkinType,
    QuizFeedback,
    QuizSession,
    RestrictionTag,
    SkinConcern,
    SkinTypeTag,
)


@admin.register(QuizSession)
class QuizSessionAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "started_at", "completed_at")
    search_fields = ("id", "user__username", "user__email")
    list_filter = ("completed_at",)
    readonly_fields = ("started_at", "completed_at", "answer_snapshot", "profile_snapshot", "result_summary")


@admin.register(QuizFeedback)
class QuizFeedbackAdmin(admin.ModelAdmin):
    list_display = ("contact_email", "session", "created_at")
    search_fields = ("contact_email", "message")
    list_filter = ("created_at",)
    readonly_fields = ("created_at",)


class ProductIngredientInline(admin.TabularInline):
    model = ProductIngredient
    extra = 1
    autocomplete_fields = ("ingredient",)
    fields = ("ingredient", "order", "highlight")


class ProductConcernInline(admin.TabularInline):
    model = ProductConcern
    extra = 1
    autocomplete_fields = ("concern",)
    fields = ("concern", "weight")


class ProductSkinTypeInline(admin.TabularInline):
    model = ProductSkinType
    extra = 1
    autocomplete_fields = ("skin_type",)
    fields = ("skin_type", "compatibility")


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ("name", "brand", "category", "origin_country", "price", "currency", "is_active")
    search_fields = ("name", "brand", "slug")
    list_filter = ("category", "origin_country", "is_active")
    prepopulated_fields = {"slug": ("brand", "name")}
    autocomplete_fields = ("restrictions",)
    readonly_fields = ("created_at", "updated_at")
    inlines = [ProductIngredientInline, ProductConcernInline, ProductSkinTypeInline]


@admin.register(ProductReview)
class ProductReviewAdmin(admin.ModelAdmin):
    list_display = ("product", "user", "rating", "is_public", "created_at")
    list_filter = ("is_public", "rating", "created_at")
    search_fields = ("product__name", "product__brand", "user__username", "user__email", "comment")
    autocomplete_fields = ("product", "user")
    readonly_fields = ("created_at", "updated_at")


@admin.register(Ingredient)
class IngredientAdmin(admin.ModelAdmin):
    list_display = ("common_name", "key")
    search_fields = ("common_name", "inci_name", "key")


@admin.register(SkinConcern)
class SkinConcernAdmin(admin.ModelAdmin):
    list_display = ("name", "key")
    search_fields = ("name", "key")


@admin.register(SkinTypeTag)
class SkinTypeTagAdmin(admin.ModelAdmin):
    list_display = ("name", "key")
    search_fields = ("name", "key")


@admin.register(RestrictionTag)
class RestrictionTagAdmin(admin.ModelAdmin):
    list_display = ("name", "key")
    search_fields = ("name", "key")


@admin.register(ProductIngredient)
class ProductIngredientAdmin(admin.ModelAdmin):
    list_display = ("product", "ingredient", "order", "highlight")
    list_filter = ("highlight",)
    search_fields = ("product__name", "ingredient__common_name")
    autocomplete_fields = ("product", "ingredient")


@admin.register(ProductConcern)
class ProductConcernAdmin(admin.ModelAdmin):
    list_display = ("product", "concern", "weight")
    search_fields = ("product__name", "concern__name")
    autocomplete_fields = ("product", "concern")


@admin.register(ProductSkinType)
class ProductSkinTypeAdmin(admin.ModelAdmin):
    list_display = ("product", "skin_type", "compatibility")
    search_fields = ("product__name", "skin_type__name")
    autocomplete_fields = ("product", "skin_type")


@admin.register(MatchPick)
class MatchPickAdmin(admin.ModelAdmin):
    list_display = ("session", "product_name", "brand", "rank", "score")
    search_fields = ("product_name", "brand", "session__id")
    list_filter = ("rank",)
