from decimal import Decimal
from rest_framework import serializers
from django.utils.timezone import now
from .models import Leg, Spreads, SpreadsExit, Availability
from django.contrib.auth import get_user_model

User = get_user_model()

class LegSerializer(serializers.ModelSerializer):
    """Serializer for Leg model with nested availability info"""
    
    # Read-only fields for display
    availability_display = serializers.SerializerMethodField()
    commodity_code = serializers.SerializerMethodField()
    commodity_name = serializers.SerializerMethodField()
    
    class Meta:
        model = Leg
        fields = [
            'id', 'name', 'lots_and_price', 'trader', 'created_on',
            'availability_display', 'commodity_code', 'commodity_name'
        ]
        read_only_fields = ['id', 'trader', 'created_on']
    
    def get_availability_display(self, obj):
        if obj.name:
            return {
                'id': obj.name.id,
                'commodity_code': obj.name.commodity.code,
                'commodity_name': obj.name.commodity.name,
                'period_display': f"{obj.name.start_month.month}{obj.name.start_month.year} to {obj.name.end_month.month}{obj.name.end_month.year}" if obj.name.start_month and obj.name.end_month else "N/A",
                'settlement_price': obj.name.settlement_price
            }
        return None
    
    def get_commodity_code(self, obj):
        return obj.name.commodity.code if obj.name else None
    
    def get_commodity_name(self, obj):
        return obj.name.commodity.name if obj.name else None
    
    def validate_lots_and_price(self, value):
        """Validate lots_and_price JSONField structure"""
        if not isinstance(value, list):
            raise serializers.ValidationError("lots_and_price must be a list of entries.")
        
        for entry in value:
            required_keys = ["lots", "price", "added_at", "fills_received", "stop_loss"]
            for key in required_keys:
                if key not in entry:
                    raise serializers.ValidationError(f"Each entry must include '{key}'.")
            
            if not isinstance(entry["lots"], int) or entry["lots"] <= 0:
                raise serializers.ValidationError("'lots' must be a positive integer.")
            
            if not isinstance(entry["price"], (int, float)) or entry["price"] <= 0:
                raise serializers.ValidationError("'price' must be a positive number.")
            
            if not isinstance(entry["fills_received"], int) or entry["fills_received"] < 0:
                raise serializers.ValidationError("'fills_received' must be a non-negative integer.")
            
            if not isinstance(entry["stop_loss"], (int, float)):
                raise serializers.ValidationError("'stop_loss' must be numeric.")
        
        return value

class SpreadsSerializer(serializers.ModelSerializer):
    """Serializer for Spreads with nested legs"""
    
    legs = LegSerializer(many=True, read_only=True)
    leg_ids = serializers.ListField(
        child=serializers.IntegerField(),
        write_only=True,
        required=False,
        help_text="List of leg IDs to associate with this spread"
    )
    
    # Display fields
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    spread_type_display = serializers.CharField(source='get_spread_type_display', read_only=True)
    trade_type_display = serializers.CharField(source='get_trade_type_display', read_only=True)
    approved_by_name = serializers.CharField(source='approved_by.username', read_only=True)
    trader_name = serializers.CharField(source='trader.username', read_only=True)
    
    class Meta:
        model = Spreads
        fields = [
            'id', 'legs', 'leg_ids', 'spread_type', 'trade_type', 'status',
            'approved_by', 'created_at', 'approved_at', 'order_placed_at',
            'fills_received_at', 'close_requested_at', 'is_closed',
            'close_accepted', 'ratio', 'avg_price', 'total_lots', 'trader',
            'status_display', 'spread_type_display', 'trade_type_display',
            'approved_by_name', 'trader_name'
        ]
        read_only_fields = [
            'id', 'approved_by', 'created_at', 'approved_at', 'order_placed_at',
            'fills_received_at', 'close_requested_at', 'trader'
        ]
    
    def create(self, validated_data):
        leg_ids = validated_data.pop('leg_ids', [])
        spread = super().create(validated_data)
        
        if leg_ids:
            # Get legs and validate they belong to the same trader
            legs = Leg.objects.filter(id__in=leg_ids, trader=spread.trader)
            if legs.count() != len(leg_ids):
                raise serializers.ValidationError("Some legs not found or don't belong to you.")
            spread.legs.set(legs)
        
        return spread
    
    def update(self, instance, validated_data):
        leg_ids = validated_data.pop('leg_ids', None)
        spread = super().update(instance, validated_data)
        
        if leg_ids is not None:
            legs = Leg.objects.filter(id__in=leg_ids, trader=spread.trader)
            if legs.count() != len(leg_ids):
                raise serializers.ValidationError("Some legs not found or don't belong to you.")
            spread.legs.set(legs)
        
        return spread
    
    def validate(self, data):
        """Custom validation for spread rules"""
        spread_type = data.get('spread_type') or getattr(self.instance, 'spread_type', None)
        leg_ids = data.get('leg_ids', [])
        
        # If updating, get current leg count if leg_ids not provided
        if not leg_ids and self.instance:
            leg_count = self.instance.legs.count()
        else:
            leg_count = len(leg_ids)
        
        # Validate leg count based on spread type
        if spread_type == 'fly' and leg_count != 2:
            raise serializers.ValidationError("Butterfly spread must have exactly 2 legs.")
        elif spread_type == 'custom' and leg_count < 3:
            raise serializers.ValidationError("Custom spread must have 3 or more legs.")
        
        return data

class SpreadsExitSerializer(serializers.ModelSerializer):
    """Serializer for Spreads Exit requests"""
    
    # Display fields
    exit_status_display = serializers.CharField(source='get_exit_status_display', read_only=True)
    spread_display = serializers.CharField(source='spread.__str__', read_only=True)
    initiated_by_name = serializers.CharField(source='exit_initiated_by.username', read_only=True)
    approved_by_name = serializers.CharField(source='exit_approved_by.username', read_only=True)
    
    class Meta:
        model = SpreadsExit
        fields = [
            'id', 'spread', 'requested_exit_lots', 'exit_price', 'received_lots',
            'exit_status', 'exit_initiated_by', 'exit_approved_by', 'requested_at',
            'approved_at', 'order_placed_at', 'filled_at', 'profit_loss', 'is_closed',
            'exit_status_display', 'spread_display', 'initiated_by_name', 'approved_by_name'
        ]
        read_only_fields = [
            'id', 'exit_initiated_by', 'exit_approved_by', 'requested_at',
            'approved_at', 'order_placed_at', 'filled_at', 'is_closed'
        ]
    
    def validate_requested_exit_lots(self, value):
        if value <= 0:
            raise serializers.ValidationError("Requested exit lots must be positive.")
        return value
    
    def validate_exit_price(self, value):
        if value is not None and value <= 0:
            raise serializers.ValidationError("Exit price must be positive.")
        return value

class SpreadsWithExitsSerializer(serializers.ModelSerializer):
    """Serializer for Spreads with nested exit information"""
    
    legs = LegSerializer(many=True, read_only=True)
    exit_events = SpreadsExitSerializer(many=True, read_only=True)
    
    # Display fields
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    spread_type_display = serializers.CharField(source='get_spread_type_display', read_only=True)
    trade_type_display = serializers.CharField(source='get_trade_type_display', read_only=True)
    trader_name = serializers.CharField(source='trader.username', read_only=True)
    
    class Meta:
        model = Spreads
        fields = [
            'id', 'legs', 'exit_events', 'spread_type', 'trade_type', 'status',
            'created_at', 'ratio', 'avg_price', 'total_lots', 'is_closed',
            'status_display', 'spread_type_display', 'trade_type_display', 'trader_name'
        ]