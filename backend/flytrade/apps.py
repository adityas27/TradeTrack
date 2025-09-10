from django.apps import AppConfig


class FlytradeConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'flytrade'

    def ready(self):
        import trade.signals