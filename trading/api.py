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
    NewsArticleSchema,
    MarketPricePointSchema,
    UserAccountSchema,
)
from trading.services.trading import TradingService
from trading.services.portfolio import PortfolioService
from trading.services.coingecko import CoinGeckoService
from trading.services.finnhub import FinnhubService
from trading.services.yfinance import YFinanceService

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
    timeframe: str = Query(..., description="Timeframe: 1D, 5D, 1M, 3M, 6M, YTD")
):
    """
    Get historical portfolio values for charting.

    Portfolio time-series are capped at YTD (year-to-date) as the maximum lookback.
    This restriction is portfolio-specific; market/asset modules may still support
    longer timeframes (1Y, 5Y, MAX).

    Supported timeframes:
    - 1D: Last 24 hours (hourly intervals)
    - 5D: Last 5 days (hourly intervals)
    - 1M: Last 30 days (daily intervals)
    - 3M: Last 90 days (daily intervals)
    - 6M: Last 180 days (daily intervals)
    - YTD: Year-to-date (daily intervals)
    """
    user = User.objects.first()
    if not user:
        raise HttpError(404, "No user found")

    portfolio = user.portfolio

    # PORTFOLIO-SPECIFIC: YTD is the maximum timeframe
    # (Market/asset endpoints may still use 1Y, 5Y, MAX)
    valid_timeframes = ['1D', '5D', '1M', '3M', '6M', 'YTD']
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
                "current_price": holding.cryptocurrency.current_price or Decimal('0'),
                "volume_24h": holding.cryptocurrency.volume_24h,
                "market_cap": holding.cryptocurrency.market_cap
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
            "category": crypto.category,
            "current_price": crypto.current_price or Decimal('0'),
            "price_change_24h": crypto.price_change_24h or Decimal('0'),
            "volume_24h": crypto.volume_24h or Decimal('0'),
            "market_cap": crypto.market_cap or Decimal('0'),
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
        "category": crypto.category,
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
            "timestamp": transaction.timestamp,
            "realized_gain_loss": transaction.realized_gain_loss
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
            "timestamp": transaction.timestamp,
            "realized_gain_loss": transaction.realized_gain_loss
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
            "timestamp": txn.timestamp,
            "realized_gain_loss": txn.realized_gain_loss
        }
        for txn in transactions
    ]


# News Endpoints

@router.get("/news/crypto", response=List[NewsArticleSchema], tags=["News"])
def get_crypto_news(
    request,
    limit: int = Query(10, description="Number of articles to return (default 10)")
):
    """
    Get cryptocurrency news from Finnhub.

    Returns a list of normalized news articles with fields:
    - id: Article ID
    - datetime: UNIX timestamp
    - headline: Article headline
    - image: Image URL (optional)
    - summary: Article summary (HTML-sanitized)
    - url: Article URL
    - source: News source (optional)
    """
    try:
        finnhub_service = FinnhubService()
        articles = finnhub_service.get_crypto_news(limit=limit)
        return articles
    except Exception as e:
        # Map upstream errors to 502 (Bad Gateway), not 500
        raise HttpError(502, f"Upstream news provider error: {str(e)}")


# User Endpoints

@router.get("/user/account", response=UserAccountSchema, tags=["User"])
def get_user_account(request):
    """
    Get current user's account information including personal and account details.

    Returns all user profile fields. Missing/null fields will be returned as null
    and should be displayed as "N/A" on the frontend.
    """
    # Get demo user (same pattern as /portfolio/summary)
    user = User.objects.first()
    if not user:
        raise HttpError(404, "No user found")

    return {
        # Personal Information
        "first_name": user.first_name,
        "last_name": user.last_name,
        "username": user.username,
        "email": user.email,
        "date_of_birth": user.date_of_birth,
        "address": user.address,
        "city": user.city,
        "state": user.state,
        "zip_code": user.zip_code,
        "country": user.country,
        # Account Information
        "account_number": user.account_number,
        "account_type": user.account_type,
    }


# Market Endpoints

@router.get("/market/crypto/history", response=List[MarketPricePointSchema], tags=["Market"])
def get_crypto_price_history(
    request,
    symbol: str = Query(..., description="Cryptocurrency symbol (e.g., BTC)"),
    timeframe: str = Query("1Y", description="Timeframe: 1D, 5D, 1M, 3M, 6M, YTD, 1Y, 5Y, ALL")
):
    """
    Get historical price data for a cryptocurrency using yfinance.

    Supports timeframes from 1 day to maximum available history.
    Data is fetched from Yahoo Finance and returned with daily or intraday intervals
    depending on the timeframe selected.

    Returns a list of price points with date (YYYY-MM-DD) and price (Decimal).
    """
    # Validate timeframe
    valid_timeframes = ['1D', '5D', '1M', '3M', '6M', 'YTD', '1Y', '5Y', 'ALL']
    if timeframe not in valid_timeframes:
        raise HttpError(400, f"Invalid timeframe. Must be one of: {', '.join(valid_timeframes)}")

    try:
        # Get cryptocurrency from database to access yfinance_symbol if available
        crypto = Cryptocurrency.objects.filter(symbol=symbol.upper()).first()

        if not crypto:
            raise HttpError(404, f"Cryptocurrency '{symbol}' not found")

        # Use yfinance_symbol from model if available, otherwise fallback to service mapping
        yf_symbol = crypto.yfinance_symbol if crypto.yfinance_symbol else None

        # Fetch price history using yfinance service
        price_data = YFinanceService.fetch_price_history(
            symbol=symbol,
            timeframe=timeframe,
            yfinance_symbol=yf_symbol
        )

        return price_data

    except HttpError:
        # Re-raise HTTP errors as-is
        raise
    except ValueError as e:
        raise HttpError(400, str(e))
    except Exception as e:
        raise HttpError(502, f"Upstream price service unavailable: {str(e)}")