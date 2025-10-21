from decimal import Decimal
from datetime import datetime, date
from typing import Optional, List
from ninja import Schema

# Create your schemas here.


# Cryptocurrency Schemas
class CryptocurrencySchema(Schema):
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
    cryptocurrency_id: str
    amount_usd: Optional[Decimal] = None
    quantity: Optional[Decimal] = None


class SellRequestSchema(Schema):
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