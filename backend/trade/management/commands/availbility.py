import csv
import itertools
from decimal import Decimal
from django.core.management.base import BaseCommand
from trade.models import Commodity, Settlement, Availability

# Month abbreviations in correct order
MONTH_MAP = {
    "F Jan": "Jan",
    "G Feb": "Feb",
    "H Mar": "Mar",
    "J Apr": "Apr",
    "K May": "May",
    "M Jun": "Jun",
    "N Jul": "Jul",
    "Q Aug": "Aug",
    "U Sep": "Sep",
    "V Oct": "Oct",
    "X Nov": "Nov",
    "Z Dec": "Dec",
}

class Command(BaseCommand):
    help = "Import commodities and generate Settlements + Availabilities from matrix CSV"

    def add_arguments(self, parser):
        parser.add_argument("csv_file", type=str, help="Path to the commodities CSV file")

    def handle(self, *args, **options):
        csv_file = options["csv_file"]

        start_year = 2025
        end_year = 2030

        # --- Step 1: Parse CSV into commodity -> available months ---
        commodity_months = {}

        with open(csv_file, "r") as f:
            reader = csv.DictReader(f)

            for row in reader:
                product = row["PRODUCT"].strip()
                if product not in MONTH_MAP:
                    continue
                month_abbr = MONTH_MAP[product]

                for commodity_code, flag in row.items():
                    if commodity_code == "PRODUCT":
                        continue
                    if flag.strip().upper() == "TRUE":
                        commodity_months.setdefault(commodity_code, []).append(month_abbr)

        # --- Step 2: Process each commodity ---
        for commodity_code, months in commodity_months.items():
            commodity, _ = Commodity.objects.get_or_create(code=commodity_code)

            self.stdout.write(self.style.SUCCESS(
                f"Processing {commodity.code} with months {months}"
            ))

            all_settlements = []

            # Create settlements for each year
            for year in range(start_year, end_year + 1):
                for month in months:
                    self.stdout.write(self.style.SUCCESS(f"Creating row in settlements for {commodity}-{month}"))
                    settlement, _ = Settlement.objects.get_or_create(
                        commodity=commodity,
                        month=f"{month}",
                        year=year,
                        defaults={"settlement_price": Decimal("0.00")}
                    )
                    all_settlements.append(settlement)
            # Create availabilities = all unique single contract month
            self.stdout.write(self.style.SUCCESS(f"Creating single contract month entries {commodity}"))
            for s in all_settlements:
                self.stdout.write(self.style.SUCCESS(f"Creating spread of contract month {commodity} {s}"))
                Availability.objects.get_or_create(
                    commodity=commodity,
                    start_month=s,
                    end_month=None,
                    defaults={"settlement_price": 0, "is_available": True}
                )

            # Create availabilities = all unique pairs across years
            self.stdout.write(self.style.SUCCESS(f"Creating spread of contract month {commodity}"))
            for s1, s2 in itertools.combinations(all_settlements, 2):
                self.stdout.write(self.style.SUCCESS(f"Creating spread of contract month {commodity} {s1}-{s2}"))
                Availability.objects.get_or_create(
                    commodity=commodity,
                    start_month=s1,
                    end_month=s2,
                    defaults={"settlement_price": 0, "is_available": True}
                )

        self.stdout.write(self.style.SUCCESS("Import completed successfully."))
