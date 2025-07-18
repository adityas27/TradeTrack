from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Profit # Import your Profit model

# Removed the pre_init signal handler.
# The __init__ method in the Profit model now handles storing original values.

@receiver(post_save, sender=Profit)
def recalculate_profit_on_save(sender, instance, created, **kwargs):
    # Retrieve the original values directly from the instance's temporary attributes
    original_exit_price = instance._original_exit_price
    original_settlement_price_unbooked = instance._original_settlement_price_unbooked

    # Check if the relevant fields have changed or if it's a new instance.
    # Also recalculate if the profit field is currently None (e.g., initial save
    # of an object where exit/settlement prices were set, but profit wasn't yet calculated).
    exit_price_changed = instance.exit_price != original_exit_price
    settlement_price_unbooked_changed = instance.settlement_price_unbooked != original_settlement_price_unbooked
    
    # Recalculate if it's a new instance, or if profit is None, or if any monitored field changed
    if created or instance.profit is None or exit_price_changed or settlement_price_unbooked_changed:
        old_profit = instance.profit
        new_profit = instance._calculate_profit()
        
        # Only save if the profit actually changed to prevent unnecessary DB writes
        if new_profit != old_profit:
            instance.profit = new_profit
            # IMPORTANT: Use update_fields to prevent infinite recursion
            # This tells Django to only save the 'profit' field.
            # This specific save will NOT re-trigger the post_save for the 'profit' field itself.
            instance.save(update_fields=['profit']) 
            print(f"Profit for Trade {instance.trade_id} recalculated: {old_profit} -> {new_profit}")