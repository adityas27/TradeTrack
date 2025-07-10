from django.core.management.base import BaseCommand
from trade.models import ContractMonth
from calendar import month_abbr
import datetime

class Command(BaseCommand):
    help = 'Populates ContractMonth and Commodity tables'

    def handle(self, *args, **kwargs):
        self.populate_contract_months()

    def populate_contract_months(self):
        MONTHS = list(month_abbr)[1:]  # ['Jan', 'Feb', ..., 'Dec']
        YEARS = [2025]
        print(MONTHS)
        created_count = 0
        print(f"Poupulation contract months entries from years {YEARS[0]} to {YEARS[-1]}...")

        for i in range(len(YEARS)):
            print(f"Processing year: {YEARS[i]}")
            year = YEARS[i]
            for m in range(12):
                print(f"Processing month: {MONTHS[m]} {year}")
                start_month = MONTHS[m]
                start_year = year
                if m == 11:
                    end_month = MONTHS[0]  # Jan
                    end_year = YEARS[i + 1] if i + 1 < len(YEARS) else year + 1
                else:
                    end_month = MONTHS[m + 1]
                    end_year = year

                label = f"{start_month[-3:]}{str(start_year)[-2:]}-{end_month[-3:]}{str(end_year)[-2:]}"
                print(label)
                _, created = ContractMonth.objects.get_or_create(
                    label=label,
                    defaults={
                        'start_month': start_month,
                        'start_year': start_year,
                        'end_month': end_month,
                        'end_year': end_year,
                    }
                )
                print(f"Created: {created}")
                if created:
                    created_count += 1
                    self.stdout.write(f"Created ContractMonth: {label}")

        self.stdout.write(self.style.SUCCESS(f"✅ Created {created_count} ContractMonth entries"))