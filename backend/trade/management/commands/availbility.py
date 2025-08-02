# your_app_name/management/commands/load_settlements.py

import os
import pandas as pd
import itertools
from datetime import datetime
from django.core.management.base import BaseCommand
from django.db import transaction

# --- IMPORTANT ---
# Replace 'your_app_name' with the actual name of your Django app
from trade.models import Commodity, Settlement, Availability

class Command(BaseCommand):
    """
    A Django management command to load settlement data using pandas.

    This script reads 'data.csv', finds all 'TRUE' values, creates
    Settlement instances, and then creates all month-to-month combinations
    as Availability instances.
    """
    help = 'Loads settlements and creates all month-to-month availability combinations'

    def handle(self, *args, **options):
        """
        The main logic for the management command.
        """
        # --- Configuration ---
        start_year = 2025
        end_year = 2030
        csv_file_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))), 'trade\management\commands\data.csv')

        if not os.path.exists(csv_file_path):
            self.stdout.write(self.style.ERROR(f"Error: 'data.csv' not found at '{csv_file_path}'"))
            return

        self.stdout.write(self.style.SUCCESS(f"--- Step 1: Importing Settlements from '{csv_file_path}' ---"))

        try:
            # 1. Read the CSV into a pandas DataFrame first with default types.
            df = pd.read_csv(csv_file_path, index_col=0)
            df = df.astype(bool)

            # 2. Reshape and filter for TRUE values
            stacked_data = df.stack()
            true_settlements = stacked_data[stacked_data]

            if true_settlements.empty:
                self.stdout.write(self.style.WARNING("No 'TRUE' values found in the CSV. No settlements will be created."))
                return

            with transaction.atomic():
                self.stdout.write("Clearing existing Settlement and Availability data...")
                Settlement.objects.all().delete()
                Availability.objects.all().delete()
                self.stdout.write("Existing data cleared.")
                
                created_count = 0
                for year in range(start_year, end_year + 1):
                    for (month_info, commodity_code), _ in true_settlements.items():
                        month_abbr = month_info.split()[1]
                        commodity, _ = Commodity.objects.get_or_create(code=commodity_code, defaults={'name': commodity_code})
                        Settlement.objects.create(commodity=commodity, settlement_price=0.00, month=month_abbr, year=year)
                        created_count += 1
            
            self.stdout.write(self.style.SUCCESS(f"Successfully created {created_count} settlement instances."))

            # --- Step 2: Generate Availability Combinations ---
            self.stdout.write(self.style.SUCCESS("\n--- Step 2: Generating availability combinations ---"))
            
            with transaction.atomic():
                combination_count = 0
                commodities = Commodity.objects.filter(settlements__isnull=False).distinct()
                
                # Helper to sort months correctly since Django's order_by on a CharField is alphabetical
                month_map = {datetime.strptime(str(i), '%m').strftime('%b'): i for i in range(1, 13)}

                for commodity in commodities:
                    # Loop through each year range (25-26, 26-27, etc.)
                    for year in range(start_year, end_year):
                        next_year = year + 1

                        # Get all settlements for the current commodity in the 2-year window
                        settlements_in_window_qs = Settlement.objects.filter(
                            commodity=commodity,
                            year__in=[year, next_year]
                        )
                        
                        # Sort the queryset in Python to handle month names correctly
                        settlements_in_window = sorted(
                            list(settlements_in_window_qs),
                            key=lambda s: (s.year, month_map.get(s.month, 0))
                        )

                        # Generate all unique pairs of Settlement objects
                        for start_settlement, end_settlement in itertools.combinations(settlements_in_window, 2):
                            Availability.objects.create(
                                commodity=commodity,
                                start_month=start_settlement,
                                end_month=end_settlement,
                                settlement_price=0.0,
                                is_available=True
                            )
                            combination_count += 1
                
                self.stdout.write(self.style.SUCCESS(f"Successfully created {combination_count} availability instances."))

        except FileNotFoundError:
            self.stdout.write(self.style.ERROR(f"Error: The file '{csv_file_path}' was not found."))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"An unexpected error occurred: {e}"))