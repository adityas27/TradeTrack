from django.contrib import admin
from .models import Trade

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
