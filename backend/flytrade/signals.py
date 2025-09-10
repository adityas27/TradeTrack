from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
from decimal import Decimal
from .models import Spreads, SpreadsExit

@receiver(post_save, sender=Spreads)
def update_exits_on_spread_change(sender, instance: Spreads, **kwargs):
    """
    Recompute profit_loss for each exit of the spread if avg_price/total_lots changed.
    """
    for exit_obj in instance.exit_events.all():
        if exit_obj.exit_price is not None and exit_obj.received_lots and exit_obj.received_lots > 0:
            spread_entry_price = Decimal(instance.avg_price)
            calculated_pl = (Decimal(exit_obj.exit_price) - spread_entry_price) * Decimal(exit_obj.received_lots)
            if exit_obj.profit_loss != calculated_pl:
                exit_obj.profit_loss = calculated_pl
                exit_obj.save(update_fields=["profit_loss"])

@receiver(post_save, sender=SpreadsExit)
def update_spreads_exit_on_save(sender, instance: SpreadsExit, created, **kwargs):
    """
    Update profit_loss and status for SpreadsExit when saved.
    """
    fields_to_update = []
    if instance.exit_price is not None and instance.received_lots is not None and instance.received_lots > 0:
        spread_entry_price = Decimal(instance.spread.avg_price)
        calculated_pl = (Decimal(instance.exit_price) - spread_entry_price) * Decimal(instance.received_lots)
        if instance.profit_loss != calculated_pl:
            instance.profit_loss = calculated_pl
            fields_to_update.append("profit_loss")
    # Update is_closed flag
    if instance.received_lots == instance.requested_exit_lots and instance.received_lots > 0:
        if not instance.is_closed:
            instance.is_closed = True
            fields_to_update.append("is_closed")
    else:
        if instance.is_closed:
            instance.is_closed = False
            fields_to_update.append("is_closed")
    # Status transitions
    old_status = instance.exit_status
    new_status = old_status
    if instance.received_lots == instance.requested_exit_lots and instance.received_lots > 0:
        new_status = "filled"
    elif 0 < (instance.received_lots or 0) < (instance.requested_exit_lots or 0):
        new_status = "partial_filled"
    elif (instance.received_lots or 0) == 0:
        if old_status in ["filled", "partial_filled"]:
            new_status = "order_placed"
        else:
            new_status = "pending"
    if new_status != old_status:
        instance.exit_status = new_status
        fields_to_update.append("exit_status")
    if fields_to_update:
        instance.save(update_fields=fields_to_update)