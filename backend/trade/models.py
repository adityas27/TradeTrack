from django.db import models
from django.contrib.auth import get_user_model

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

    class Meta:
        unique_together = ('contract_month', 'commodity')

    def __str__(self):
        return f"{self.commodity.code}-{self.contract_month.label} ({self.contract_month.start_month} {self.contract_month.start_year} - {self.contract_month.end_month} {self.contract_month.end_year})"


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


    def __str__(self):
        return self.name


