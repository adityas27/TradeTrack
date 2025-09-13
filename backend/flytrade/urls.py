from django.urls import path
from . import views

urlpatterns = [
    # Leg endpoints
    path('legs/create/', views.create_leg, name='create_leg'),
    path('legs/<int:leg_id>/add-lots/', views.add_lots_to_leg, name='add_lots_to_leg'),
    path('legs/my/', views.my_legs, name='my_legs'),

    # Spreads endpoints
    path('spreads/create/', views.create_spread, name='create_spread'),
    path('spreads/manager/', views.ManagerSpreadListView.as_view(), name='manager_spread_list'),
    path('spreads/my/', views.my_spreads, name='my_spreads'),
    path('spreads/<int:spread_id>/update-status/', views.update_spread_status, name='update_spread_status'),
    path('spreads/<int:spread_id>/update-fills/', views.update_spread_fills, name='update_spread_fills'),
    path('spreads/<int:spread_id>/request-close/', views.update_spread_close, name='update_spread_close'),

    # Spreads exit endpoints
    path('spreads/exits/create/', views.create_spread_exit, name='create_spread_exit'),
    path('spreads/exits/my/', views.my_spread_exit_requests, name='my_spread_exit_requests'),
    path('spreads/exits/all/', views.all_spread_exit_requests, name='all_spread_exit_requests'),
    path('spreads/exits/<int:exit_id>/update-status/', views.update_spread_exit_status, name='update_spread_exit_status'),

    # Manager close request endpoints
    path('spreads/pending-close/', views.pending_spread_close_requests, name='pending_spread_close_requests'),
    path('spreads/<int:spread_id>/accept-close/', views.accept_spread_close, name='accept_spread_close'),
    path('spreads/closed/', views.closed_spreads, name='closed_spreads'),
]