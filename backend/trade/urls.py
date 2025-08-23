from django.urls import path
from .views import (create_trade, ManagerTradeListView, UserTradeListView, update_trade_status, update_trade_fills, get_availabilities, update_close, my_trades,
                    pending_close_requests, accept_close, closed_trades,
                    create_exit, update_exit_status, my_exit_requests, all_exit_requests, add_lots_to_trade)

urlpatterns = [
    path('apply/', create_trade, name='apply-trade'), # working fine one 2308
    path('manager/', ManagerTradeListView.as_view(), name='manager-trades'), # working fine on 2308
    path('my/', UserTradeListView.as_view(), name='user-trades'), # working fine on 2308
    path("trades/<int:trade_id>/update-status/", update_trade_status, name="update-trade-status"), # working fine on 2308
    path("trades/<int:trade_id>/update-fills/", update_trade_fills, name="update-fills-received"), # not working fine on 2308
    path("availabilities/", get_availabilities, name="get_availabilities"), # working fine on 2308
    path("trades/<int:trade_id>/close/", update_close, name="update-close"),
    path("trades/my/", my_trades, name="my-trades"),
    path("trades/close-requests/", pending_close_requests, name="pending-close-requests"),
    path("trades/<int:trade_id>/accept-close/", accept_close, name="accept-close"),
    path("trades/closed/", closed_trades, name="closed-trades"),
    path('exits/', create_exit, name='create-exit-request'),
    path('exits/<int:exit_id>/update/', update_exit_status, name='update-exit-status'),
    path('exits/my/', my_exit_requests, name='my-exits'),
    path('exits/all/', all_exit_requests, name='all-exits'),
    path('trade/<int:trade_id>/add-lots/', add_lots_to_trade, name='add_lots_to_trade'),
]
