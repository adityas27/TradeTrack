from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from trade.models import Availability
from django.contrib.auth import get_user_model
from decimal import Decimal

User = get_user_model()  # corrected to use function call

class Leg(models.Model):
    name = models.ForeignKey(Availability, on_delete=models.CASCADE, related_name="legname")
    lots_and_price = models.JSONField(default=list)
    trader = models.ForeignKey(User, on_delete=models.CASCADE, related_name="trader1")
    created_on = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} by {self.trader}"
    
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

class Spreads(models.Model):
    TRADE_OPTIONS = [('long', 'Long'), ('short', 'Short')]
    APPROVAL_STATUSES = [
        ('pending', 'Pending'), 
        ('approved', 'Approved'), 
        ('order_placed', 'Order Placed'), 
        ('fills_received', 'Fills Received'),
        ('partial_fills_received', 'Partial Fills Received')
    ]
    SPREAD_TYPE = [
        ('fly', 'Fly Spread'),
        ('custom', 'Custom'),
        ('dfly', 'Part of DFly')
    ]
    legs = models.ManyToManyField(Leg, related_name="legs_of_spread")
    spread_type = models.CharField(max_length=15, choices=SPREAD_TYPE)
    trade_type = models.CharField(max_length=10, choices=TRADE_OPTIONS)
    status = models.CharField(max_length=25, choices=APPROVAL_STATUSES, default="pending")
    approved_by = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name="approved_spreads")
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
    trader = models.ForeignKey(User, on_delete=models.CASCADE, related_name="trader2")

    def clean(self):
        # Ensure all legs belong to the same trader as this spread.
        counter = 0
        for leg in self.legs.all():
            if counter == 0:
                commodity = self.leg.name.commodity
                counter += 1

            if leg.trader != self.trader:
                raise ValidationError("Creator of Leg and Spread should be same.")
            if leg.name.commodity == commodity:
                raise ValidationError("All the legs should have same commodity")
            
        if self.legs.count() != 2 and self.spread_type == "fly":
            raise ValidationError("Butterfly Spread should have only 2 legs. Neither less nor more.")
        if self.legs.count() < 3 and self.spread_type == "custom":
            raise ValidationError("Custom trades must have 3 or more than 3 legs involved")
        
    def __str__(self):
        return f"Spread {self.id} ({self.spread_type})"

class DFly(models.Model):
    TRADE_OPTIONS = [('long', 'Long'), ('short', 'Short')]
    APPROVAL_STATUSES = [
        ('pending', 'Pending'), 
        ('approved', 'Approved'), 
        ('order_placed', 'Order Placed'), 
        ('fills_received', 'Fills Received'),
        ('partial_fills_received', 'Partial Fills Received')
    ]
    spreads = models.ManyToManyField(Spreads)
    status = models.CharField(max_length=25, choices=APPROVAL_STATUSES, default="pending")
    approved_by = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name="approved_dfly")
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
    trader = models.ForeignKey(User, on_delete=models.CASCADE, related_name="trader3")

    def __str__(self):
        return f"DFly {self.id}"

class SpreadsExit(models.Model):
    EXIT_STATUSES = [
        ('pending', 'Pending Approval'),
        ('approved', 'Approved'),
        ('order_placed', 'Exit Order Placed'),
        ('filled', 'Completely Filled'),
        ('partial_filled', 'Partially Filled'),
        ('rejected', 'Rejected'),
        ('cancelled', 'Cancelled'),
    ]
    spread = models.ForeignKey(Spreads, on_delete=models.CASCADE, related_name='exit_events', help_text="The spread associated with this exit event.")
    requested_exit_lots = models.PositiveIntegerField(help_text="Number of lots requested to be closed in this exit event.")
    exit_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True, help_text="The price at which the exit was executed.")
    received_lots = models.PositiveIntegerField(default=0, help_text="Number of lots actually closed in this exit event.")
    exit_status = models.CharField(max_length=20, choices=EXIT_STATUSES, default='pending', help_text="Current status of this exit request.")
    exit_initiated_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='spreads_exit_requests_initiated', help_text="User who initiated this exit request.")
    exit_approved_by = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name='spreads_exit_requests_approved', help_text="Manager who approved this exit request.")
    requested_at = models.DateTimeField(auto_now_add=True, help_text="When this exit request was created.")
    approved_at = models.DateTimeField(null=True, blank=True, help_text="When this exit request was approved.")
    order_placed_at = models.DateTimeField(null=True, blank=True, help_text="When the exit order was placed with the broker.")
    filled_at = models.DateTimeField(null=True, blank=True, help_text="When the exit was considered filled.")
    profit_loss = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True, help_text="Calculated Profit/Loss for the lots closed in this event.")
    is_closed = models.BooleanField(default=False, help_text="When all the lots are received.")

    class Meta:
        verbose_name = "Spreads Exit"
        verbose_name_plural = "Spreads Exits"
        ordering = ['-requested_at']

    def __str__(self):
        return f"Exit for Spread {self.spread.id} - {self.requested_exit_lots} lots requested at {self.exit_price or 'N/A'}"

class DFlyExit(models.Model):
    EXIT_STATUSES = [
        ('pending', 'Pending Approval'),
        ('approved', 'Approved'),
        ('order_placed', 'Exit Order Placed'),
        ('filled', 'Completely Filled'),
        ('partial_filled', 'Partially Filled'),
        ('rejected', 'Rejected'),
        ('cancelled', 'Cancelled'),
    ]
    dfly = models.ForeignKey(DFly, on_delete=models.CASCADE, related_name='exit_events', help_text="The DFly instance associated with this exit event.")
    requested_exit_lots = models.PositiveIntegerField(help_text="Number of lots requested to be closed in this exit event.")
    exit_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True, help_text="The price at which the exit was executed.")
    received_lots = models.PositiveIntegerField(default=0, help_text="Number of lots actually closed in this exit event.")
    exit_status = models.CharField(max_length=20, choices=EXIT_STATUSES, default='pending', help_text="Current status of this exit request.")
    exit_initiated_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='dfly_exit_requests_initiated', help_text="User who initiated this exit request.")
    exit_approved_by = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name='dfly_exit_requests_approved', help_text="Manager who approved this exit request.")
    requested_at = models.DateTimeField(auto_now_add=True, help_text="When this exit request was created.")
    approved_at = models.DateTimeField(null=True, blank=True, help_text="When this exit request was approved.")
    order_placed_at = models.DateTimeField(null=True, blank=True, help_text="When the exit order was placed with the broker.")
    filled_at = models.DateTimeField(null=True, blank=True, help_text="When the exit was considered filled.")
    profit_loss = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True, help_text="Calculated Profit/Loss for the lots closed in this event.")
    is_closed = models.BooleanField(default=False, help_text="When all the lots are received.")
    
    class Meta:
        verbose_name = "DFly Exit"
        verbose_name_plural = "DFly Exits"
        ordering = ['-requested_at']

    def __str__(self):
        return f"Exit for DFly {self.dfly.id} - {self.requested_exit_lots} lots requested at {self.exit_price or 'N/A'}"

