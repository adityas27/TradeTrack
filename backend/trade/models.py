from django.db import models
from django.contrib.auth import get_user_model
from decimal import Decimal
from django.conf import settings
from django.contrib.postgres.fields import JSONField
from django.core.exceptions import ValidationError

User = get_user_model()

class Commodity(models.Model):
    code = models.CharField(max_length=20, unique=True)
    name = models.CharField(max_length=100, blank=True)
    description = models.TextField(blank=True, null=True)

    def __str__(self):
        return self.code

class Settlement(models.Model):
    commodity = models.ForeignKey(Commodity, on_delete=models.CASCADE, related_name='settlements')
    settlement_price = models.DecimalField(max_digits=10, decimal_places=2)
    month = models.CharField(max_length=20)  # E.g. "Jan25"
    year = models.IntegerField()  # E.g. 2025

    def __str__(self):
        return f"{self.commodity.code} - {self.month}{self.year} @ {self.settlement_price}"

class Availability(models.Model):
    commodity = models.ForeignKey(Commodity, on_delete=models.CASCADE)
    start_month = models.ForeignKey(Settlement, on_delete=models.CASCADE, related_name="start", default=None, null=True)
    end_month = models.ForeignKey(Settlement, on_delete=models.CASCADE, related_name="end", default=None, null=True)
    settlement_price = models.FloatField(default=0)
    is_available = models.BooleanField()

    def __str__(self):
        start_info = f"{self.start_month.month}{self.start_month.year}" if self.start_month else "N/A"
        end_info = f"{self.end_month.month}{self.end_month.year}" if self.end_month else "N/A"
        return f"{self.commodity.code}-({start_info} - {end_info})"

class Trade(models.Model):
    TRADE_OPTIONS = [('long', 'Long'), ('short', 'Short')]
    APPROVAL_STATUSES = [
        ('pending', 'Pending'), 
        ('approved', 'Approved'), 
        ('order_placed', 'Order Placed'), 
        ('fills_received', 'Fills Received'),
        ('partial_fills_received', 'Partial Fills Received')
    ]
    # Details
    name = models.ForeignKey("Availability", on_delete=models.CASCADE, related_name="trades")
    trade_type = models.CharField(max_length=10, choices=TRADE_OPTIONS)
    lots_and_price = models.JSONField(default=list)
    # stop_loss = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    trader = models.ForeignKey(User, on_delete=models.CASCADE, related_name="trades")
    status = models.CharField(max_length=25, choices=APPROVAL_STATUSES, default="pending")
    approved_by = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name="approved_trades")
    created_at = models.DateTimeField(auto_now_add=True)
    approved_at = models.DateTimeField(null=True, blank=True)
    order_placed_at = models.DateTimeField(null=True, blank=True)
    fills_received_at = models.DateTimeField(null=True, blank=True)
    close_requested_at = models.DateTimeField(null=True, blank=True)
    is_closed = models.BooleanField(default=False)
    close_accepted = models.BooleanField(default=False)
    ratio = models.DecimalField(max_digits=10, decimal_places=2, default=100.00)
    avg_price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total_lots = models.IntegerField(default=0)

    def __str__(self):
        return f"Trade {self.id} - {self.name} ({self.trade_type})"

    def clean(self):
        if not isinstance(self.lots_and_price, list):
            raise ValidationError("lots_and_price must be a list of dicts.")
        for entry in self.lots_and_price:
            required_keys = ["lots", "price", "added_at", "fills_received", "stop_loss"]
            for key in required_keys:
                if key not in entry:
                    raise ValidationError(f"Each entry must include '{key}'.")
            if not isinstance(entry["lots"], int) or entry["lots"] <= 0:
                raise ValidationError("'lots' must be a positive integer.")
            if not isinstance(entry["price"], (int, float)):
                raise ValidationError("'price' must be numeric.")
            if not isinstance(entry["fills_received"], int) or entry["fills_received"] < 0:
                raise ValidationError("'fills_received' must be a non-negative integer.")
            if not isinstance(entry["stop_loss"], (int, float)):
                raise ValidationError("'stop_loss' must be numeric.")

    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        
        # self._original_fills_recivied_for = self.fills_recivied_for



class Exit(models.Model):
    EXIT_STATUSES = [
        ('pending', 'Pending Approval'),
        ('approved', 'Approved'),
        ('order_placed', 'Exit Order Placed'),
        ('filled', 'Completely Filled'),
        ('partial_filled', 'Partially Filled'),
        ('rejected', 'Rejected'),
        ('cancelled', 'Cancelled'),
    ]

    trade = models.ForeignKey(
        Trade, 
        on_delete=models.CASCADE, 
        related_name='exits',
        help_text="The trade associated with this exit event."
    )
    
    # The number of lots the user requested to close in this specific exit event
    requested_exit_lots = models.PositiveIntegerField(
        help_text="Number of lots requested to be closed in this exit event."
    )
    
    # The price at which the exit was executed
    exit_price = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        null=True, blank=True, # Can be null if not yet filled
        help_text="The price at which the exit was executed."
    )
    recieved_lots = models.PositiveIntegerField(
        default=0,
        help_text="Number of lots actually closed in this exit event."
    )
    exit_status = models.CharField(
        max_length=20, 
        choices=EXIT_STATUSES, 
        default='pending',
        help_text="Current status of this exit request."
    )

    exit_initiated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        related_name='exit_requests_initiated',
        help_text="User who initiated this exit request."
    )
    
    exit_approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        null=True, blank=True, 
        on_delete=models.SET_NULL, 
        related_name='exit_requests_approved',
        help_text="Manager who approved this exit request."
    )

    # Timestamps for the exit event lifecycle
    requested_at = models.DateTimeField(
        auto_now_add=True, 
        help_text="When this exit request was created."
    )
    approved_at = models.DateTimeField(
        null=True, blank=True, 
        help_text="When this exit request was approved."
    )
    order_placed_at = models.DateTimeField(
        null=True, blank=True, 
        help_text="When the exit order was placed with the broker."
    )
    filled_at = models.DateTimeField(
        null=True, blank=True, 
        help_text="When the exit was considered filled."
    )
    
    # Optional: To store calculated P&L for this specific exit event
    profit_loss = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        null=True, blank=True,
        help_text="Calculated Profit/Loss for the lots closed in this event."
    )
    
    is_closed = models.BooleanField(default=False, help_text="When all the lots are receieved.")

    class Meta:
        verbose_name = "Trade Exit"
        verbose_name_plural = "Trade Exits"
        ordering = ['-requested_at']

    def __str__(self):
        return (
            f"Exit for Trade {self.trade.id} ({self.trade.name}) - "
            f"{self.requested_exit_lots} lots requested at {self.exit_price or 'N/A'}"
        )
