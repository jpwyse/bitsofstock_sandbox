"""
Django models for the crypto trading sandbox application.

This module defines the core data models for managing users, portfolios, cryptocurrency
holdings, transactions, and price history in a sandbox trading environment.

Key Features:
    - Timezone-aware timestamps (USE_TZ=True)
    - Decimal precision for monetary values (2 places for USD, 8 for crypto quantities)
    - Sandbox assumptions: back-dated trades allowed via timestamp field on Transaction
    - Cost basis tracking using weighted average purchase price
    - Realized P&L computation on SELL transactions

Models:
    User: Demo user accounts with personal and account information
    Portfolio: User's cash and holdings container
    Cryptocurrency: Asset definitions with market data integration
    Holding: User's current crypto positions with cost basis
    Transaction: Historical buy/sell records with realized gains
    PriceHistory: Time-series price data for charting

External Dependencies:
    - CoinGecko: Live price updates (current_price, market_cap, etc.)
    - yfinance: Historical price data (via PriceHistory or direct API calls)

Notes:
    - All monetary amounts use Decimal for precision
    - Timestamps are timezone-aware (auto_now_add, default=timezone.now)
    - Indexes optimized for common queries (portfolio lookup, time-series)
"""
import uuid
from decimal import Decimal
from django.db import models
from django.core.validators import MinValueValidator
from django.utils import timezone

