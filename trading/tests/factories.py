"""
Factory Boy factories for creating test data.

These factories provide a clean, consistent way to create model instances
for testing without duplicating setup code across test files.
"""
from decimal import Decimal
from datetime import datetime, timedelta
import factory
from factory.django import DjangoModelFactory
from django.utils import timezone
from trading.models import User, Portfolio, Cryptocurrency, Holding, Transaction, PriceHistory


class UserFactory(DjangoModelFactory):
    """
    Creates a test user with portfolio.

    Default user has:
    - Username: testuser_{sequence}
    - Email: testuser_{sequence}@example.com
    - Individual account type
    - Date of birth: 1990-01-01
    """
    class Meta:
        model = User

    username = factory.Sequence(lambda n: f'testuser_{n}')
    email = factory.Sequence(lambda n: f'testuser_{n}@example.com')
    first_name = 'Test'
    last_name = factory.Sequence(lambda n: f'User{n}')
    account_type = User.AccountType.INDIVIDUAL
    date_of_birth = '1990-01-01'


class PortfolioFactory(DjangoModelFactory):
    """
    Creates a test portfolio linked to a user.

    Default portfolio has:
    - $10,000 initial cash
    - $10,000 current cash balance
    - Created 30 days ago
    """
    class Meta:
        model = Portfolio

    user = factory.SubFactory(UserFactory)
    initial_cash = Decimal('10000.00')
    cash_balance = Decimal('10000.00')
    created_at = factory.LazyFunction(lambda: timezone.now() - timedelta(days=30))


class CryptocurrencyFactory(DjangoModelFactory):
    """
    Creates a test cryptocurrency.

    Default crypto:
    - Symbol: CRYPTO{n} (unique sequence)
    - Active and tradeable
    - Current price: $50,000
    - Positive 24h price change
    - Unique coingecko_id to prevent UNIQUE constraint errors
    """
    class Meta:
        model = Cryptocurrency

    symbol = factory.Sequence(lambda n: f'CRYPTO{n}')
    name = factory.LazyAttribute(lambda obj: f'{obj.symbol} Coin')
    coingecko_id = factory.Sequence(lambda n: f'crypto-{n}')
    current_price = Decimal('50000.00')
    price_change_24h = Decimal('2.50')
    volume_24h = Decimal('1000000000.00')
    market_cap = Decimal('1000000000000.00')
    icon_url = factory.Sequence(lambda n: f'https://example.com/crypto-{n}.png')
    is_active = True
    category = Cryptocurrency.Category.CRYPTO


class HoldingFactory(DjangoModelFactory):
    """
    Creates a portfolio holding.

    Default holding:
    - 1.0 quantity
    - Average purchase price matches crypto current price
    - Proper cost basis calculation
    """
    class Meta:
        model = Holding

    portfolio = factory.SubFactory(PortfolioFactory)
    cryptocurrency = factory.SubFactory(CryptocurrencyFactory)
    quantity = Decimal('1.0')
    average_purchase_price = factory.LazyAttribute(lambda obj: obj.cryptocurrency.current_price)

    @factory.lazy_attribute
    def total_cost_basis(self):
        return self.quantity * self.average_purchase_price


class TransactionFactory(DjangoModelFactory):
    """
    Creates a transaction record.

    Default transaction:
    - BUY type
    - 1.0 quantity
    - Price matches crypto current price
    - Occurred 1 day ago
    - Zero realized gain/loss (for buys)
    """
    class Meta:
        model = Transaction

    portfolio = factory.SubFactory(PortfolioFactory)
    cryptocurrency = factory.SubFactory(CryptocurrencyFactory)
    type = Transaction.TransactionType.BUY
    quantity = Decimal('1.0')
    price_per_unit = factory.LazyAttribute(lambda obj: obj.cryptocurrency.current_price)
    total_amount = factory.LazyAttribute(lambda obj: obj.quantity * obj.price_per_unit)
    realized_gain_loss = Decimal('0.00')
    timestamp = factory.LazyFunction(lambda: timezone.now() - timedelta(days=1))


class PriceHistoryFactory(DjangoModelFactory):
    """
    Creates a historical price point for a cryptocurrency.

    Default price point:
    - Price: $50,000
    - Timestamp: 1 day ago
    """
    class Meta:
        model = PriceHistory

    cryptocurrency = factory.SubFactory(CryptocurrencyFactory)
    price = Decimal('50000.00')
    timestamp = factory.LazyFunction(lambda: timezone.now() - timedelta(days=1))
