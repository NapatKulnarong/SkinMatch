from django.contrib import admin

from .models import SkinFactContentBlock, SkinFactTopic, SkinFactView


class SkinFactContentBlockInline(admin.StackedInline):
    model = SkinFactContentBlock
    extra = 0
    fields = ("order", "block_type", "heading", "text", "image", "image_alt")
    ordering = ("order",)


@admin.register(SkinFactTopic)
class SkinFactTopicAdmin(admin.ModelAdmin):
    list_display = ("title", "section", "is_published", "view_count", "updated_at")
    list_filter = ("section", "is_published")
    search_fields = ("title", "subtitle", "excerpt")
    prepopulated_fields = {"slug": ("title",)}
    readonly_fields = ("view_count", "created_at", "updated_at")
    inlines = [SkinFactContentBlockInline]


@admin.register(SkinFactView)
class SkinFactViewAdmin(admin.ModelAdmin):
    list_display = ("topic", "user", "anonymous_key", "viewed_at")
    search_fields = ("topic__title", "user__username", "user__email", "anonymous_key")
    list_filter = ("viewed_at", "topic__section")
    readonly_fields = ("topic", "user", "anonymous_key", "viewed_at")
    ordering = ("-viewed_at",)
