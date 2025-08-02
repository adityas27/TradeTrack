from django.core.management.base import BaseCommand
from trade.models import Commodity
from calendar import month_abbr
import datetime
    
class Command(BaseCommand):
    help = 'Populates ContractMonth and Commodity tables'

    def handle(self, *args, **kwargs):
        self.populate()

    def populate(self):
        commodity_codes = [
            "ZC", "ZS", "ZL", "ZM", "ZW", "KE", "MW", "RS", "ZR", "ZO", "FCPO", "yECO", "CL", "BZ",
            "OQ", "NG", "TFM", "M", "RB", "HO", "G", "O", "T", "ECF", "ATW", "NCF", "GC", "SI", "HG",
            "PL", "PA", "HRC", "FEF", "SB", "KC", "C", "CC", "CT", "OJ", "LBR", "W", "RC", "TF", "RT",
            "LE", "HE", "GF", "PRK"
        ]
        total_commodities = len(commodity_codes)
        count = 0
        for code in commodity_codes:
            _, created = Commodity.objects.get_or_create(code=code)
            if created:
                self.stdout.write(self.style.SUCCESS(f"Created Commodity: {code}"))
                count += 1
            else:
                self.stdout.write(self.style.WARNING(f"Commodity already exists: {code}"))

        self.stdout.write(self.style.SUCCESS(f"✅ Created {count} out of {total_commodities} Commodity entries")) 
