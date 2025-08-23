from django.contrib import admin
from .models import Trade, Commodity, Availability, Exit, Settlement
from django.contrib.auth import get_user_model

User = get_user_model()

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
    list_display = ("id", "name", "trade_type", "trader", "status", "avg_price", "total_lots", "created_at", "is_closed")
    list_filter = ("trade_type", "status", "is_closed")
    search_fields = ("id", "trader__username", "ame__id")
    ordering = ("-created_at",)
    readonly_fields = ("avg_price", "total_lots", "created_at", "approved_at", "order_placed_at", "fills_received_at")

    autocomplete_fields = ("trader", "approved_by", "name")
    readonly_fields = ("avg_price", "total_lots")
    # exclude = ("lots_and_price",)

    # Slim the queryset for approved_by to staff only
    def formfield_for_foreignkey(self, db_field, request, **kwargs):
        if db_field.name == "approved_by":
            kwargs["queryset"] = User.objects.filter(is_staff=True)
        if db_field.name == "trader":
            # Example: skip banned/disabled users if you have that field
            kwargs.setdefault("queryset", User.objects.all())
        return super().formfield_for_foreignkey(db_field, request, **kwargs)