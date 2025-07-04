from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()

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

    name = models.CharField(max_length=100)
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
