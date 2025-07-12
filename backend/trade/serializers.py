from rest_framework import serializers
from .models import Trade

class TradeSerializer(serializers.ModelSerializer):
    trader_username = serializers.CharField(source='trader.username', read_only=True)
    approved_by_username = serializers.CharField(source='approved_by.username', read_only=True)
    display_name = serializers.SerializerMethodField()
    contract_month = serializers.SerializerMethodField()

    class Meta:
        model = Trade
        fields = [
            'id',
            'name',                # FK to Availability
            'trade_type',
            'lots',
            'price',
            'stop_loss',
            'trader',
            'status',
            'approved_by',
            'created_at',
            'approved_at',
            'order_placed_at',
            'fills_received_at',

            # Custom added fields:
            'trader_username',
            'approved_by_username',
            'display_name',
            'contract_month',
        ]
        read_only_fields = [
            'trader',
            'approved_by',
            'created_at',
            'approved_at',
            'order_placed_at',
            'fills_received_at',
            'trader_username',
            'approved_by_username',
            'display_name',
            'contract_month',
        ]

    def get_display_name(self, obj):
        return f"{obj.name.commodity.code}" if obj.name and obj.name.commodity else "N/A"

    def get_contract_month(self, obj):
        return obj.name.contract_month.label if obj.name and obj.name.contract_month else "N/A"

