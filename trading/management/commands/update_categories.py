from django.core.management.base import BaseCommand
from trading.models import Cryptocurrency


class Command(BaseCommand):
    help = 'Update cryptocurrency categories for existing data'

    def handle(self, *args, **options):
        self.stdout.write('Updating cryptocurrency categories...')

        # Category mapping
        category_mapping = {
            'BTC': 'CRYPTO',
            'ETH': 'CRYPTO',
            'SOL': 'CRYPTO',
            'XRP': 'CRYPTO',
            'USDC': 'STABLECOIN',
        }

        updated_count = 0
        for symbol, category in category_mapping.items():
            try:
                crypto = Cryptocurrency.objects.get(symbol=symbol)
                if crypto.category != category:
                    crypto.category = category
                    crypto.save()
                    self.stdout.write(
                        self.style.SUCCESS(f'✓ Updated {symbol} → {category}')
                    )
                    updated_count += 1
                else:
                    self.stdout.write(
                        self.style.WARNING(f'- {symbol} already set to {category}')
                    )
            except Cryptocurrency.DoesNotExist:
                self.stdout.write(
                    self.style.ERROR(f'✗ {symbol} not found in database')
                )

        self.stdout.write('\n' + '='*50)
        self.stdout.write(
            self.style.SUCCESS(f'Updated {updated_count} cryptocurrencies')
        )
