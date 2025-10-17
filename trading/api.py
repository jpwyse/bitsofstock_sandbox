from ninja import Router, Query
from ninja.errors import HttpError
from ninja.pagination import paginate, PageNumberPagination
from django.shortcuts import get_object_or_404
from decimal import Decimal
from typing import List, Optional
from datetime import datetime
from trading.models import Portfolio, Cryptocurrency, Holding, Transaction, User
from trading.schemas import (
    PortfolioSummarySchema,
    PortfolioHistorySchema,
    HoldingsListSchema,
    HoldingSchema,
    CryptocurrencySchema,
    CryptocurrencyDetailSchema,
    TransactionListSchema,
    TransactionSchema,
    BuyRequestSchema,
    SellRequestSchema,
    TradeResponseSchema,
)
from trading.services.trading import TradingService
from trading.services.portfolio import PortfolioService
from trading.services.coingecko import CoinGeckoService

# Create your api's here.

router = Router()

# Portfolio Endpoints

@router.get("/portfolio/summary", response=PortfolioSummarySchema, tags=["Portfolio"])
def get_portfolio_summary(request):
    """Get portfolio summary with total value and gain/loss"""
    # Get demo user's portfolio (hardcoded for sandbox)
    user = User.objects.first()
    if not user:
        raise HttpError(404, "No user found")
    
    portfolio = user.portfolio
    
    return {
        "cash_balance": portfolio.cash_balance,
        "total_holdings_value": portfolio.total_holdings_value,
        "total_portfolio_value": portfolio.total_value,
        "initial_investment": portfolio.initial_cash,
        "total_gain_loss": portfolio.total_gain_loss,
        "total_gain_loss_percentage": portfolio.total_gain_loss_percentage,
        "last_updated": datetime.now()
    }


@router.get("/portfolio/history", response=PortfolioHistorySchema, tags=["Portfolio"])
def get_portfolio_history(
    request,
    timeframe: str = Query(..., description="Timeframe: 1D, 5D, 1M, 6M, YTD, 1Y, 5Y, MAX")
):
    """Get historical portfolio values for charting"""
    user = User.objects.first()
    if not user:
        raise HttpError(404, "No user found")

    portfolio = user.portfolio

    valid_timeframes = ['1D', '5D', '1M', '6M', 'YTD', '1Y', '5Y', 'MAX']
    if timeframe not in valid_timeframes:
        raise HttpError(400, f"Invalid timeframe. Must be one of: {', '.join(valid_timeframes)}")

    data_points = PortfolioService.calculate_portfolio_history(portfolio, timeframe)

    return {
        "timeframe": timeframe,
        "data_points": data_points
    }


# Holdings Endpoints

@router.get("/holdings", response=HoldingsListSchema, tags=["Holdings"])
def get_holdings(request):
    """Get all cryptocurrency holdings"""
    user = User.objects.first()
    if not user:
        raise HttpError(404, "No user found")
    
    portfolio = user.portfolio
    holdings = portfolio.holdings.select_related('cryptocurrency').all()
    
    holdings_data = []
    for holding in holdings:
        holdings_data.append({
            "id": str(holding.id),
            "cryptocurrency": {
                "id": str(holding.cryptocurrency.id),
                "symbol": holding.cryptocurrency.symbol,
                "name": holding.cryptocurrency.name,
                "icon_url": holding.cryptocurrency.icon_url,
                "current_price": holding.cryptocurrency.current_price or Decimal('0')
            },
            "quantity": holding.quantity,
            "average_purchase_price": holding.average_purchase_price,
            "total_cost_basis": holding.total_cost_basis,
            "current_value": holding.current_value,
            "gain_loss": holding.gain_loss,
            "gain_loss_percentage": holding.gain_loss_percentage
        })
    
    return {"holdings": holdings_data}


# Cryptocurrency Endpoints

@router.get("/cryptocurrencies", response=List[CryptocurrencySchema], tags=["Cryptocurrencies"])
def get_cryptocurrencies(request):
    """Get all available cryptocurrencies"""
    cryptos = Cryptocurrency.objects.filter(is_active=True).all()
    
    return [
        {
            "id": str(crypto.id),
            "symbol": crypto.symbol,
            "name": crypto.name,
            "coingecko_id": crypto.coingecko_id,
            "icon_url": crypto.icon_url,
            "current_price": crypto.current_price,
            "price_change_24h": crypto.price_change_24h,
            "volume_24h": crypto.volume_24h,
            "market_cap": crypto.market_cap,
            "last_updated": crypto.last_updated
        }
        for crypto in cryptos
    ]


