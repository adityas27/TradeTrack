from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Profit, Trade # Import your Profit model

# Removed the pre_init signal handler.
# The __init__ method in the Profit model now handles storing original values.

@receiver(post_save, sender=Profit)
def recalculate_profit_on_save(sender, instance, created, **kwargs):
    # Retrieve the original values directly from the instance's temporary attributes
    original_exit_price = instance._original_exit_price
    original_settlement_price_unbooked = instance._original_settlement_price_unbooked
    # Check if the exit price or settlement price has changed
    exit_price_changed = instance.exit_price != original_exit_price
    settlement_price_unbooked_changed = instance.settlement_price_unbooked != original_settlement_price_unbooked
    
    # Recalculate if it's a new instance, or if profit is None, or if any monitored field changed
    if created or instance.profit is None or exit_price_changed or settlement_price_unbooked_changed:
        old_profit = instance.profit
        new_profit = instance._calculate_profit()
        
        # Only save if the profit actually changed to prevent unnecessary DB writes
        if new_profit != old_profit:
            instance.profit = new_profit

            instance.save(update_fields=['profit']) 
            print(f"Profit for Trade {instance.trade_id} recalculated: {old_profit} -> {new_profit}")

@receiver(post_save, sender=Trade)
def update_status_on_fills_change(sender, instance, created, **kwargs):

    original_fills_recivied_for = instance._original_fills_recivied_for
    
    fills_recivied_for_changed = instance.fills_recivied_for != original_fills_recivied_for

    if created or instance.status is None or fills_recivied_for_changed:
        old_status = instance.status
        if instance.fills_recivied_for == instance.lots:
            instance.status = 'fills_received'
            new_status = 'fills_received'
        elif instance.fills_recivied_for > 0 and instance.fills_recivied_for < instance.lots:
            instance.status = 'partial_fills_received'
            new_status = 'partial_fills_received'
        else:
            instance.status = 'order_placed'
            new_status = 'order_placed'
        
        if new_status != old_status:
            instance.save(update_fields=['status']) 
            print(f"Profit for Trade {instance.id} recalculated: {old_status} -> {new_status}")