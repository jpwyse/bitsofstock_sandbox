from decimal import Decimal
from datetime import datetime
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
    current_price: Optional[Decimal] = None
    price_change_24h: Optional[Decimal] = None
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
    symbol: str
    name: str
    icon_url: str
    current_price: Decimal


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


# WebSocket Schemas
class PriceUpdateSchema(Schema):
    symbol: str
    price: Decimal
    change_24h: Decimal
    timestamp: datetime


class PriceUpdatesSchema(Schema):
    type: str
    data: dict