import os
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
from django.core.asgi import get_asgi_application
import trade.routing

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'trade_project.settings')

application = ProtocolTypeRouter({
    "http": get_asgi_application(),
    "websocket": AuthMiddlewareStack(
        URLRouter(
            trade.routing.websocket_urlpatterns
        )
    ),
})