class User(models.Model):
    """
    Demo user account for the sandbox trading environment.

    Represents a user with personal information and account details. In this sandbox,
    users are demo accounts without authentication (no password field). Each user has
    a one-to-one relationship with a Portfolio.

    Attributes:
        id (UUID): Primary key, auto-generated UUID
        username (str): Unique identifier for the user (max 150 chars)
        email (str): Unique email address
        first_name (str): User's first name (optional)
        last_name (str): User's last name (optional)
        address (str): Street address (optional)
        city (str): City (optional)
        state (str): State or province (optional)
        zip_code (str): ZIP or postal code (optional, max 20 chars)
        date_of_birth (date): User's date of birth (optional)
        country (str): Country of residence (optional)
        account_number (str): 11-digit account identifier (optional)
        account_type (str): Account type choice (INDIVIDUAL, JOINT, or CORPORATE)
        created_at (datetime): Account creation timestamp (timezone-aware, auto-set)
        updated_at (datetime): Last modification timestamp (timezone-aware, auto-updated)

    Relationships:
        portfolio (Portfolio): One-to-one relationship to user's portfolio

    Notes:
        - No password field: sandbox assumes pre-authenticated demo users
        - All timestamps are timezone-aware (USE_TZ=True in settings)
        - Username and email must be unique
    """

    class AccountType(models.TextChoices):
        INDIVIDUAL = 'INDIVIDUAL', 'Individual'
        JOINT = 'JOINT', 'Joint'
        CORPORATE = 'CORPORATE', 'Corporate'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    username = models.CharField(max_length=150, unique=True)
    email = models.EmailField(unique=True)
    first_name = models.CharField(max_length=150, null=True, blank=True)
    last_name = models.CharField(max_length=150, null=True, blank=True)
    address = models.TextField(null=True, blank=True)
    city = models.CharField(max_length=100, null=True, blank=True)
    state = models.CharField(max_length=100, null=True, blank=True)
    zip_code = models.CharField(max_length=20, null=True, blank=True)
    date_of_birth = models.DateField(null=True, blank=True)
    country = models.CharField(max_length=100, null=True, blank=True)
    account_number = models.CharField(
        max_length=11,
        null=True,
        blank=True,
        help_text="11-digit account number"
    )
    account_type = models.CharField(
        max_length=20,
        choices=AccountType.choices,
        default=AccountType.INDIVIDUAL,
        help_text="Type of account"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.username


class Portfolio(models.Model):
    """
    User's investment portfolio containing cash balance and cryptocurrency holdings.

    Tracks the user's available cash (USD) and serves as the container for all
    cryptocurrency holdings (Holding model). Provides computed properties for
    portfolio valuation, gains/losses, and performance metrics.

    Attributes:
        id (UUID): Primary key, auto-generated UUID
        user (User): One-to-one relationship to the owning user
        cash_balance (Decimal): Available USD balance (15 digits, 2 decimal places)
        initial_cash (Decimal): Starting cash amount for P&L baseline (default $10,000)
        created_at (datetime): Portfolio creation timestamp (timezone-aware, auto-set)
        updated_at (datetime): Last modification timestamp (timezone-aware, auto-updated)

    Relationships:
        user (User): One-to-one relationship (CASCADE delete)
        holdings (Holding): Reverse FK to user's cryptocurrency positions

    Computed Properties:
        total_holdings_value (Decimal): Sum of current market value of all holdings
        total_value (Decimal): Cash + holdings market value
        total_gain_loss (Decimal): Portfolio P&L in dollars (total_value - initial_cash)
        total_gain_loss_percentage (Decimal): Portfolio return as percentage

    Constraints:
        - cash_balance must be >= 0.00 (enforced by MinValueValidator)
        - Monetary precision: 15 total digits, 2 decimal places (supports up to $9,999,999,999,999.99)

    Notes:
        - initial_cash represents the cost basis for portfolio-level P&L
        - In sandbox mode, cost basis is simply initial_cash (no deposits/withdrawals modeled)
        - created_at timestamp used for portfolio inception in time-series charts
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='portfolio')
    cash_balance = models.DecimalField(
        max_digits=15, 
        decimal_places=2, 
        default=Decimal('10000.00'),
        validators=[MinValueValidator(Decimal('0.00'))]
    )
    initial_cash = models.DecimalField(
        max_digits=15, 
        decimal_places=2, 
        default=Decimal('10000.00')
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.user.username}'s Portfolio | {self.created_at.date()}"

    @property
    def total_holdings_value(self):
        """Calculate total value of all holdings"""
        return sum(
            holding.current_value 
            for holding in self.holdings.all()
        )

    @property
    def total_value(self):
        """Cash + Holdings value"""
        return self.cash_balance + self.total_holdings_value

    @property
    def total_gain_loss(self):
        """Total profit/loss in dollars"""
        # Cost basis = initial cash + all money added - all money withdrawn
        # For sandbox, cost basis is just initial_cash
        return self.total_value - self.initial_cash

    @property
    def total_gain_loss_percentage(self):
        """Total profit/loss as percentage"""
        if self.initial_cash == 0:
            return Decimal('0.00')
        return (self.total_gain_loss / self.initial_cash) * 100


class Cryptocurrency(models.Model):
    """
    Cryptocurrency asset definition with real-time market data integration.

    Represents a tradable cryptocurrency asset with market data sourced from external
    APIs (CoinGecko for live prices, yfinance for historical data). Supports categorization
    for filtering and organization (e.g., stablecoins, DeFi, meme coins).

    Attributes:
        id (UUID): Primary key, auto-generated UUID
        symbol (str): Trading symbol (e.g., 'BTC', 'ETH'), max 10 chars, indexed
        name (str): Full name (e.g., 'Bitcoin', 'Ethereum'), max 100 chars
        coingecko_id (str): CoinGecko API identifier for price lookups (unique, max 50 chars)
        yfinance_symbol (str): Yahoo Finance ticker for historical data (e.g., 'BTC-USD', optional)
        icon_url (str): URL to cryptocurrency icon/logo image (max 500 chars)
        category (str): Asset category (CRYPTO, STABLECOIN, DEFI, NFT, MEME), indexed
        current_price (Decimal): Latest USD price (20 digits, 8 decimal places, nullable)
        price_change_24h (Decimal): 24-hour price change percentage (nullable)
        volume_24h (Decimal): 24-hour trading volume in USD (nullable)
        market_cap (Decimal): Market capitalization in USD (nullable)
        last_updated (datetime): Timestamp of last price update (timezone-aware, nullable)
        is_active (bool): Whether asset is currently tradable (default True)
        created_at (datetime): Asset creation timestamp (timezone-aware, auto-set)

    Relationships:
        holdings (Holding): Reverse FK to user holdings of this cryptocurrency
        transactions (Transaction): Reverse FK to trades involving this cryptocurrency
        price_history (PriceHistory): Reverse FK to historical price records

    Indexes:
        - symbol (db_index=True): Fast lookup by trading symbol
        - category (db_index=True): Efficient filtering by category

    Constraints:
        - symbol must be unique
        - coingecko_id must be unique
        - Price precision: 8 decimal places (supports micro-priced assets)
        - Volume/market_cap precision: 2 decimal places (USD amounts)

    External APIs:
        - CoinGecko: Provides current_price, price_change_24h, volume_24h, market_cap
        - yfinance: Provides historical price data via yfinance_symbol mapping

    Notes:
        - Symbol mapping: BTC → 'BTC-USD' for yfinance historical data
        - Prices update via CoinGecko API integration (see services/coingecko.py)
        - Market data fields are nullable as they depend on external API availability
        - Decimal precision prevents floating-point errors in financial calculations
    """

    class Category(models.TextChoices):
        CRYPTO = 'CRYPTO', 'Cryptocurrency'
        STABLECOIN = 'STABLECOIN', 'Stablecoin'
        DEFI = 'DEFI', 'DeFi'
        NFT = 'NFT', 'NFT'
        MEME = 'MEME', 'Meme'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    symbol = models.CharField(max_length=10, unique=True, db_index=True)
    name = models.CharField(max_length=100)
    coingecko_id = models.CharField(max_length=50, unique=True)
    yfinance_symbol = models.CharField(
        max_length=20,
        null=True,
        blank=True,
        help_text="Yahoo Finance ticker symbol (e.g., BTC-USD)"
    )
    icon_url = models.URLField(max_length=500)
    category = models.CharField(
        max_length=20,
        choices=Category.choices,
        default=Category.CRYPTO,
        db_index=True,
        help_text="Category of cryptocurrency for filtering and organization"
    )
    current_price = models.DecimalField(
        max_digits=20,
        decimal_places=8,
        null=True,
        blank=True
    )
    price_change_24h = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True
    )
    volume_24h = models.DecimalField(
        max_digits=20,
        decimal_places=2,
        null=True,
        blank=True
    )
    market_cap = models.DecimalField(
        max_digits=20,
        decimal_places=2,
        null=True,
        blank=True
    )
    last_updated = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name_plural = "cryptocurrencies"
        ordering = ['symbol']

    def __str__(self):
        return f"{self.symbol} - {self.name}"


class Holding(models.Model):
    """
    User's cryptocurrency holdings with cost basis tracking.

    Represents a user's position in a specific cryptocurrency, tracking the quantity owned,
    average purchase price, and total cost basis. Provides computed properties for current
    market value and unrealized gains/losses.

    Cost Basis Method:
        Weighted average purchase price: When buying more of the same crypto, the average
        purchase price is recalculated as (total_cost_basis + new_cost) / (quantity + new_quantity).
        This simplifies P&L calculations and is appropriate for sandbox trading.

    Attributes:
        id (UUID): Primary key, auto-generated UUID
        portfolio (Portfolio): Reference to the owning portfolio (CASCADE delete)
        cryptocurrency (Cryptocurrency): Reference to the held asset (PROTECT delete)
        quantity (Decimal): Amount of cryptocurrency owned (20 digits, 8 decimal places)
        average_purchase_price (Decimal): Weighted average cost per unit (20 digits, 8 decimal places)
        total_cost_basis (Decimal): Total USD invested (quantity * avg_price, 2 decimal places)
        created_at (datetime): Holding creation timestamp (timezone-aware, auto-set)
        updated_at (datetime): Last modification timestamp (timezone-aware, auto-updated)

    Relationships:
        portfolio (Portfolio): Many-to-one relationship (user's portfolio)
        cryptocurrency (Cryptocurrency): Many-to-one relationship (asset being held)

    Computed Properties:
        current_value (Decimal): Market value at current price (quantity * cryptocurrency.current_price)
        gain_loss (Decimal): Unrealized P&L in dollars (current_value - total_cost_basis)
        gain_loss_percentage (Decimal): Unrealized return as percentage

    Constraints:
        - quantity must be >= 0.00000001 (enforced by MinValueValidator)
        - Unique constraint on (portfolio, cryptocurrency): one holding per asset per user
        - PROTECT on cryptocurrency deletion: prevents orphaned holdings
        - Precision: 8 decimal places for quantity (supports fractional crypto)

    Indexes:
        - Composite unique index: (portfolio, cryptocurrency)
        - Default ordering: By total_cost_basis descending (largest positions first)

    Notes:
        - Cost basis updates on each BUY transaction via weighted average
        - Selling reduces quantity and cost basis proportionally
        - current_value depends on live cryptocurrency.current_price from CoinGecko
        - Zero-quantity holdings are deleted automatically after SELL transactions
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    portfolio = models.ForeignKey(
        Portfolio, 
        on_delete=models.CASCADE, 
        related_name='holdings'
    )
    cryptocurrency = models.ForeignKey(
        Cryptocurrency, 
        on_delete=models.PROTECT,
        related_name='holdings'
    )
    quantity = models.DecimalField(
        max_digits=20, 
        decimal_places=8,
        validators=[MinValueValidator(Decimal('0.00000001'))]
    )
    average_purchase_price = models.DecimalField(
        max_digits=20, 
        decimal_places=8
    )
    total_cost_basis = models.DecimalField(
        max_digits=20, 
        decimal_places=2
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('portfolio', 'cryptocurrency')
        ordering = ['-total_cost_basis']

    def __str__(self):
        return f"{self.portfolio.user.username} - {self.cryptocurrency.symbol}: {self.quantity}"

    @property
    def current_value(self):
        """Current market value of holding"""
        if self.cryptocurrency.current_price:
            return self.quantity * self.cryptocurrency.current_price
        return Decimal('0.00')

    @property
    def gain_loss(self):
        """Profit/loss in dollars"""
        return self.current_value - self.total_cost_basis

    @property
    def gain_loss_percentage(self):
        """Profit/loss as percentage"""
        if self.total_cost_basis == 0:
            return Decimal('0.00')
        return (self.gain_loss / self.total_cost_basis) * 100


class Transaction(models.Model):
    """
    Historical buy/sell transaction record with realized P&L tracking.

    Records all cryptocurrency trades with complete details including quantity, price,
    timestamp, and realized gains/losses (for SELL transactions). Supports back-dated
    trades via manual timestamp field, enabling sandbox flexibility.

    Realized P&L Calculation:
        - BUY transactions: realized_gain_loss = 0 (no P&L until sold)
        - SELL transactions: realized_gain_loss = (sell_price - avg_cost_basis) * quantity
        - Uses holding's average_purchase_price as cost basis at time of sale

    Attributes:
        id (UUID): Primary key, auto-generated UUID
        portfolio (Portfolio): Reference to the owning portfolio (CASCADE delete)
        cryptocurrency (Cryptocurrency): Reference to the traded asset (PROTECT delete)
        transaction_type (str): Transaction type (BUY or SELL)
        quantity (Decimal): Amount of cryptocurrency traded (20 digits, 8 decimal places)
        price_per_unit (Decimal): Execution price per unit (20 digits, 8 decimal places)
        total_amount (Decimal): Total USD value (quantity * price_per_unit, 2 decimal places)
        timestamp (datetime): Transaction timestamp (timezone-aware, defaults to now, indexed)
        realized_gain_loss (Decimal): Realized P&L for SELL, 0 for BUY (2 decimal places, nullable)

    Relationships:
        portfolio (Portfolio): Many-to-one relationship (user's portfolio)
        cryptocurrency (Cryptocurrency): Many-to-one relationship (asset being traded)

    Indexes:
        - timestamp (db_index=True, DESC): Fast chronological queries
        - Composite: (portfolio, timestamp DESC): User's transaction history
        - Composite: (cryptocurrency, timestamp DESC): Asset-specific trade history
        - Default ordering: By timestamp descending (most recent first)

    Constraints:
        - quantity must be >= 0.00000001 (enforced by MinValueValidator)
        - timestamp allows back-dating (sandbox feature for testing historical scenarios)
        - PROTECT on cryptocurrency deletion: preserves transaction history

    Sandbox Features:
        - Back-dated trades: timestamp field accepts past dates for historical testing
        - Future extension: Add fees/commissions field (currently not modeled)

    Notes:
        - Transactions are immutable once created (no UPDATE operations)
        - timestamp uses timezone.now as default but can be overridden
        - All timestamps are timezone-aware (USE_TZ=True in settings)
        - realized_gain_loss populated by TradingService during SELL execution
        - Precision: 8 decimal places for quantity, 2 for USD amounts
    """
    
    class TransactionType(models.TextChoices):
        BUY = 'BUY', 'Buy'
        SELL = 'SELL', 'Sell'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    portfolio = models.ForeignKey(
        Portfolio, 
        on_delete=models.CASCADE, 
        related_name='transactions'
    )
    cryptocurrency = models.ForeignKey(
        Cryptocurrency, 
        on_delete=models.PROTECT,
        related_name='transactions'
    )
    transaction_type = models.CharField(
        max_length=4, 
        choices=TransactionType.choices
    )
    quantity = models.DecimalField(
        max_digits=20, 
        decimal_places=8,
        validators=[MinValueValidator(Decimal('0.00000001'))]
    )
    price_per_unit = models.DecimalField(
        max_digits=20, 
        decimal_places=8
    )
    total_amount = models.DecimalField(
        max_digits=20,
        decimal_places=2
    )
    timestamp = models.DateTimeField(default=timezone.now, db_index=True)
    realized_gain_loss = models.DecimalField(
        max_digits=20,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Realized gain or loss from this trade (0 for BUY, calculated for SELL). Future extension: fees/commissions."
    )

    class Meta:
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['-timestamp']),
            models.Index(fields=['portfolio', '-timestamp']),
            models.Index(fields=['cryptocurrency', '-timestamp']),
        ]

    def __str__(self):
        return f"{self.transaction_type} {self.quantity} {self.cryptocurrency.symbol} @ ${self.price_per_unit} | {self.timestamp}"


class PriceHistory(models.Model):
    """
    Time-series historical price data for cryptocurrency charting.

    Stores snapshots of cryptocurrency prices at specific timestamps for rendering
    historical price charts. Data typically sourced from yfinance or other market
    data providers.

    Attributes:
        id (UUID): Primary key, auto-generated UUID
        cryptocurrency (Cryptocurrency): Reference to the asset (CASCADE delete)
        price (Decimal): USD price at timestamp (20 digits, 8 decimal places)
        timestamp (datetime): Price snapshot timestamp (timezone-aware, indexed)

    Relationships:
        cryptocurrency (Cryptocurrency): Many-to-one relationship

    Indexes:
        - timestamp (db_index=True): Fast time-series queries
        - Composite: (cryptocurrency, timestamp DESC): Asset-specific price history
        - Unique constraint: (cryptocurrency, timestamp): One price per asset per timestamp
        - Default ordering: By timestamp descending (most recent first)

    Constraints:
        - Unique constraint prevents duplicate price records for same asset/time
        - timestamp is timezone-aware (USE_TZ=True in settings)
        - Price precision: 8 decimal places (supports micro-priced assets)

    Notes:
        - Typically populated via yfinance service for historical data
        - May be supplemented with CoinGecko historical API
        - Used by ViewChartModal for rendering price charts with multiple timeframes
        - CASCADE delete: Removes price history when cryptocurrency is deleted
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    cryptocurrency = models.ForeignKey(
        Cryptocurrency, 
        on_delete=models.CASCADE,
        related_name='price_history'
    )
    price = models.DecimalField(max_digits=20, decimal_places=8)
    timestamp = models.DateTimeField(db_index=True)

    class Meta:
        verbose_name_plural = "price histories"
        unique_together = ('cryptocurrency', 'timestamp')
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['cryptocurrency', '-timestamp']),
        ]

    def __str__(self):
        return f"{self.cryptocurrency.symbol} - ${self.price} at {self.timestamp}"