from django.contrib import admin
from .models import Trade, Commodity, Availability, Exit, Settlement

# Register your models here.
admin.site.register(Exit)

@admin.register(Settlement)
class SettlementAdmin(admin.ModelAdmin):
    list_display = ('commodity', 'month', 'year', 'settlement_price')
    list_filter = ('month', 'year', 'commodity__name')
    list_editable = ('settlement_price',)
    search_fields = (
        'commodity__code',
        'month',
        'year',
    )
    raw_id_fields = ('commodity',)

@admin.register(Commodity)
class CommodityAdmin(admin.ModelAdmin):
    list_display = ('code', 'name')
    search_fields = ('code', 'name')
    ordering = ('code',)

@admin.register(Availability)
class AvailabilityAdmin(admin.ModelAdmin):
    list_display = ('commodity', 'start_month', 'end_month', 'is_available', 'settlement_price')
    list_filter = ('is_available', 'commodity')
    search_fields = ('commodity__code', 'commodity__name')
    ordering = ('commodity__code',)

@admin.register(Trade)
class TradeAdmin(admin.ModelAdmin):
    list_display = (
        'id',
        'name',
        'trade_type',
        'lots',
        'price',
        'stop_loss',
        'status',
        'trader',
        'created_at',
        'approved_at',
        'order_placed_at',
        'fills_received_at',
        'is_closed',
        'close_accepted',
    )
    list_filter = ('status', 'trade_type', 'trader', 'is_closed', 'close_accepted')
    search_fields = ('name__commodity__code', 'trader__username')
    readonly_fields = (
        'created_at',
        'approved_at',
        'order_placed_at',
        'fills_received_at',
        'close_requested_at',
    )
    ordering = ('-created_at',)

