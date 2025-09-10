from rest_framework import serializers
from django.db.models import Sum
from django.contrib.auth import get_user_model
from .models import Spreads, SpreadsExit

User = get_user_model()

class SpreadsSerializer(serializers.ModelSerializer):
    trader_username = serializers.CharField(source='trader.username', read_only=True)
    approved_by_username = serializers.CharField(source='approved_by.username', read_only=True)
    
    class Meta:
        model = Spreads
        fields = [
            'id',
            'legs',
            'spread_type',
            'trade_type',
            'status',
            'approved_by',
            'created_at',
            'approved_at',
            'order_placed_at',
            'fills_received_at',
            'close_requested_at',
            'is_closed',
            'close_accepted',
            'ratio',
            'avg_price',
            'total_lots',
            'trader',
            'trader_username',
            'approved_by_username',
        ]
        read_only_fields = [
            'created_at', 'approved_at', 'order_placed_at', 'fills_received_at',
            'close_requested_at', 'avg_price', 'total_lots', 'trader_username', 'approved_by_username'
        ]

class SpreadsExitSerializer(serializers.ModelSerializer):
    exit_initiated_by_username = serializers.CharField(source='exit_initiated_by.username', read_only=True)
    exit_approved_by_username = serializers.CharField(source='exit_approved_by.username', read_only=True)
    profit_loss = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)

    class Meta:
        model = SpreadsExit
        fields = [
            'id',
            'spread',
            'requested_exit_lots',
            'exit_price',
            'received_lots',
            'profit_loss',
            'exit_status',
            'exit_initiated_by',
            'exit_approved_by',
            'requested_at',
            'approved_at',
            'order_placed_at',
            'filled_at',
            'is_closed',
            'exit_initiated_by_username',
            'exit_approved_by_username',
        ]
        read_only_fields = [
            'profit_loss', 'exit_initiated_by', 'exit_approved_by', 'requested_at',
            'approved_at', 'order_placed_at', 'filled_at'
        ]

class NestedSpreadsExitSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source='get_exit_status_display', read_only=True)

    class Meta:
        model = SpreadsExit
        fields = ['id', 'requested_exit_lots', 'exit_price', 'received_lots', 'status_display', 'requested_at']

    def to_representation(self, instance):
        representation = super().to_representation(instance)
        ui_status_mapping = {
            'Pending Approval': 'order placed',
            'Approved': 'order placed',
            'Exit Order Placed': 'order placed',
            'Partially Filled': 'partial fills received',
            'Completely Filled': 'fills received',
            'Rejected': 'order placed',
            'Cancelled': 'order placed',
        }
        status_value = representation.pop('status_display', None)
        if status_value:
            representation['status_display'] = ui_status_mapping.get(status_value, status_value)
        representation['date_of_creation'] = representation.pop('requested_at')
        return representation

class SpreadsWithExitsSerializer(serializers.ModelSerializer):
    # Sum of received lots from all related exit events
    received_lots_summary = serializers.SerializerMethodField()
    applied_exits = NestedSpreadsExitSerializer(source='exit_events', many=True, read_only=True)

    class Meta:
        model = Spreads
        fields = ['id', 'created_at', 'total_lots', 'received_lots_summary', 'applied_exits']

    def get_received_lots_summary(self, obj):
        total_received = obj.exit_events.aggregate(total=Sum('received_lots'))['total'] or 0
        total_lots = obj.total_lots or 0
        return f"{total_received}/{total_lots}"