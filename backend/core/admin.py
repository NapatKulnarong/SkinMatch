from django.contrib import admin
from .models import SkinFactContentBlock, SkinFactTopic, SkinFactView


class SkinFactContentBlockInline(admin.TabularInline):
    """
    Inline editor for SkinFactContentBlock inside a SkinFactTopic.
    Shows each block as a row so editors can see:
    Order | Block Type | Heading | Text | Image | Image Alt
    """
    model = SkinFactContentBlock
    extra = 0
    fields = (
        "order",
        "block_type",
        "heading",
        "text",
        "image",
        "image_alt",
    )
    ordering = ("order",)
    show_change_link = False
    readonly_fields = ()


@admin.register(SkinFactTopic)
class SkinFactTopicAdmin(admin.ModelAdmin):
    """
    Admin for high-level topics like:
    - Skin Knowledge
    - Fact Check
    - Trending Skincare
    plus their hero image, publish state, etc.
    """
    list_display = (
        "title",
        "section",
        "is_published",
        "view_count",
        "last_updated",
        "updated_at",
    )
    list_filter = ("section", "is_published")
    search_fields = ("title", "subtitle", "excerpt", "slug")
    ordering = ("-updated_at",)
    prepopulated_fields = {"slug": ("title",)}

    fieldsets = (
        ("Content", {
            "fields": (
                "slug",
                "title",
                "subtitle",
                "excerpt",
                "section",
            ),
        }),
        ("Hero Image", {
            "fields": (
                "hero_image",
                "hero_image_alt",
            )
        }),
        ("Status & Metadata", {
            "fields": (
                "is_published",
                "view_count",
                "last_updated",
            ),
        }),
        ("Timestamps", {
            "fields": (
                "created_at",
                "updated_at",
            ),
        }),
    )

    readonly_fields = (
        "view_count",
        "created_at",
        "updated_at",
    )

    inlines = [SkinFactContentBlockInline]

@admin.register(SkinFactView)
class SkinFactViewAdmin(admin.ModelAdmin):
    list_display = (
        "topic",
        "user",
        "anonymous_key",
        "viewed_at",
    )
    search_fields = (
        "topic__title",
        "user__username",
        "user__email",
        "anonymous_key",
    )
    list_filter = (
        "viewed_at",
        "topic__section",
    )
    readonly_fields = (
        "topic",
        "user",
        "anonymous_key",
        "viewed_at",
    )
    ordering = ("-viewed_at",)
