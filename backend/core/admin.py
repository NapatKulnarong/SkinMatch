from django.contrib import admin
from django import forms
from .models import SkinFactContentBlock, SkinFactTopic, SkinFactView, NewsletterSubscriber


class SkinFactContentBlockForm(forms.ModelForm):
    """Custom form to ensure content field is always visible"""
    class Meta:
        model = SkinFactContentBlock
        fields = '__all__'
        widgets = {
            'content': forms.Textarea(attrs={
                'rows': 12,
                'cols': 100,
                'style': 'width: 100%; min-height: 250px; font-family: monospace; font-size: 14px; padding: 10px;',
                'placeholder': 'OPTION 1: Enter markdown text here...\n\n# Heading\n## Subheading\n\n**Bold text** *italic*\n\n- List item\n- Another item\n\n[Link](url)'
            }),
        }
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Make sure content field is clearly labeled
        if 'content' in self.fields:
            self.fields['content'].label = "📝 OPTION 1: Text Content (Markdown)"
            self.fields['content'].help_text = "Write your content in Markdown. Use this OR image below. Leave EMPTY if using image."
            self.fields['content'].required = False
        if 'image' in self.fields:
            self.fields['image'].label = "🖼️ OPTION 2: Image"
            self.fields['image'].help_text = "Upload an image file. Use this OR text above. Leave EMPTY if using text content."
        if 'image_alt' in self.fields:
            self.fields['image_alt'].label = "Image Description (Required if image is used)"


class SkinFactContentBlockInline(admin.StackedInline):
    """
    Content blocks - choose EITHER text content OR image for each block
    """
    model = SkinFactContentBlock
    form = SkinFactContentBlockForm
    extra = 1
    fields = (
        "order",
        "content",  # TEXT CONTENT FIELD - appears FIRST
        "image",    # IMAGE FIELD - appears SECOND  
        "image_alt",
    )
    ordering = ("order",)
    show_change_link = False
    verbose_name = "Content Block"
    verbose_name_plural = "Content Blocks"


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


@admin.register(NewsletterSubscriber)
class NewsletterSubscriberAdmin(admin.ModelAdmin):
    list_display = ("email", "source", "subscribed_at")
    search_fields = ("email", "source")
    list_filter = ("source", "subscribed_at")
    ordering = ("-subscribed_at",)
