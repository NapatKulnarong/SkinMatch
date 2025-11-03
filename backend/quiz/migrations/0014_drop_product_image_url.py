from django.db import migrations


def copy_image_url_to_image(apps, schema_editor):
    Product = apps.get_model("quiz", "Product")
    for product in Product.objects.all():
        image = (product.image or "").strip()
        image_url = getattr(product, "image_url", "") or ""
        if not image and image_url:
            product.image = image_url
            product.save(update_fields=["image"])


class Migration(migrations.Migration):

    dependencies = [
        ("quiz", "0013_add_ingredient_detail_fields"),
    ]

    operations = [
        migrations.RunPython(copy_image_url_to_image, migrations.RunPython.noop),
        migrations.RemoveField(
            model_name="product",
            name="image_url",
        ),
    ]
