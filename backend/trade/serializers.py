from rest_framework import serializers
from .models import Trade

class TradeSerializer(serializers.ModelSerializer):
    trader_username = serializers.CharField(source='trader.username', read_only=True)
    approved_by_username = serializers.CharField(source='approved_by.username', read_only=True)

    class Meta:
        model = Trade
        fields = '__all__'
        read_only_fields = ['trader', 'approved_by', 'created_at', 'approved_at', 'order_placed_at', 'fills_received_at']
