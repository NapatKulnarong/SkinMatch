from django.apps import AppConfig


class CoreConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'core'

    def ready(self):
        # connect signals
        from . import signals  # noqa: F401
        from . import security_signals  # noqa: F401
