from rest_framework import serializers
from .models import Trade, Exit
from django.db.models import Sum

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
            'close_requested_at',
            'is_closed',
            'close_accepted',
            'ratio',
            'fills_recivied_for',
            'fills_received_of',
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
            'close_requested_at',
            'trader_username',
            'approved_by_username',
            'display_name',
            'contract_month',
        ]

    def get_display_name(self, obj):
        return f"{obj.name.commodity.code}" if obj.name and obj.name.commodity else "N/A"

    def get_contract_month(self, obj):
        if obj.name and obj.name.start_month and obj.name.end_month:
            start_info = f"{obj.name.start_month.month}{obj.name.start_month.year}"
            end_info = f"{obj.name.end_month.month}{obj.name.end_month.year}"
            return f"{start_info}-{end_info}"
        return "N/A"

class ExitSerializer(serializers.ModelSerializer):
    exit_initiated_by_username = serializers.CharField(source='exit_initiated_by.username', read_only=True)
    exit_approved_by_username = serializers.CharField(source='exit_approved_by.username', read_only=True)

    class Meta:
        model = Exit
        fields = [
            'id', 
            'trade', 
            'requested_exit_lots', 
            'recieved_lots',
            'exit_price', 
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
            'profit_loss', 
            'exit_status',
            'exit_initiated_by_username',
            'exit_approved_by_username',
            'requested_at',
            'approved_at',
            'order_placed_at',
            'filled_at',
        ]

    def validate(self, data):
        # Ensure received_lots do not exceed requested or trade total lots
        trade = data.get('trade') or self.instance.trade
        requested = data.get('requested_exit_lots', getattr(self.instance, 'requested_exit_lots', None))
        received = data.get('recieved_lots', 0)

        if requested and requested > trade.lots:
            raise serializers.ValidationError("Requested exit lots cannot exceed total trade lots.")

        if received and received > requested:
            raise serializers.ValidationError("Received lots cannot exceed requested lots.")

        return data
    
class NestedExitSerializer(serializers.ModelSerializer):
    # Custom field to get the status display name
    status_display = serializers.CharField(source='get_exit_status_display', read_only=True)

    class Meta:
        model = Exit
        fields = ['id','requested_exit_lots', 'exit_price', 'recieved_lots', 'status_display', 'requested_at']

    def to_representation(self, instance):
        representation = super().to_representation(instance)
        
        # Mapping the model's status to the UI's specific labels
        ui_status_mapping = {
            'Pending Approval': 'order placed',
            'Approved': 'order placed',
            'Exit Order Placed': 'order placed',
            'Partially Filled': 'partial fills recieved',
            'Completely Filled': 'fills recieved',
            'Rejected': 'order placed',
            'Cancelled': 'order placed',
        }
        
        # Get the status value, and use .get() to avoid a KeyError if it's missing
        status_value = representation.pop('status_display', None)
        
        # Check if status_value exists before trying to map it
        if status_value:
            representation['status_display'] = ui_status_mapping.get(status_value, status_value)
        
        representation['date_of_creation'] = representation.pop('requested_at')
        
        return representation

class TradeWithExitsSerializer(serializers.ModelSerializer):
    # This serializer represents a single Trade and includes all its exits as a nested list
    
    # We use SerializerMethodField to aggregate lots from all related exits
    recieved_lots_total_lots = serializers.SerializerMethodField()
    
    # We use the NestedExitSerializer with many=True to serialize all related exit events
    applied_exits = NestedExitSerializer(source='exit_events', many=True, read_only=True)
    
    class Meta:
        model = Trade
        fields = ['id', 'created_at', 'lots', 'recieved_lots_total_lots', 'applied_exits']

    def get_recieved_lots_total_lots(self, obj):
        # Calculate the sum of received lots from all exits for this trade
        recieved_lots = obj.exit_events.aggregate(total_recieved_lots=Sum('recieved_lots'))['total_recieved_lots'] or 0
        total_lots = obj.lots
        
        return f"{recieved_lots}/{total_lots}"