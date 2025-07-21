from rest_framework import serializers
from .models import Trade, Profit

class TradeSerializer(serializers.ModelSerializer):
    trader_username = serializers.CharField(source='trader.username', read_only=True)
    approved_by_username = serializers.CharField(source='approved_by.username', read_only=True)
    display_name = serializers.SerializerMethodField()
    contract_month = serializers.SerializerMethodField()
    profit = serializers.SerializerMethodField()

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
            'is_closed',
            'ratio',
            # Custom added fields:
            'trader_username',
            'approved_by_username',
            'display_name',
            'contract_month',
            'profit',             # Latest Profit record
            'fills_recivied_for',
            'fills_received_of',
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
            'profit',
        ]

    def get_display_name(self, obj):
        return f"{obj.name.commodity.code}" if obj.name and obj.name.commodity else "N/A"

    def get_contract_month(self, obj):
        return obj.name.contract_month.label if obj.name and obj.name.contract_month else "N/A"
    
    def get_profit(self, obj):
        return ProfitSerializer(obj.profits.first()).data if obj.profits.exists() else None

class ProfitSerializer(serializers.ModelSerializer):
    trade_name = serializers.CharField(source='trade.name', read_only=True)

    class Meta:
        model = Profit
        fields = [
            'id', 'trade', 'trade_name', 'entry', 'booked_lots', 'unbooked_lots', 
            'exit_price', 'settlement_price_unbooked', 'profit', 
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'trade_name', 'created_at', 'updated_at', 'profit']