import yfinance as yf
import pandas as pd
from curl_cffi import requests
from datetime import datetime, timedelta
from typing import List, Dict, Any
import numpy as np

# Create your helpers here.

def fetch_price_data(symbol: str, lookback_days: int = 365) -> List[Dict[str, Any]]:
    """
    Fetch historical price data for a given symbol.
    Uses session impersonation for reliability and matches insider trading time period.
    
    Args:
        symbol: Stock ticker symbol
        lookback_days: Number of days to look back (should match insider data period)
    
    Returns:
        List of dictionaries with date and close price data
    """
    try:
        # Create session with impersonation for reliability
        session = requests.Session(impersonate="chrome")
        ticker = yf.Ticker(symbol, session=session)
        
        # Calculate period string based on lookback_days
        if lookback_days <= 7:
            period = "7d"
        elif lookback_days <= 30:
            period = "1mo"
        elif lookback_days <= 90:
            period = "3mo"
        elif lookback_days <= 180:
            period = "6mo"
        elif lookback_days <= 365:
            period = "1y"
        elif lookback_days <= 730:
            period = "2y"
        else:
            period = "5y"
        
        data = ticker.history(period=period)
        if data.empty:
            raise ValueError(f"No historical data found for {symbol}")
        
        # Process data to match expected format
        df = data[['Close']].copy()
        df = df.reset_index()
        df['Date'] = pd.to_datetime(df['Date']).dt.strftime("%Y-%m-%d")
        
        # Convert to list of dictionaries
        price_data = []
        for _, row in df.iterrows():
            price_data.append({
                "date": row['Date'],
                "close_price": round(float(row['Close']), 2)
            })
        
        # Sort by date (newest first to match insider data)
        price_data.sort(key=lambda x: x['date'], reverse=True)
        
        return price_data
        
    except Exception as e:
        print(f"Error fetching price data for {symbol}: {e}")
        return []