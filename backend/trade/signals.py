from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Trade, Exit # Import your Profit model
from decimal import Decimal
from .serializers import TradeSerializer, ExitSerializer
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

@receiver(post_save, sender=Trade)
def update_status_on_fills_change(sender, instance, created, **kwargs):
    original_fills_recivied_for = instance._original_fills_recivied_for
    
    fills_recivied_for_changed = instance.fills_recivied_for != original_fills_recivied_for

    # Only update status if fills have changed (not on initial creation)
    if not created and fills_recivied_for_changed:
        old_status = instance.status
        if instance.fills_recivied_for == instance.lots:
            instance.status = 'fills_received'
            new_status = 'fills_received'
        elif instance.fills_recivied_for > 0 and instance.fills_recivied_for < instance.lots:
            instance.status = 'partial_fills_received'
            new_status = 'partial_fills_received'
        else:
            # Keep the current status if fills are 0 (don't change from pending to pending)
            new_status = old_status
        
        if new_status != old_status:
            instance.save(update_fields=['status']) 
            print(f"Status for Trade {instance.id} updated: {old_status} -> {new_status}")

@receiver(post_save, sender=Exit)
def update_exit_on_save(sender, instance, created, **kwargs):
    fields_to_update = []

    # ----------- 1. Calculate profit_loss (per-exit) -----------
    if (
        instance.exit_price is not None and
        instance.recieved_lots is not None and
        instance.recieved_lots > 0
    ):
        trade_entry_price = instance.trade.price
        calculated_pl = (Decimal(instance.exit_price) - Decimal(trade_entry_price)) * Decimal(instance.recieved_lots)

        if instance.profit_loss != calculated_pl:
            instance.profit_loss = calculated_pl
            fields_to_update.append("profit_loss")

    # ----------- 2. Determine and update is_closed on Exit -----------
    if instance.recieved_lots == instance.requested_exit_lots and instance.recieved_lots > 0:
        if not instance.is_closed:
            instance.is_closed = True
            fields_to_update.append("is_closed")
    else:
        if instance.is_closed:
            instance.is_closed = False
            fields_to_update.append("is_closed")

    # ----------- 3. Update Exit Status (logic retained & fixed) -----------
    old_status = instance.exit_status
    new_status = old_status  # default fallback

    if instance.recieved_lots == instance.requested_exit_lots and instance.recieved_lots > 0:
        new_status = "filled"
    elif 0 < instance.recieved_lots < instance.requested_exit_lots:
        new_status = "partial_filled"
    elif instance.recieved_lots == 0:
        if old_status in ["filled", "partial_filled"]:
            new_status = "order_placed"
        elif old_status == "pending":
            new_status = "pending"

    if new_status != old_status:
        instance.exit_status = new_status
        fields_to_update.append("exit_status")

    # ----------- Save changes only if needed -----------
    if fields_to_update:
        instance.save(update_fields=fields_to_update)