@router.get("/cryptocurrencies/{crypto_id}", response=CryptocurrencyDetailSchema, tags=["Cryptocurrencies"])
def get_cryptocurrency_detail(request, crypto_id: str):
    """Get detailed cryptocurrency information"""
    crypto = get_object_or_404(Cryptocurrency, id=crypto_id)
    
    # Get 7-day price history
    coingecko_service = CoinGeckoService()
    price_history = coingecko_service.get_historical_prices(crypto.coingecko_id, 7)
    
    return {
        "id": str(crypto.id),
        "symbol": crypto.symbol,
        "name": crypto.name,
        "coingecko_id": crypto.coingecko_id,
        "icon_url": crypto.icon_url,
        "current_price": crypto.current_price,
        "price_change_24h": crypto.price_change_24h,
        "volume_24h": crypto.volume_24h,
        "market_cap": crypto.market_cap,
        "last_updated": crypto.last_updated,
        "price_history_7d": price_history
    }


# Trading Endpoints

@router.post("/trades/buy", response=TradeResponseSchema, tags=["Trading"])
def execute_buy(request, payload: BuyRequestSchema):
    """Execute a buy order"""
    user = User.objects.first()
    if not user:
        return {
            "success": False,
            "error": "No user found"
        }
    
    portfolio = user.portfolio
    crypto = get_object_or_404(Cryptocurrency, id=payload.cryptocurrency_id)
    
    success, transaction, error = TradingService.execute_buy(
        portfolio=portfolio,
        cryptocurrency=crypto,
        amount_usd=payload.amount_usd,
        quantity=payload.quantity
    )
    
    if not success:
        return {
            "success": False,
            "error": error
        }
    
    # Refresh portfolio
    portfolio.refresh_from_db()
    
    return {
        "success": True,
        "transaction": {
            "id": str(transaction.id),
            "type": transaction.transaction_type,
            "cryptocurrency": {
                "symbol": crypto.symbol,
                "name": crypto.name,
                "icon_url": crypto.icon_url
            },
            "quantity": transaction.quantity,
            "price_per_unit": transaction.price_per_unit,
            "total_amount": transaction.total_amount,
            "timestamp": transaction.timestamp
        },
        "updated_portfolio": {
            "cash_balance": portfolio.cash_balance,
            "total_portfolio_value": portfolio.total_value
        }
    }


@router.post("/trades/sell", response=TradeResponseSchema, tags=["Trading"])
def execute_sell(request, payload: SellRequestSchema):
    """Execute a sell order"""
    user = User.objects.first()
    if not user:
        return {
            "success": False,
            "error": "No user found"
        }
    
    portfolio = user.portfolio
    crypto = get_object_or_404(Cryptocurrency, id=payload.cryptocurrency_id)
    
    success, transaction, error = TradingService.execute_sell(
        portfolio=portfolio,
        cryptocurrency=crypto,
        amount_usd=payload.amount_usd,
        quantity=payload.quantity
    )
    
    if not success:
        return {
            "success": False,
            "error": error
        }
    
    # Refresh portfolio
    portfolio.refresh_from_db()
    
    return {
        "success": True,
        "transaction": {
            "id": str(transaction.id),
            "type": transaction.transaction_type,
            "cryptocurrency": {
                "symbol": crypto.symbol,
                "name": crypto.name,
                "icon_url": crypto.icon_url
            },
            "quantity": transaction.quantity,
            "price_per_unit": transaction.price_per_unit,
            "total_amount": transaction.total_amount,
            "timestamp": transaction.timestamp
        },
        "updated_portfolio": {
            "cash_balance": portfolio.cash_balance,
            "total_portfolio_value": portfolio.total_value
        }
    }


# Transaction History Endpoints

@router.get("/transactions", response=List[TransactionSchema], tags=["Transactions"])
@paginate(PageNumberPagination, page_size=20)
def get_transactions(
    request,
    type: Optional[str] = Query(None, description="Filter by type: ALL, BUY, SELL")
):
    """Get transaction history with pagination"""
    user = User.objects.first()
    if not user:
        return []

    portfolio = user.portfolio
    transactions = Transaction.objects.filter(portfolio=portfolio).select_related('cryptocurrency')

    # Filter by type
    if type and type != 'ALL':
        transactions = transactions.filter(transaction_type=type)

    return [
        {
            "id": str(txn.id),
            "type": txn.transaction_type,
            "cryptocurrency": {
                "symbol": txn.cryptocurrency.symbol,
                "name": txn.cryptocurrency.name,
                "icon_url": txn.cryptocurrency.icon_url
            },
            "quantity": txn.quantity,
            "price_per_unit": txn.price_per_unit,
            "total_amount": txn.total_amount,
            "timestamp": txn.timestamp
        }
        for txn in transactions
    ]