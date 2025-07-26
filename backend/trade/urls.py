from django.urls import path
from .views import (CreateTradeView, ManagerTradeListView, UserTradeListView, update_trade_status, get_availabilities, update_close, my_trades, set_settlement_price,
                    pending_close_requests, accept_close, closed_trades, create_profit, update_profit
                    , create_exit, update_exit_status, my_exit_requests)

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
    path('trades/<int:pk>/set_settlement/', set_settlement_price, name='set-settlement'),
    path('trades/<int:trade_id>/profits/create/', create_profit, name='profit_create_fbv'),
    path('profits/<int:pk>/update/', update_profit, name='profit_update_fbv'),
    path('exits/', create_exit, name='create-exit-request'),
    path('exits/<int:exit_id>/update/', update_exit_status, name='update-exit-status'),
    path('exits/my/', my_exit_requests, name='my-exits'),
]
