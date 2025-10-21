import yfinance as yf
from yfinance import shared as yf_shared
import pandas as pd
from decimal import Decimal
from typing import List, Dict



def fetch_price_history_payload(symbol: str, period: str = "1y", interval: str = "1d") -> dict:
    """
    Pure service function (no Django/Ninja imports).
    Returns a JSON-serializable dict with date/datetime, close, volume.
    """
    # Normalize
    period_norm = (period or "1y").strip().lower()
    interval_norm = (interval or "1d").strip().lower()

    # Intraday overrides
    if period_norm == "1d":
        interval_norm = "5m"
    elif period_norm == "5d":
        interval_norm = "15m"

    # Fetch from yfinance
    try:
        ticker = yf.Ticker(symbol)
        df = ticker.history(period=period_norm)
    except Exception as e:
        raise RuntimeError(f"yfinance error for {symbol} ({period_norm}/{interval_norm}): {e}")

    if df is None or df.empty:
        return {
            "symbol": symbol.upper(),
            "period": period_norm,
            "interval": interval_norm,
            "count": 0,
            "data": [],
            "error": f"No historical data for '{symbol}' ({period_norm}/{interval_norm})",
        }

    # Reset index to expose timestamp column
    df = df.reset_index()

    # Identify time column
    ts_col = "Datetime" if "Datetime" in df.columns else "Date" if "Date" in df.columns else None
    if not ts_col:
        return {
            "symbol": symbol.upper(),
            "period": period_norm,
            "interval": interval_norm,
            "count": 0,
            "data": [],
            "error": "No timestamp column found in yfinance response",
        }

    # Parse timestamps (tz-naive)
    ts = pd.to_datetime(df[ts_col], errors="coerce")
    if ts.isna().all():
        return {
            "symbol": symbol.upper(),
            "period": period_norm,
            "interval": interval_norm,
            "count": 0,
            "data": [],
            "error": "Failed to parse timestamps in yfinance response",
        }
    if getattr(ts.dt, "tz", None) is not None:
        ts = ts.dt.tz_convert(None)

    # date always; datetime only for intraday periods (1d/5d)
    is_intraday = period_norm in ("1d", "5d")
    df["date"] = ts.dt.strftime("%Y-%m-%d")
    if is_intraday:
        df["datetime"] = ts.dt.strftime("%Y-%m-%d %H:%M")

    # Ensure Close/Volume exist, ffill close
    if "Close" not in df.columns or "Volume" not in df.columns:
        return {
            "symbol": symbol.upper(),
            "period": period_norm,
            "interval": interval_norm,
            "count": 0,
            "data": [],
            "error": "Expected 'Close'/'Volume' not present in yfinance response",
        }
    df["Close"] = df["Close"].ffill()

    # Build clean payload rows
    keep_cols = ["date", "Close", "Volume"]
    if is_intraday:
        keep_cols.insert(1, "datetime")

    out = df[keep_cols].copy()
    out.rename(columns={"Close": "close", "Volume": "volume"}, inplace=True)

    data = out.to_dict(orient="records")
    return {
        "symbol": symbol.upper(),
        "period": period_norm,
        "interval": interval_norm,
        "count": len(data),
        "data": data,
    }

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
            List of dicts with 'date' (YYYY-MM-DD), 'price' (Decimal), and optional 'timestamp' (YYYY-MM-DD HH:MM:SS) for intraday

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
                # Check yfinance error dictionary for detailed error information
                error_detail = yf_shared._ERRORS.get(yf_symbol, 'Unknown error - data may be temporarily unavailable')
                raise Exception(f"No price data available for {symbol} ({yf_symbol}) with timeframe {timeframe}. Yahoo Finance error: {error_detail}")

            # Reset index to make datetime a column
            hist_df = hist_df.reset_index()

            # Dynamically choose the timestamp column
            if 'Date' in hist_df.columns:
                ts_col = 'Date'
            elif 'Datetime' in hist_df.columns:
                ts_col = 'Datetime'
            else:
                # Fallback to first datetime-like column
                datetime_cols = hist_df.select_dtypes(include=['datetime64']).columns
                if len(datetime_cols) > 0:
                    ts_col = datetime_cols[0]
                else:
                    raise Exception(f"No datetime column found in yfinance response for {symbol} ({yf_symbol})")

            # Convert to tz-naive timestamps
            ts = pd.to_datetime(hist_df[ts_col])
            if ts.dt.tz is not None:
                ts = ts.dt.tz_convert(None)

            # Determine if this is intraday data
            is_intraday = params['interval'] in ('1m', '2m', '5m', '15m', '30m', '60m', '90m')

            # Always add date column (YYYY-MM-DD)
            hist_df['date'] = ts.dt.strftime('%Y-%m-%d')

            # Add timestamp column for intraday (YYYY-MM-DD HH:MM:SS)
            if is_intraday:
                hist_df['timestamp'] = ts.dt.strftime('%Y-%m-%d %H:%M:%S')

            # Forward-fill missing prices and convert to Decimal
            hist_df['Close'] = hist_df['Close'].ffill()
            hist_df['price'] = hist_df['Close'].round(2).apply(lambda x: Decimal(str(x)))

            # Build response columns
            cols = ['date', 'price']
            if is_intraday:
                cols.append('timestamp')

            # Convert to list of dicts
            price_data = hist_df[cols].to_dict('records')

            # Sort ascending by date, then timestamp if present
            if is_intraday:
                price_data.sort(key=lambda x: (x['date'], x['timestamp']))
            else:
                price_data.sort(key=lambda x: x['date'])

            return price_data

        except Exception as e:
            raise Exception(f"Failed to fetch data from yfinance for {symbol} ({yf_symbol}) with timeframe {timeframe}: {str(e)}")
