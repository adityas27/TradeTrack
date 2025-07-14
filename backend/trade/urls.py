from django.urls import path
from .views import (CreateTradeView, ManagerTradeListView, UserTradeListView, update_trade_status, get_availabilities, update_close, my_trades,
                    pending_close_requests, accept_close, closed_trades)

urlpatterns = [
    path('apply/', CreateTradeView.as_view(), name='apply-trade'),
    path('manager/', ManagerTradeListView.as_view(), name='manager-trades'),
    path('my/', UserTradeListView.as_view(), name='user-trades'),
    path("trades/<int:trade_id>/update-status/", update_trade_status, name="update-trade-status"),
    path("availabilities/", get_availabilities, name="get_availabilities"),
    path("trades/<int:trade_id>/close/", update_close, name="update-close"),
    path("trades/my/", my_trades, name="my-trades"),
    path("trades/close-requests/", pending_close_requests, name="pending-close-requests"),
    path("trades/<int:trade_id>/accept-close/", accept_close, name="accept-close"),
    path("trades/closed/", closed_trades, name="closed-trades"),

]
