from django.db import models
from django.contrib.auth import get_user_model
from decimal import Decimal
from django.conf import settings

User = get_user_model()

class Commodity(models.Model):
    code = models.CharField(max_length=20, unique=True)
    name = models.CharField(max_length=100, blank=True)
    description = models.TextField(blank=True, null=True)

    def __str__(self):
        return self.code

class ContractMonth(models.Model):
    """
    Model to store month pairs, a script will be triggered to create these one month prior to start of new year.  
    Eg. if Jan25-Feb25 to Dec25-Jan26 exists, then the script will create Jan26-Feb26 to Dec26-Jan27 in December 2025
    """
    label = models.CharField(max_length=20, unique=True)  # E.g. "Jan25-Feb25"
    start_month = models.CharField(max_length=3)          # "Jan"
    end_month = models.CharField(max_length=3)            # "Feb"
    start_year = models.IntegerField()                    # 2025
    end_year = models.IntegerField()                      # 2025 or 2026

    def __str__(self):
        return self.label

class Settlement(models.Model):
    commodity = models.ForeignKey(Commodity, on_delete=models.CASCADE, related_name='settlements')
    settlement_price = models.DecimalField(max_digits=10, decimal_places=2)
    month = models.CharField(max_length=20)  # E.g. "Jan25"
    year = models.IntegerField()  # E.g. 2025

class Availability(models.Model):
    commodity = models.ForeignKey(Commodity, on_delete=models.CASCADE)
    start_month = models.ForeignKey(Settlement, on_delete=models.CASCADE, related_name="start", default=None, null=True)
    end_month = models.ForeignKey(Settlement, on_delete=models.CASCADE, related_name="end", default=None, null=True)
    settlement_price = models.FloatField(default=0)
    is_available = models.BooleanField()

    def __str__(self):
        return f"{self.commodity.code}-({self.start_month.month} {self.start_month.year} - {self.end_month.month} {self.end_month.year})"

    # class Meta:
    #     unique_together = ('contract_month', 'commodity')

    


class Trade(models.Model):
    TRADE_OPTIONS = [
        ('long', 'Long'),
        ('short', 'Short'),
    ]

    APPROVAL_STATUSES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('order_placed', 'Order Placed'),
        ('fills_received', 'Fills Received'),
        ('partial_fills_received', 'Partial Fills Received'),
    ]
    name = models.ForeignKey(Availability, on_delete=models.CASCADE, related_name='trades')
    trade_type = models.CharField(max_length=10, choices=TRADE_OPTIONS)
    lots = models.PositiveIntegerField()
    price = models.DecimalField(max_digits=10, decimal_places=2)
    stop_loss = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)

    trader = models.ForeignKey(User, on_delete=models.CASCADE, related_name='trades')
    status = models.CharField(max_length=25, choices=APPROVAL_STATUSES, default='pending')

    approved_by = models.ForeignKey(
        User, null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='approved_trades'
    )

    # Timestamp fields
    created_at = models.DateTimeField(auto_now_add=True)       # Trade requested
    approved_at = models.DateTimeField(null=True, blank=True)  # Approved
    order_placed_at = models.DateTimeField(null=True, blank=True)
    fills_received_at = models.DateTimeField(null=True, blank=True)
    close_requested_at = models.DateTimeField(null=True, blank=True)  # When the trade was closed

    # Additional fields 
    is_closed = models.BooleanField(default=False)  # Indicates if the trade is closed
    close_accepted = models.BooleanField(default=False)  # Indicates if the close request was accepted
    ratio = models.DecimalField(max_digits=10, decimal_places=2, default=100.00) # Field for ratio
    fills_recivied_for = models.DecimalField(max_digits=10, decimal_places=2, default=0.00) # Field for fills received (lots)
    fills_received_of = models.DecimalField(max_digits=10, decimal_places=2, default=0.00) # Field for fills received of(price)   

    def __str__(self):
        return f"{self.name}"
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        
        self._original_fills_recivied_for = self.fills_recivied_for


class Profit(models.Model):
    trade = models.ForeignKey(Trade, on_delete=models.CASCADE, related_name='profits')
    entry = models.DecimalField(max_digits=10, decimal_places=2)  # Entry price of the trade
    booked_lots = models.PositiveIntegerField()
    unbooked_lots = models.PositiveIntegerField()
    exit_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)  # Price at which the trade was settled for booked lots
    settlement_price_unbooked = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)  # Price at which the trade was settled for unbooked lots
    profit = models.FloatField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now_add=True)

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._original_exit_price = self.exit_price
        self._original_settlement_price_unbooked = self.settlement_price_unbooked

    def _calculate_profit(self):
        total_profit = Decimal('0.00')

        if self.exit_price is not None and self.booked_lots is not None and self.booked_lots > 0:
            profit_per_lot = self.exit_price - self.entry
            total_profit += profit_per_lot * self.booked_lots

        if self.settlement_price_unbooked is not None and self.unbooked_lots is not None and self.unbooked_lots > 0:
            profit_per_lot = self.settlement_price_unbooked - self.entry
            total_profit += profit_per_lot * self.unbooked_lots
            
        return float(total_profit) # Convert to float for the profit field
        


    def __str__(self):
        return f"Profit for {self.trade.name} - {self.profit}"

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
        related_name='exit_events',
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
# class Settlement(models.Model):
#     trade = models.ForeignKey(Trade, on_delete=models.CASCADE, related_name='settlements')
#     settlement_price = models.DecimalField(max_digits=10, decimal_places=2)
#     created_at = models.DateTimeField(auto_now_add=True)

#     def __str__(self):
#         return f"Settlement for {self.trade.name} at {self.settlement_price} for {self.lots} lots"