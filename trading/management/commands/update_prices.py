import time
import asyncio
from decimal import Decimal
from django.core.management.base import BaseCommand
from django.utils import timezone
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from trading.models import Cryptocurrency, PriceHistory
from trading.services.coingecko import CoinGeckoService
import logging

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Fetch cryptocurrency prices and broadcast updates via WebSocket'

    def add_arguments(self, parser):
        parser.add_argument(
            '--interval',
            type=int,
            default=30,
            help='Update interval in seconds (default: 30)'
        )
        parser.add_argument(
            '--once',
            action='store_true',
            help='Run once and exit (for testing)'
        )

    def handle(self, *args, **options):
        interval = options['interval']
        run_once = options['once']

        self.stdout.write(self.style.SUCCESS(
            f'Starting price update service (interval: {interval}s)'
        ))

        coingecko = CoinGeckoService()
        channel_layer = get_channel_layer()

        try:
            while True:
                try:
                    # Fetch current prices
                    prices = coingecko.get_current_prices()

                    if not prices:
                        logger.warning("No prices fetched from CoinGecko")
                    else:
                        # Update database
                        updated_cryptos = []
                        timestamp = timezone.now()

                        for symbol, price_data in prices.items():
                            try:
                                crypto = Cryptocurrency.objects.get(symbol=symbol)
                                crypto.current_price = price_data['price']
                                crypto.price_change_24h = price_data['change_24h']
                                crypto.volume_24h = price_data.get('volume_24h')
                                crypto.market_cap = price_data.get('market_cap')
                                crypto.last_updated = timestamp
                                crypto.save()

                                # Save price history
                                PriceHistory.objects.create(
                                    cryptocurrency=crypto,
                                    price=price_data['price'],
                                    timestamp=timestamp
                                )

                                updated_cryptos.append({
                                    'symbol': symbol,
                                    'price': str(price_data['price']),
                                    'change_24h': str(price_data['change_24h']),
                                    'volume_24h': str(price_data.get('volume_24h', 0)),
                                    'market_cap': str(price_data.get('market_cap', 0))
                                })

                            except Cryptocurrency.DoesNotExist:
                                logger.warning(f"Cryptocurrency {symbol} not found in database")

                        # Broadcast to WebSocket clients
                        if channel_layer and updated_cryptos:
                            async_to_sync(channel_layer.group_send)(
                                "prices",
                                {
                                    "type": "price_update",
                                    "data": {
                                        "type": "price_update",
                                        "cryptocurrencies": updated_cryptos,
                                        "timestamp": str(timestamp)
                                    }
                                }
                            )

                            self.stdout.write(self.style.SUCCESS(
                                f'Updated {len(updated_cryptos)} prices at {timestamp.strftime("%H:%M:%S")}'
                            ))

                except Exception as e:
                    logger.error(f"Error in price update loop: {e}")
                    self.stdout.write(self.style.ERROR(f'Error: {e}'))

                if run_once:
                    break

                # Wait for next update
                time.sleep(interval)

        except KeyboardInterrupt:
            self.stdout.write(self.style.SUCCESS('\nPrice update service stopped'))
