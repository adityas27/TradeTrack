# your_app_name/management/commands/load_settlements.py

import os
import pandas as pd
from django.core.management.base import BaseCommand
from django.db import transaction

# --- IMPORTANT ---
# Replace 'your_app_name' with the actual name of your Django app
from trade.models import Commodity, Settlement

class Command(BaseCommand):
    """
    A Django management command to load settlement data using pandas.

    This script reads 'data.csv', finds all 'TRUE' values, and creates
    Settlement instances for each year between 2025 and 2030.
    """
    help = 'Loads settlement data from data.csv for years 2025-2030 using pandas'

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

        self.stdout.write(self.style.SUCCESS(f"Starting settlement import from '{csv_file_path}' using pandas..."))

        try:
            # 1. Read the CSV into a pandas DataFrame first with default types.
            # We set the first column ('PRODUCT') as the index of the DataFrame.
            df = pd.read_csv(csv_file_path, index_col=0)

            # Then, convert all data columns to boolean type. This avoids the dtype error.
            df = df.astype(bool)

            # 2. Reshape the data for easy iteration
            # stack() converts the wide DataFrame to a long Series with a (month, commodity) index
            stacked_data = df.stack()
            
            # 3. Filter for only the TRUE values
            true_settlements = stacked_data[stacked_data]

            if true_settlements.empty:
                self.stdout.write(self.style.WARNING("No 'TRUE' values found in the CSV. No settlements will be created."))
                return

            with transaction.atomic():
                self.stdout.write("Clearing existing Settlement data...")
                Settlement.objects.all().delete()
                self.stdout.write("Existing data cleared.")
                
                created_count = 0
                
                # 4. Iterate over the years and the filtered data
                for year in range(start_year, end_year + 1):
                    # The index of our series contains the (month_info, commodity_code) tuples
                    for (month_info, commodity_code), _ in true_settlements.items():
                        try:
                            # Extract the 3-letter month abbreviation (e.g., "Jan")
                            month_abbr = month_info.split()[1]
                        except IndexError:
                            self.stdout.write(self.style.WARNING(f"Skipping invalid month format: '{month_info}'"))
                            continue

                        # Get or create the Commodity object to avoid integrity errors
                        commodity, created = Commodity.objects.get_or_create(
                            code=commodity_code,
                            defaults={'name': commodity_code}  # Use code as name if creating
                        )
                        if created:
                            self.stdout.write(self.style.NOTICE(f"Created new commodity: {commodity_code}"))

                        # Create the Settlement instance
                        Settlement.objects.create(
                            commodity=commodity,
                            settlement_price=0.00,  # Placeholder price
                            month=month_abbr,
                            year=year
                        )
                        created_count += 1
            
            self.stdout.write(self.style.SUCCESS(f"Successfully created {created_count} settlement instances."))

        except FileNotFoundError:
            self.stdout.write(self.style.ERROR(f"Error: The file '{csv_file_path}' was not found."))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"An unexpected error occurred: {e}"))
