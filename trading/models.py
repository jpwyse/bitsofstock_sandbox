import uuid
from decimal import Decimal
from django.db import models
from django.core.validators import MinValueValidator
from django.utils import timezone

# Create your models here.

class User(models.Model):
    """Demo user for sandbox"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    username = models.CharField(max_length=150, unique=True)
    email = models.EmailField(unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.username


class Portfolio(models.Model):
    """User's portfolio containing cash and holdings"""
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
    """Cryptocurrency information"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    symbol = models.CharField(max_length=10, unique=True, db_index=True)
    name = models.CharField(max_length=100)
    coingecko_id = models.CharField(max_length=50, unique=True)
    icon_url = models.URLField(max_length=500)
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
    """User's cryptocurrency holdings"""
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
    """Buy/Sell transaction record"""
    
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
    """Historical cryptocurrency prices"""
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