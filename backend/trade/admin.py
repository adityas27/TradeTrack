from django.contrib import admin
from .models import Trade
from .models import Commodity, ContractMonth, Availability

@admin.register(Commodity)
class CommodityAdmin(admin.ModelAdmin):
    list_display = ('code', 'name')
    search_fields = ('code', 'name')
    ordering = ('code',)


@admin.register(ContractMonth)
class ContractMonthAdmin(admin.ModelAdmin):
    list_display = ('label', 'start_month', 'start_year', 'end_month', 'end_year')
    search_fields = ('label',)
    list_filter = ('start_year', 'end_year')
    ordering = ('start_year', 'start_month')


@admin.register(Availability)
class AvailabilityAdmin(admin.ModelAdmin):
    list_display = ('contract_month', 'commodity', 'is_available')
    list_filter = ('contract_month', 'commodity', 'is_available')
    search_fields = ('contract_month__label', 'commodity__code')
    ordering = ('contract_month__start_year', 'contract_month__start_month', 'commodity__code')

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
    )
    list_filter = ('status', 'trade_type', 'trader')
    search_fields = ('name', 'trader__username')
    readonly_fields = (
        'created_at',
        'approved_at',
        'order_placed_at',
        'fills_received_at',
    )
    ordering = ('-created_at',)

