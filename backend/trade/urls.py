from django.urls import path
from .views import CreateTradeView, ManagerTradeListView, UserTradeListView, update_trade_status

urlpatterns = [
    path('apply/', CreateTradeView.as_view(), name='apply-trade'),
    path('manager/', ManagerTradeListView.as_view(), name='manager-trades'),
    path('my/', UserTradeListView.as_view(), name='user-trades'),
    path("trades/<int:trade_id>/update-status/", update_trade_status, name="update-trade-status"),
]
