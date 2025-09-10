from django.urls import path
from .views import (
    create_spread,
    create_spreads_exit,
    ManagerSpreadsListView,
    UserSpreadsListView,
    spreads_with_exits,
)

urlpatterns = [
    path('spreads/create/', create_spread, name='create-spread'),
    path('spreads/exit/', create_spreads_exit, name='create-spreads-exit'),
    path('spreads/manager/', ManagerSpreadsListView.as_view(), name='manager-spreads'),
    path('spreads/my/', UserSpreadsListView.as_view(), name='user-spreads'),
    path('spreads/with-exits/', spreads_with_exits, name='spreads-with-exits'),
]