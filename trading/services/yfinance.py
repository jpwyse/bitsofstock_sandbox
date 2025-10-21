import yfinance as yf
import pandas as pd
from decimal import Decimal
from typing import List, Dict


class YFinanceService:
    """Service for fetching cryptocurrency price data from yfinance"""

    # Symbol mapping: App symbols -> yfinance tickers
    # Maps all cryptocurrencies currently in the database
    SYMBOL_MAP = {
        'BTC': 'BTC-USD',
        'ETH': 'ETH-USD',
        'SOL': 'SOL-USD',
        'USDC': 'USDC-USD',
        'XRP': 'XRP-USD',
    }

    # Timeframe mapping using yfinance's built-in period/interval parameters
    TIMEFRAME_MAP = {
        '1D': {'period': '1d', 'interval': '5m'},    # 1 day, 5-min intervals
        '5D': {'period': '5d', 'interval': '15m'},   # 5 days, 15-min intervals
        '1M': {'period': '1mo', 'interval': '1d'},   # 1 month, daily
        '3M': {'period': '3mo', 'interval': '1d'},   # 3 months, daily
        '6M': {'period': '6mo', 'interval': '1d'},   # 6 months, daily
        'YTD': {'period': 'ytd', 'interval': '1d'},  # Year-to-date, daily
        '1Y': {'period': '1y', 'interval': '1d'},    # 1 year, daily
        '5Y': {'period': '5y', 'interval': '1wk'},   # 5 years, weekly
        'ALL': {'period': 'max', 'interval': '1mo'}, # Max available, monthly
    }

    @staticmethod
    def get_yfinance_symbol(app_symbol: str) -> str:
        """
        Map app crypto symbol to yfinance ticker

        Args:
            app_symbol: App cryptocurrency symbol (e.g., 'BTC')

        Returns:
            yfinance ticker symbol (e.g., 'BTC-USD')
        """
        return YFinanceService.SYMBOL_MAP.get(
            app_symbol.upper(),
            f"{app_symbol.upper()}-USD"
        )

    @staticmethod
    def fetch_price_history(symbol: str, timeframe: str, yfinance_symbol: str = None) -> List[Dict]:
        """
        Fetch historical price data for a cryptocurrency using pandas DataFrame

        Args:
            symbol: App cryptocurrency symbol (e.g., 'BTC')
            timeframe: One of: 1D, 5D, 1M, 3M, 6M, YTD, 1Y, 5Y, ALL
            yfinance_symbol: Optional yfinance ticker (e.g., 'BTC-USD').
                           If not provided, uses SYMBOL_MAP fallback.

        Returns:
            List of dicts with 'date' (YYYY-MM-DD) and 'price' (Decimal)

        Raises:
            ValueError: If timeframe is invalid
            Exception: If yfinance API fails
        """
        # Get yfinance ticker (use provided or fallback to mapping)
        yf_symbol = yfinance_symbol or YFinanceService.get_yfinance_symbol(symbol)

        # Get period/interval params
        params = YFinanceService.TIMEFRAME_MAP.get(timeframe)
        if not params:
            raise ValueError(f"Invalid timeframe: {timeframe}")

        try:
            # Fetch data from yfinance - returns pandas DataFrame
            ticker = yf.Ticker(yf_symbol)
            hist_df = ticker.history(period=params['period'], interval=params['interval'])

            # Check if DataFrame is empty
            if hist_df.empty:
                raise Exception(f"No price data available for {symbol}")

            # Reset index to make datetime a column
            hist_df = hist_df.reset_index()

            # Normalize DataFrame to response format using pandas operations
            # Convert datetime index to date string
            hist_df['date'] = pd.to_datetime(hist_df['Date']).dt.strftime('%Y-%m-%d')

            # Round prices to 2 decimal places and convert to Decimal
            hist_df['price'] = hist_df['Close'].round(2).apply(lambda x: Decimal(str(x)))

            # Convert to list of dicts with only date and price
            price_data = hist_df[['date', 'price']].to_dict('records')

            return price_data

        except Exception as e:
            raise Exception(f"Failed to fetch data from yfinance: {str(e)}")
