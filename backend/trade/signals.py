from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
from decimal import Decimal

from .models import Trade, Exit


@receiver(pre_save, sender=Trade)
def update_trade_stats(sender, instance: Trade, **kwargs):
    """
    Compute:
      - total_lots = sum of fills_received across entries
      - avg_price = weighted by fills_received and price
    If there are no fills, avg_price=0.
    """
    entries = instance.lots_and_price or []
    total_fills = 0
    weighted_sum = Decimal('0')

    for entry in entries:
        fills = int(entry.get("fills_received", 0) or 0)
        price = Decimal(str(entry.get("price", 0) or 0))
        total_fills += fills
        weighted_sum += Decimal(fills) * price

    instance.total_lots = int(total_fills)
    instance.avg_price = (weighted_sum / Decimal(total_fills)) if total_fills > 0 else Decimal('0')


@receiver(post_save, sender=Trade)
def update_exits_on_trade_change(sender, instance: Trade, **kwargs):
    """
    Recompute profit_loss for exits if trade avg_price/total_lots changed.
    """
    for exit_obj in instance.exits.all():
        if exit_obj.exit_price is not None and exit_obj.recieved_lots and exit_obj.recieved_lots > 0:
            trade_entry_price = Decimal(instance.avg_price)
            calculated_pl = (Decimal(exit_obj.exit_price) - trade_entry_price) * Decimal(exit_obj.recieved_lots)
            if exit_obj.profit_loss != calculated_pl:
                exit_obj.profit_loss = calculated_pl
                exit_obj.save(update_fields=["profit_loss"])


@receiver(post_save, sender=Exit)
def update_exit_on_save(sender, instance: Exit, created, **kwargs):
    """
    - Calculate profit_loss for this exit when exit_price/recieved_lots present.
    - Set is_closed on Exit if fully received.
    - Update exit_status based on recieved_lots vs requested_exit_lots.
    """
    fields_to_update = []
    # 1) P&L
    if instance.exit_price is not None and instance.recieved_lots is not None and instance.recieved_lots > 0:
        trade_entry_price = Decimal(instance.trade.avg_price)
        calculated_pl = (Decimal(instance.exit_price) - trade_entry_price) * Decimal(instance.recieved_lots)
        if instance.profit_loss != calculated_pl:
            instance.profit_loss = calculated_pl
            fields_to_update.append("profit_loss")

    # 2) is_closed flag (for the Exit, not the Trade)
    if instance.recieved_lots == instance.requested_exit_lots and instance.recieved_lots > 0:
        if not instance.is_closed:
            instance.is_closed = True
            fields_to_update.append("is_closed")
    else:
        if instance.is_closed:
            instance.is_closed = False
            fields_to_update.append("is_closed")

    # 3) status transitions
    old_status = instance.exit_status
    new_status = old_status
    if instance.recieved_lots == instance.requested_exit_lots and instance.recieved_lots > 0:
        new_status = "filled"
    elif 0 < (instance.recieved_lots or 0) < (instance.requested_exit_lots or 0):
        new_status = "partial_filled"
    elif (instance.recieved_lots or 0) == 0:
        # keep pending or order_placed depending on previous transitions
        if old_status in ["filled", "partial_filled"]:
            new_status = "order_placed"
        elif old_status == "pending":
            new_status = "pending"

    if new_status != old_status:
        instance.exit_status = new_status
        fields_to_update.append("exit_status")

    if fields_to_update:
        instance.save(update_fields=fields_to_update)
