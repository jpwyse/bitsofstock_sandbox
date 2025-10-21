"""
Django Ninja schemas for request/response serialization.

This module defines Pydantic-based schemas for API request validation and response
serialization using django-ninja. Each schema maps to Django models or API contracts,
ensuring type safety and automatic validation.

Schema Categories:
    - Cryptocurrency: Asset details and market data
    - Portfolio: User portfolio summary and history
    - Holdings: Current positions with P&L
    - Transactions: Trade history and pagination
    - Trading: Buy/sell requests and responses
    - Price History: Time-series data for charts
    - News: Market news articles from Finnhub
    - User Account: Personal and account information
    - WebSocket: Real-time price update events

Data Precision:
    - Decimal fields for all monetary values (no floats for currency)
    - USD amounts: 2 decimal places (e.g., cash_balance, total_amount)
    - Crypto quantities: 8 decimal places (e.g., quantity, price)
    - Percentages: 2 decimal places (e.g., gain_loss_percentage)

Nullability:
    - Optional fields marked with Optional[Type] = None/default
    - Required fields have no default value
    - Empty lists use [] as default for better client ergonomics

Timezone Handling:
    - All datetime fields are timezone-aware (USE_TZ=True)
    - Client receives ISO 8601 format with timezone offset
    - UNIX timestamps (int) used for external API compatibility (e.g., Finnhub news)

Notes:
    - Schemas validate incoming JSON payloads (POST/PUT requests)
    - Response schemas control JSON serialization
    - Nested schemas avoid N+1 queries via select_related/prefetch_related
    - UUIDs serialized as strings in JSON responses
"""
from decimal import Decimal
from datetime import datetime, date
from typing import Optional, List
from ninja import Schema


# Cryptocurrency Schemas
class CryptocurrencySchema(Schema):
    """
    Cryptocurrency asset response schema.

    Fields:
        id: UUID as string
        symbol: Trading symbol (e.g., 'BTC', 'ETH')
        name: Full name (e.g., 'Bitcoin')
        coingecko_id: CoinGecko API identifier
        icon_url: URL to asset icon/logo
        category: Asset category (CRYPTO, STABLECOIN, DEFI, NFT, MEME), defaults to 'CRYPTO'
        current_price: Latest USD price (8 decimals, nullable)
        price_change_24h: 24h change percentage (2 decimals, nullable)
        volume_24h: 24h volume in USD (2 decimals, nullable)
        market_cap: Market cap in USD (2 decimals, nullable)
        last_updated: Last price update timestamp (timezone-aware, nullable)

    Notes:
        - Market data fields (price, volume, market_cap) may be null if external API unavailable
        - Used for /cryptocurrencies list endpoint
        - Prices sourced from CoinGecko API
    """
    id: str
    symbol: str
    name: str
    coingecko_id: str
    icon_url: str
    category: Optional[str] = 'CRYPTO'
    current_price: Optional[Decimal] = None
    price_change_24h: Optional[Decimal] = None
    volume_24h: Optional[Decimal] = None
    market_cap: Optional[Decimal] = None
    last_updated: Optional[datetime] = None


class CryptocurrencyDetailSchema(CryptocurrencySchema):
    price_history_7d: List['PricePointSchema'] = []


# Portfolio Schemas
class PortfolioSummarySchema(Schema):
    """
    Portfolio summary response with valuation and P&L metrics.

    Fields:
        cash_balance: Available USD (2 decimals)
        total_holdings_value: Market value of all crypto holdings (2 decimals)
        total_portfolio_value: Cash + holdings value (2 decimals)
        initial_investment: Cost basis for P&L calculation (2 decimals)
        total_gain_loss: Unrealized P&L in USD (2 decimals)
        total_gain_loss_percentage: Unrealized return as percentage (2 decimals)
        last_updated: Timestamp of last update (timezone-aware)

    Notes:
        - total_gain_loss = total_portfolio_value - initial_investment
        - Computed from Portfolio model properties
        - Used by /portfolio/summary endpoint
    """
    cash_balance: Decimal
    total_holdings_value: Decimal
    total_portfolio_value: Decimal
    initial_investment: Decimal
    total_gain_loss: Decimal
    total_gain_loss_percentage: Decimal
    last_updated: datetime


class PortfolioHistoryPointSchema(Schema):
    timestamp: datetime
    portfolio_value: Decimal


