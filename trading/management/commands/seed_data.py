from django.core.management.base import BaseCommand
from django.utils import timezone
from decimal import Decimal
from datetime import timedelta
import random
from trading.models import User, Portfolio, Cryptocurrency, Transaction
from trading.services.coingecko import CoinGeckoService
from trading.services.trading import TradingService

# Create your management commands here.

class Command(BaseCommand):
    help = 'Seed database with demo data'

    def handle(self, *args, **options):
        self.stdout.write('Seeding database...')
        
        # Create demo user
        user, created = User.objects.get_or_create(
            username='john_smith',
            defaults={
                'email': 'john_smith@gmail.com',
                'first_name': 'John',
                'last_name': 'Smith',
                'date_of_birth': '1998-12-01',  # December 1, 1998
                'address': '1 Main St.',
                'city': 'San Francisco',
                'state': 'California',
                'zip_code': '94118',
                'country': 'United States',
                'account_number': '00048224398',
                'account_type': User.AccountType.INDIVIDUAL,
            }
        )

        if created:
            self.stdout.write(self.style.SUCCESS(f'Created user: {user.username}'))
        
        # Create portfolio
        portfolio, created = Portfolio.objects.get_or_create(
            user=user,
            defaults={
                'cash_balance': Decimal('10000.00'),
                'initial_cash': Decimal('10000.00')
            }
        )
        
        if created:
            self.stdout.write(self.style.SUCCESS(f'Created portfolio for {user.username}'))
        
        # Create cryptocurrencies
        coingecko_service = CoinGeckoService()
        
        cryptos_data = [
            ('BTC', 'Bitcoin', 'bitcoin', 'BTC-USD', 'https://cryptologos.cc/logos/bitcoin-btc-logo.png', 'CRYPTO'),
            ('ETH', 'Ethereum', 'ethereum', 'ETH-USD', 'https://cryptologos.cc/logos/ethereum-eth-logo.png', 'CRYPTO'),
            ('SOL', 'Solana', 'solana', 'SOL-USD', 'https://cryptologos.cc/logos/solana-sol-logo.png', 'CRYPTO'),
            ('XRP', 'XRP', 'ripple', 'XRP-USD', 'https://cryptologos.cc/logos/xrp-xrp-logo.png', 'CRYPTO'),
            ('USDC', 'USD Coin', 'usd-coin', 'USDC-USD', 'https://cryptologos.cc/logos/usd-coin-usdc-logo.png', 'STABLECOIN'),
        ]

        cryptos = {}
        for symbol, name, coingecko_id, yfinance_symbol, icon_url, category in cryptos_data:
            crypto, created = Cryptocurrency.objects.get_or_create(
                symbol=symbol,
                defaults={
                    'name': name,
                    'coingecko_id': coingecko_id,
                    'yfinance_symbol': yfinance_symbol,
                    'icon_url': icon_url,
                    'category': category,
                    'is_active': True
                }
            )

            # Update category and yfinance_symbol if crypto already exists
            updated = False
            if not created:
                if crypto.category != category:
                    crypto.category = category
                    updated = True
                if crypto.yfinance_symbol != yfinance_symbol:
                    crypto.yfinance_symbol = yfinance_symbol
                    updated = True
                if updated:
                    crypto.save()
                    self.stdout.write(self.style.SUCCESS(f'Updated {symbol} (category: {category}, yfinance: {yfinance_symbol})'))

            cryptos[symbol] = crypto

            if created:
                self.stdout.write(self.style.SUCCESS(f'Created cryptocurrency: {symbol} ({category})'))
        
        # Fetch current prices
        self.stdout.write('Fetching current prices...')
        prices = coingecko_service.get_current_prices()
        
        for symbol, price_data in prices.items():
            if symbol in cryptos:
                crypto = cryptos[symbol]
                crypto.current_price = price_data['price']
                crypto.price_change_24h = price_data['change_24h']
                crypto.last_updated = timezone.now()
                crypto.save()
                self.stdout.write(f'Updated {symbol} price: ${price_data["price"]}')
        
        # Generate mock transactions
        self.stdout.write('Generating mock transactions...')
        
        # Clear existing transactions
        Transaction.objects.filter(portfolio=portfolio).delete()
        portfolio.holdings.all().delete()
        portfolio.cash_balance = Decimal('10000.00')
        portfolio.save()
        
        # Define transaction strategy
        transactions_plan = [
            # Month 6 months ago
            ('BTC', 'BUY', Decimal('2000'), 180),
            ('ETH', 'BUY', Decimal('1500'), 178),
            
            # Month 5 months ago
            ('SOL', 'BUY', Decimal('800'), 150),
            ('XRP', 'BUY', Decimal('500'), 145),
            
            # Month 4 months ago
            ('BTC', 'SELL_PERCENT', Decimal('0.30'), 120),  # Sell 30%
            ('ETH', 'BUY', Decimal('600'), 118),
            
            # Month 3 months ago
            ('SOL', 'BUY', Decimal('400'), 90),
            ('XRP', 'SELL_PERCENT', Decimal('0.50'), 85),  # Sell 50%
            
            # Month 2 months ago
            ('USDC', 'BUY', Decimal('1000'), 60),
            ('ETH', 'SELL_PERCENT', Decimal('0.20'), 55),  # Sell 20%
            
            # Month 1 month ago
            ('SOL', 'BUY', Decimal('300'), 30),
            ('BTC', 'SELL_PERCENT', Decimal('0.10'), 25),  # Sell 10%
            
            # Recent (this month)
            ('ETH', 'BUY', Decimal('500'), 8),
            ('SOL', 'SELL_PERCENT', Decimal('0.15'), 3),  # Sell 15%
        ]
        
        for symbol, action, amount, days_ago in transactions_plan:
            crypto = cryptos[symbol]
            transaction_time = timezone.now() - timedelta(days=days_ago)
            
            # Temporarily set transaction timestamp
            if action == 'BUY':
                # Temporarily update price for historical accuracy
                original_price = crypto.current_price
                
                # Simulate historical price (±20% from current)
                price_variance = random.uniform(0.8, 1.2)
                crypto.current_price = original_price * Decimal(str(price_variance))
                crypto.save()
                
                success, txn, error = TradingService.execute_buy(
                    portfolio=portfolio,
                    cryptocurrency=crypto,
                    amount_usd=amount
                )
                
                if success:
                    # Update transaction timestamp
                    txn.timestamp = transaction_time
                    txn.save()
                    self.stdout.write(f'  ✓ BUY {symbol}: ${amount} ({days_ago} days ago)')
                else:
                    self.stdout.write(self.style.ERROR(f'  ✗ BUY {symbol} failed: {error}'))
                
                # Restore current price
                crypto.current_price = original_price
                crypto.save()
                
            elif action == 'SELL_PERCENT':
                # Sell percentage of holdings
                try:
                    holding = portfolio.holdings.get(cryptocurrency=crypto)
                    sell_quantity = holding.quantity * amount
                    
                    original_price = crypto.current_price
                    price_variance = random.uniform(0.8, 1.2)
                    crypto.current_price = original_price * Decimal(str(price_variance))
                    crypto.save()
                    
                    success, txn, error = TradingService.execute_sell(
                        portfolio=portfolio,
                        cryptocurrency=crypto,
                        quantity=sell_quantity
                    )
                    
                    if success:
                        txn.timestamp = transaction_time
                        txn.save()
                        self.stdout.write(f'  ✓ SELL {symbol}: {amount*100}% ({days_ago} days ago)')
                    else:
                        self.stdout.write(self.style.ERROR(f'  ✗ SELL {symbol} failed: {error}'))
                    
                    crypto.current_price = original_price
                    crypto.save()
                    
                except Exception as e:
                    self.stdout.write(self.style.WARNING(f'  ⚠ SELL {symbol}: No holdings yet'))
        
        # Final summary
        portfolio.refresh_from_db()
        self.stdout.write('\n' + '='*50)
        self.stdout.write(self.style.SUCCESS('Seeding complete!'))
        self.stdout.write(f'Cash Balance: ${portfolio.cash_balance}')
        self.stdout.write(f'Total Portfolio Value: ${portfolio.total_value}')
        self.stdout.write(f'Total Gain/Loss: ${portfolio.total_gain_loss} ({portfolio.total_gain_loss_percentage}%)')
        self.stdout.write(f'Holdings: {portfolio.holdings.count()}')
        self.stdout.write(f'Transactions: {portfolio.transactions.count()}')