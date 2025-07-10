import pandas as pd
from django.core.management.base import BaseCommand
from trade.models import Commodity, ContractMonth, Availability

class Command(BaseCommand):
    help = "Populate Availability table from a CSV file using Pandas"

    def add_arguments(self, parser):
        parser.add_argument("csv_file", type=str, help="Path to CSV file")
        parser.add_argument("--year", type=int, default=2025, help="Start year to use for contract months")

    def handle(self, *args, **kwargs):
        csv_file = kwargs["csv_file"]
        base_year = kwargs["year"]

        # Symbol to month abbreviation mapping
        month_map = {
            "F": "Jan", "G": "Feb", "H": "Mar", "J": "Apr", "K": "May", "M": "Jun",
            "N": "Jul", "Q": "Aug", "U": "Sep", "V": "Oct", "X": "Nov", "Z": "Dec"
        }

        try:
            df = pd.read_csv(csv_file)
        except Exception as e:
            self.stderr.write(self.style.ERROR(f"❌ Failed to read CSV: {e}"))
            return

        # Check that 'PRODUCT' or first column exists
        if df.columns[0].strip().lower() not in ['product', 'contract', 'month']:
            self.stderr.write(self.style.ERROR("❌ First column must be 'PRODUCT' or similar."))
            return

        df = df.rename(columns={df.columns[0]: 'MonthKey'})

        for _, row in df.iterrows():
            if pd.isna(row['MonthKey']):
                continue

            try:
                # Split 'F Jan' → symbol = 'F'
                symbol = row['MonthKey'].split()[0].strip('.')
                start_month = month_map.get(symbol)
                if not start_month:
                    self.stderr.write(f"⚠️ Unknown symbol: {row['MonthKey']}")
                    continue

                # Derive end month/year
                start_year = base_year
                month_values = list(month_map.values())
                end_idx = (month_values.index(start_month) + 1) % 12
                end_month = month_values[end_idx]
                end_year = start_year + 1 if end_month == "Jan" else start_year

                label = f"{start_month}{str(start_year)[-2:]}-{end_month}{str(end_year)[-2:]}"
                contract = ContractMonth.objects.get(label=label)

                for code in row.index[1:]:  # skip MonthKey
                    value = str(row[code]).strip().lower()
                    if value not in ['true', 'false']:
                        continue  # skip blanks, errors

                    try:
                        commodity = Commodity.objects.get(code=code.strip())
                        is_available = value == 'true'

                        _, created = Availability.objects.update_or_create(
                            contract_month=contract,
                            commodity=commodity,
                            defaults={"is_available": is_available}
                        )
                        if created:
                            self.stdout.write(f"✅ {label} - {code}: {is_available}")
                    except Commodity.DoesNotExist:
                        self.stderr.write(f"❌ Commodity not found: {code}")

            except Exception as e:
                self.stderr.write(f"Error on row {row['MonthKey']}: {e}")

        self.stdout.write(self.style.SUCCESS("✅ Availability imported from CSV successfully."))
