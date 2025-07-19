from django.db import models
from django.contrib.auth import get_user_model
from decimal import Decimal

User = get_user_model()

class Commodity(models.Model):
    code = models.CharField(max_length=20, unique=True)
    name = models.CharField(max_length=100, blank=True)

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

class Availability(models.Model):
    contract_month = models.ForeignKey(ContractMonth, on_delete=models.CASCADE)
    commodity = models.ForeignKey(Commodity, on_delete=models.CASCADE)
    is_available = models.BooleanField()

    def __str__(self):
        return f"{self.commodity.code}-{self.contract_month.label} ({self.contract_month.start_month} {self.contract_month.start_year} - {self.contract_month.end_month} {self.contract_month.end_year})"

    class Meta:
        unique_together = ('contract_month', 'commodity')

    


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
    ]
    name = models.ForeignKey(Availability, on_delete=models.CASCADE, related_name='trades')
    trade_type = models.CharField(max_length=10, choices=TRADE_OPTIONS)
    lots = models.PositiveIntegerField()
    price = models.DecimalField(max_digits=10, decimal_places=2)
    stop_loss = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)

    trader = models.ForeignKey(User, on_delete=models.CASCADE, related_name='trades')
    status = models.CharField(max_length=20, choices=APPROVAL_STATUSES, default='pending')

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
        # Call the parent's __init__ first to ensure all fields are set up
        super().__init__(*args, **kwargs)
        
        # Store the initial values of the fields we want to monitor.
        # This runs when an object is created (Profit()) or loaded from DB (Profit.objects.get()).
        # For new objects, self.pk will be None, and these attributes will be None, which is fine.
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

