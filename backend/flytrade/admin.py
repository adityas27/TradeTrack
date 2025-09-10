from django.contrib import admin
from .models import Spreads, SpreadsExit, Leg

@admin.register(Leg)
class LegAdmin(admin.ModelAdmin):
    autocomplete_fields = ("trader", "name")


@admin.register(Spreads)
class SpreadsAdmin(admin.ModelAdmin):
    list_display = ('id', 'spread_type', 'trade_type', 'status', 'avg_price', 'total_lots', 'trader', 'created_at')
    list_filter = ('spread_type', 'status')
    search_fields = ('id', 'trader__username')

@admin.register(SpreadsExit)
class SpreadsExitAdmin(admin.ModelAdmin):
    list_display = ('id', 'spread', 'requested_exit_lots', 'exit_price', 'received_lots', 'exit_status', 'requested_at')
    list_filter = ('exit_status',)
    search_fields = ('spread__id',)
