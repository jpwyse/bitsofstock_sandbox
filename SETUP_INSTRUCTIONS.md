# Crypto Trading Sandbox - Setup Instructions

## Issue Fixed

The initial error was due to a version incompatibility with Django Channels 4.3.1. The issue has been resolved by downgrading to compatible versions:
- `channels==4.2.0`
- `channels-redis==4.2.0`

## Running the Application

### 1. Start the Backend Server

Open a terminal and run:

```bash
cd /Users/jameswyse/Documents/Projects/BitsOfStock/crypto_trading_sandbox
python manage.py runserver
```

The backend will be available at: `http://127.0.0.1:8000`

### 2. Start the Price Update Service (Optional but Recommended)

Open a **second terminal** and run:

```bash
cd /Users/jameswyse/Documents/Projects/BitsOfStock/crypto_trading_sandbox
python manage.py update_prices
```

This command fetches real-time cryptocurrency prices from CoinGecko and broadcasts them via WebSocket.

**Note:** You'll need to add your CoinGecko API key as an environment variable:
```bash
export COINGECKO_API_KEY=your_api_key_here
```

Or add it to a `.env` file in the project root.

### 3. Start the Frontend Development Server

Open a **third terminal** and run:

```bash
cd /Users/jameswyse/Documents/Projects/BitsOfStock/crypto_trading_sandbox/frontend
npm start
```

The frontend will automatically open at: `http://localhost:3000`

## API Endpoints

All API endpoints are prefixed with `/api/trading/`:

- `GET /api/trading/portfolio/summary` - Get portfolio summary
- `GET /api/trading/portfolio/history?timeframe=1M` - Get portfolio history
- `GET /api/trading/holdings` - Get current holdings
- `GET /api/trading/cryptocurrencies` - Get all available cryptocurrencies
- `GET /api/trading/cryptocurrencies/{id}` - Get cryptocurrency details
- `POST /api/trading/trades/buy` - Execute buy order
- `POST /api/trading/trades/sell` - Execute sell order
- `GET /api/trading/transactions?type=ALL` - Get transaction history

## WebSocket Connection

WebSocket endpoint for real-time price updates:
- `ws://127.0.0.1:8000/ws/prices/`

## Initial State

The application starts with:
- Demo user: `demo_user`
- Initial cash balance: $10,000
- Available cryptocurrencies: BTC, ETH, SOL, XRP, USDC
- No initial holdings (start trading to build your portfolio!)

## Testing the Backend

You can test the API directly with curl:

```bash
# Get cryptocurrencies
curl http://127.0.0.1:8000/api/trading/cryptocurrencies

# Get portfolio summary
curl http://127.0.0.1:8000/api/trading/portfolio/summary

# Get holdings
curl http://127.0.0.1:8000/api/trading/holdings
```

## Troubleshooting

### Port Already in Use

If you get "Address already in use" error:

```bash
# Kill process on port 8000
lsof -ti:8000 | xargs kill -9

# Kill process on port 3000
lsof -ti:3000 | xargs kill -9
```

### Channels Import Error

If you see `ImportError: cannot import name 'DEFAULT_CHANNEL_LAYER'`:

```bash
pip install channels==4.2.0 channels-redis==4.2.0
```

### Missing Dependencies

```bash
# Backend
pip install -r requirements.txt

# Frontend
cd frontend
npm install
```

## Project Structure

```
crypto_trading_sandbox/
├── backend/              # Django backend configuration
├── trading/              # Trading app
│   ├── api.py           # API endpoints
│   ├── consumers.py     # WebSocket consumers
│   ├── models.py        # Database models
│   ├── services/        # Business logic
│   └── management/      # Management commands
└── frontend/
    └── src/
        ├── components/  # React components
        ├── context/     # React context providers
        ├── pages/       # Page components
        ├── services/    # API and WebSocket services
        ├── theme/       # Material-UI theme
        └── utils/       # Utility functions
```

## Features Implemented

✅ Real-time cryptocurrency price updates via WebSocket
✅ Portfolio overview with total value, gain/loss, and cash balance
✅ Holdings management with individual asset performance
✅ Market view of all available cryptocurrencies
✅ Buy/sell trading functionality
✅ Transaction history tracking
✅ Responsive Material-UI design with purple/blue theme
✅ Automatic portfolio value recalculation

Enjoy trading! 🚀