class PortfolioHistorySchema(Schema):
    timeframe: str
    data_points: List[PortfolioHistoryPointSchema]


# Holdings Schemas
class HoldingCryptoSchema(Schema):
    id: str
    symbol: str
    name: str
    icon_url: str
    current_price: Decimal
    volume_24h: Optional[Decimal] = None
    market_cap: Optional[Decimal] = None


class HoldingSchema(Schema):
    id: str
    cryptocurrency: HoldingCryptoSchema
    quantity: Decimal
    average_purchase_price: Decimal
    total_cost_basis: Decimal
    current_value: Decimal
    gain_loss: Decimal
    gain_loss_percentage: Decimal


class HoldingsListSchema(Schema):
    holdings: List[HoldingSchema]


# Transaction Schemas
class TransactionCryptoSchema(Schema):
    symbol: str
    name: str
    icon_url: str


class TransactionSchema(Schema):
    id: str
    type: str
    cryptocurrency: TransactionCryptoSchema
    quantity: Decimal
    price_per_unit: Decimal
    total_amount: Decimal
    timestamp: datetime
    realized_gain_loss: Optional[Decimal] = None


class TransactionListSchema(Schema):
    count: int
    next: Optional[str] = None
    previous: Optional[str] = None
    results: List[TransactionSchema]


# Trading Schemas
class BuyRequestSchema(Schema):
    """
    Buy trade request schema.

    Fields:
        cryptocurrency_id: UUID of cryptocurrency to buy (as string, required)
        amount_usd: USD amount to spend (2 decimals, optional)
        quantity: Crypto quantity to buy (8 decimals, optional)

    Validation:
        - Either amount_usd OR quantity must be provided (not both, not neither)
        - If amount_usd provided, quantity calculated from current price
        - If quantity provided, USD cost calculated from current price
        - Backend validates sufficient cash_balance

    Notes:
        - Current price sourced from cryptocurrency.current_price (CoinGecko)
        - Request processed by TradingService.execute_buy()
    """
    cryptocurrency_id: str
    amount_usd: Optional[Decimal] = None
    quantity: Optional[Decimal] = None


class SellRequestSchema(Schema):
    """
    Sell trade request schema.

    Fields:
        cryptocurrency_id: UUID of cryptocurrency to sell (as string, required)
        amount_usd: USD value to sell (2 decimals, optional)
        quantity: Crypto quantity to sell (8 decimals, optional)

    Validation:
        - Either amount_usd OR quantity must be provided (not both, not neither)
        - If amount_usd provided, quantity calculated from current price
        - If quantity provided, USD proceeds calculated from current price
        - Backend validates sufficient holdings quantity

    Notes:
        - Current price sourced from cryptocurrency.current_price (CoinGecko)
        - Realized P&L calculated using holding's average_purchase_price
        - Request processed by TradingService.execute_sell()
    """
    cryptocurrency_id: str
    amount_usd: Optional[Decimal] = None
    quantity: Optional[Decimal] = None


class UpdatedPortfolioSchema(Schema):
    cash_balance: Decimal
    total_portfolio_value: Decimal


class TradeResponseSchema(Schema):
    success: bool
    transaction: Optional[TransactionSchema] = None
    updated_portfolio: Optional[UpdatedPortfolioSchema] = None
    error: Optional[str] = None


# Price History Schema
class PricePointSchema(Schema):
    timestamp: datetime
    price: Decimal


# Market Price History Schema (for yfinance data)
class MarketPricePointSchema(Schema):
    date: str  # YYYY-MM-DD format
    price: Decimal
    timestamp: Optional[str] = None  # YYYY-MM-DD HH:MM:SS format for intraday


# News Schemas
class NewsArticleSchema(Schema):
    id: int
    datetime: int  # UNIX timestamp
    headline: str
    image: Optional[str] = ''
    summary: str
    url: str
    source: Optional[str] = ''


# User Account Schema
class UserAccountSchema(Schema):
    # Personal Information
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    username: str
    email: str
    date_of_birth: Optional[date] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    country: Optional[str] = None
    # Account Information
    account_number: Optional[str] = None
    account_type: Optional[str] = None


# WebSocket Schemas
class PriceUpdateSchema(Schema):
    symbol: str
    price: Decimal
    change_24h: Decimal
    timestamp: datetime


class PriceUpdatesSchema(Schema):
    type: str
    data: dict