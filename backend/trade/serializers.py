from rest_framework import serializers
from django.db.models import Sum
from django.contrib.auth import get_user_model

from .models import Trade, Exit, Availability

User = get_user_model()


class AvailabilitySerializer(serializers.ModelSerializer):
    commodity_code = serializers.CharField(source='commodity.code', read_only=True)
    commodity_name = serializers.CharField(source='commodity.name', read_only=True)
    period_display = serializers.SerializerMethodField()

    class Meta:
        model = Availability
        fields = [
            'id',
            'commodity_code',
            'commodity_name',
            'start_month',
            'end_month',
            'settlement_price',
            'is_available',
            'period_display',
        ]
        read_only_fields = fields

    def get_period_display(self, obj):
        if obj.start_month and obj.end_month:
            return f"{obj.start_month.month}{obj.start_month.year} to {obj.end_month.month}{obj.end_month.year}"
        return "N/A"


class TradeSerializer(serializers.ModelSerializer):
    trader_username = serializers.CharField(source='trader.username', read_only=True)
    approved_by_username = serializers.CharField(source='approved_by.username', read_only=True)
    display_name = serializers.SerializerMethodField()
    contract_month = serializers.SerializerMethodField()
    avg_price = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    total_lots = serializers.IntegerField(read_only=True)

    class Meta:
        model = Trade
        fields = [
            'id',
            'name',                # FK Availability
            'trade_type',
            'lots_and_price',      # list of dict entries
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
            'avg_price',
            'total_lots',

            # convenience fields
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
            'avg_price',
            'total_lots',
            'trader_username',
            'approved_by_username',
            'display_name',
            'contract_month',
        ]

    def get_display_name(self, obj):
        try:
            return f"{obj.name.commodity.code}"
        except Exception:
            return "N/A"

    def get_contract_month(self, obj):
        try:
            if obj.name and obj.name.start_month and obj.name.end_month:
                s = obj.name.start_month
                e = obj.name.end_month
                return f"{s.month}{s.year}-{e.month}{e.year}"
        except Exception:
            pass
        return "N/A"

    def validate_lots_and_price(self, value):
        if not isinstance(value, list):
            raise serializers.ValidationError("lots_and_price must be a list of dicts.")
        for idx, entry in enumerate(value):
            for key in ["lots", "price", "added_at", "fills_received", "stop_loss"]:
                if key not in entry:
                    raise serializers.ValidationError(f"Entry {idx}: missing '{key}'.")
            if not isinstance(entry["lots"], int) or entry["lots"] <= 0:
                raise serializers.ValidationError(f"Entry {idx}: 'lots' must be positive int.")
            if not isinstance(entry["price"], (int, float)):
                raise serializers.ValidationError(f"Entry {idx}: 'price' must be numeric.")
            if not isinstance(entry["fills_received"], int) or entry["fills_received"] < 0:
                raise serializers.ValidationError(f"Entry {idx}: 'fills_received' must be non-negative int.")
            if not isinstance(entry["stop_loss"], (int, float)):
                raise serializers.ValidationError(f"Entry {idx}: 'stop_loss' must be numeric.")
        return value

    def create(self, validated_data):
        validated_data['trader'] = self.context['request'].user
        return super().create(validated_data)


class ExitSerializer(serializers.ModelSerializer):
    exit_initiated_by_username = serializers.CharField(source='exit_initiated_by.username', read_only=True)
    exit_approved_by_username = serializers.CharField(source='exit_approved_by.username', read_only=True)
    profit_loss = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)

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
            'exit_initiated_by',
            'exit_approved_by',
            'requested_at',
            'approved_at',
            'order_placed_at',
            'filled_at',
        ]

    def validate(self, data):
        trade = data.get('trade') or getattr(self.instance, 'trade', None)
        requested = data.get('requested_exit_lots', getattr(self.instance, 'requested_exit_lots', None))
        received = data.get('recieved_lots', getattr(self.instance, 'recieved_lots', 0))

        if trade is None:
            raise serializers.ValidationError("Trade is required.")

        # Cannot request more than trade total_lots (computed)
        if requested is not None and trade.total_lots is not None and requested > trade.total_lots:
            raise serializers.ValidationError("Requested exit lots cannot exceed trade total lots.")

        if received is not None and requested is not None and received > requested:
            raise serializers.ValidationError("Received lots cannot exceed requested lots.")

        return data


class NestedExitSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source='get_exit_status_display', read_only=True)

    class Meta:
        model = Exit
        fields = ['id', 'requested_exit_lots', 'exit_price', 'recieved_lots', 'status_display', 'requested_at']

    def to_representation(self, instance):
        representation = super().to_representation(instance)
        ui_status_mapping = {
            'Pending Approval': 'order placed',
            'Approved': 'order placed',
            'Exit Order Placed': 'order placed',
            'Partially Filled': 'partial fills recieved',
            'Completely Filled': 'fills recieved',
            'Rejected': 'order placed',
            'Cancelled': 'order placed',
        }
        status_value = representation.pop('status_display', None)
        if status_value:
            representation['status_display'] = ui_status_mapping.get(status_value, status_value)
        representation['date_of_creation'] = representation.pop('requested_at')
        return representation


class TradeWithExitsSerializer(serializers.ModelSerializer):
    # Sum recieved_lots from all related exits
    recieved_lots_total_lots = serializers.SerializerMethodField()
    # Use correct related_name 'exits'
    applied_exits = NestedExitSerializer(source='exits', many=True, read_only=True)

    class Meta:
        model = Trade
        fields = ['id', 'created_at', 'total_lots', 'recieved_lots_total_lots', 'applied_exits']

    def get_recieved_lots_total_lots(self, obj):
        recieved_lots = obj.exits.aggregate(total_recieved_lots=Sum('recieved_lots'))['total_recieved_lots'] or 0
        total_lots = obj.total_lots or 0
        return f"{recieved_lots}/{total_lots}"
