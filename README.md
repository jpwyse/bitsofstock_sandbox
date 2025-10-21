# Crypto Trading Sandbox

A full-stack cryptocurrency trading simulation platform with real-time price updates, portfolio management, and interactive charting. Built with Django, React, and WebSockets for a seamless trading experience.

## 🌟 Features

### Portfolio Management
- **Real-time Portfolio Tracking**: Live portfolio value updates via WebSocket
- **Holdings Dashboard**: Track individual asset performance with gain/loss calculations
- **Performance Analytics**: Historical portfolio charts with timeframe selection (1D, 5D, 1M, 3M, 6M, YTD)
- **Asset Allocation**: Pie chart visualization of portfolio distribution

### Trading
- **Buy/Sell Interface**: Dual input mode (USD amount or quantity) with auto-calculation
- **Market Discovery**: Browse cryptocurrencies with filtering by category and sorting by volume/movers
- **Transaction History**: Complete audit trail of all trades
- **Realized P&L Tracking**: Track gains and losses from sell transactions with FIFO accounting

### Market Data
- **Real-time Prices**: Live cryptocurrency prices via CoinGecko API (30-second updates)
- **Historical Charts**: Interactive price charts powered by yfinance (1D to MAX timeframes)
- **24h Metrics**: Volume, market cap, and price change tracking
- **News Feed**: Latest cryptocurrency news from Finnhub (24-hour caching)

### User Experience
- **Responsive Design**: Mobile-first Material-UI components
- **Loading States**: Skeleton placeholders for smooth UX
- **Error Handling**: User-friendly error messages with retry options
- **Purple Theme**: Modern purple/violet color scheme throughout

## 🏗️ Architecture

### Backend (Django)
```
backend/
├── settings.py          # Django configuration, CORS, Channels
├── urls.py             # URL routing
└── asgi.py             # ASGI configuration for WebSockets

trading/
├── api.py              # Django Ninja REST endpoints (Google-style docstrings)
├── consumers.py        # WebSocket consumers for real-time price updates
├── models.py           # Database models (User, Cryptocurrency, Holding, Transaction)
├── schemas.py          # Pydantic schemas for request/response validation
├── services/
│   ├── portfolio_service.py    # Portfolio calculations and history
│   ├── trading_service.py      # Buy/sell trade execution with FIFO
│   └── price_service.py        # CoinGecko API integration
└── management/commands/
    └── update_prices.py        # Management command for price updates
```

### Frontend (React)
```
frontend/src/
├── pages/
│   ├── Portfolio.js    # 5-tab portfolio dashboard (JSDoc documented)
│   ├── Market.js       # Cryptocurrency market with filtering/sorting
│   ├── News.js         # Portfolio snapshot + news feed
│   └── Account.js      # User profile and account info
├── components/
│   ├── TradeModalAllCryptos.js  # Buy/sell modal with validation
│   ├── TransferModal.js         # Cash transfer placeholder (non-functional)
│   ├── portfolio/
│   │   ├── PortfolioPerformanceChart.js  # Area chart with purple gradient
│   │   ├── PortfolioAllocationChart.js   # Pie chart for asset distribution
│   │   ├── HoldingsList.js               # Current positions table
│   │   ├── TransactionsList.js           # Transaction history
│   │   └── RealizedGainsTable.js         # P&L tracking with filters
│   └── market/
│       ├── CryptocurrencyList.js  # Market table with sorting
│       └── ViewChartModal.jsx     # Historical price charts (yfinance)
├── context/
│   └── PortfolioContext.js  # Global state with WebSocket integration
├── services/
│   ├── apiAxios.js      # Centralized HTTP client with interceptors
│   └── websocket.js     # WebSocket client for price updates
├── hooks/
│   └── useCryptoNews.js # News fetching with 24h localStorage cache
└── utils/
    └── formatters.js    # Currency, number, date formatting utilities
```

### Database Schema
- **User**: Django auth user with portfolio metadata (cash_balance, initial_investment)
- **Cryptocurrency**: Available assets (BTC, ETH, SOL, etc.) with real-time prices
- **Holding**: User's current positions with weighted average cost basis
- **Transaction**: Complete trade history (BUY/SELL with realized P&L)

### WebSocket Architecture
- **Django Channels**: ASGI server for WebSocket support
- **Channel Layers**: Redis-backed message broadcasting
- **Price Consumer**: Broadcasts cryptocurrency price updates every 30 seconds
- **Client Integration**: React websocketService with auto-reconnect

## 🚀 Quick Start

### Prerequisites
- Python 3.11+
- Node.js 18+
- Redis (optional, for WebSocket support)

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd crypto_trading_sandbox
```

2. **Backend Setup**
```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run migrations
python manage.py migrate

# Create demo user and seed data
python manage.py shell < scripts/seed_data.py

# Set environment variables (optional)
export COINGECKO_API_KEY=your_api_key_here
export FINNHUB_API_KEY=your_api_key_here
```

3. **Frontend Setup**
```bash
cd frontend
npm install
```

4. **Run the Application**

Open three terminal windows:

```bash
# Terminal 1: Django backend
python manage.py runserver

# Terminal 2: Price updates (optional but recommended)
python manage.py update_prices

# Terminal 3: React frontend
cd frontend
npm start
```

Access the application at: **http://localhost:3000**

For detailed setup instructions, see [SETUP_INSTRUCTIONS.md](./SETUP_INSTRUCTIONS.md)

## 🧪 Testing

The project includes comprehensive test coverage:

- **Backend Tests**: 40+ tests with pytest (models, services, API endpoints, WebSocket consumers)
- **Frontend Tests**: React Testing Library + Jest for components
- **E2E Tests**: Playwright for critical user flows
- **Test Coverage**: >80% code coverage

```bash
# Backend tests
pytest

# Backend tests with coverage
pytest --cov=trading --cov-report=html

# Frontend tests
cd frontend
npm test
```

For detailed testing documentation, see [TESTING.md](./TESTING.md)

## 📚 API Documentation

### REST API Endpoints

All endpoints are prefixed with `/api/trading/`:

**Portfolio**
- `GET /portfolio/summary` - Portfolio summary with total value, gain/loss, cash balance
- `GET /portfolio/history?timeframe={1D,5D,1M,3M,6M,YTD}` - Historical portfolio values

**Holdings**
- `GET /holdings` - Current crypto holdings with P&L

**Cryptocurrencies**
- `GET /cryptocurrencies` - All available cryptocurrencies
- `GET /cryptocurrencies/{id}` - Cryptocurrency detail

**Trading**
- `POST /trades/buy` - Execute buy order (amount_usd or quantity)
- `POST /trades/sell` - Execute sell order (amount_usd or quantity)

**Transactions**
- `GET /transactions?page={page}&type={ALL|BUY|SELL}` - Transaction history

**News**
- `GET /news/crypto?limit={limit}` - Latest cryptocurrency news (Finnhub)

**Market Data**
- `GET /price_history?symbol={symbol}&period={period}&interval={interval}` - Historical prices (yfinance)

**User**
- `GET /user/account` - User account information

### WebSocket Endpoints

- `ws://<host>/ws/prices/` - Real-time cryptocurrency price updates

For complete API documentation with request/response schemas, see [docs/API.md](./docs/API.md)

## 🛠️ Technology Stack

### Backend
- **Framework**: Django 5.1.1 with Django Ninja (OpenAPI-compatible REST)
- **Database**: SQLite (development), PostgreSQL (production)
- **WebSockets**: Django Channels 4.2.0 + channels-redis
- **Validation**: Pydantic schemas for request/response validation
- **External APIs**: CoinGecko (prices), Finnhub (news), yfinance (charts)
- **Testing**: pytest + pytest-django + pytest-asyncio

### Frontend
- **Framework**: React 18 with functional components and hooks
- **UI Library**: Material-UI (MUI) v5 with custom purple theme
- **State Management**: React Context API (PortfolioContext)
- **HTTP Client**: Axios with interceptors for error handling
- **Charts**: Recharts for area/pie/line charts
- **Date Handling**: date-fns for formatting
- **WebSocket**: Custom WebSocket service with auto-reconnect
- **Testing**: React Testing Library + Jest

### DevOps
- **Version Control**: Git with GitHub
- **CI/CD**: GitHub Actions (optional)
- **Deployment**: Heroku-ready (Procfile, runtime.txt)
- **Environment**: python-dotenv for configuration

## 📖 Code Documentation

The codebase follows **Senior Engineer Quality** documentation standards:

- **Backend**: Google-style docstrings for all modules, classes, methods
- **Frontend**: JSDoc comments for all React components, hooks, utilities
- **Coverage**: ~1,900 lines of documentation added across 24+ files

### Documentation Highlights
- Module-level headers explaining purpose, architecture, and integration
- Comprehensive parameter and return type documentation
- Usage examples and code snippets
- External API rate limits and error handling patterns
- Related files and cross-references

## 🎨 Design System

### Color Palette
- **Primary**: Purple (#5B4FDB, #7C3AED, #A78BFA)
- **Success**: Green for gains
- **Error**: Red for losses
- **Charts**: Purple gradient theme

### Typography
- **Headings**: Roboto, bold weights
- **Body**: Roboto, regular
- **Numbers**: Tabular figures for alignment

## 🔐 Security Notes

**⚠️ Important**: This is a sandbox/demo application with the following limitations:

- **No Authentication**: Single demo user, no login required
- **No Authorization**: All endpoints publicly accessible
- **Local Database**: SQLite for development only
- **API Keys**: Store in `.env` file (never commit)
- **CORS**: Open in development (configure for production)

**Not for Production Use**: This application is for educational/demonstration purposes only.

## 🚧 Known Limitations

- **TransferModal**: Placeholder UI only, does not execute actual transfers
- **Single User**: Designed for demo_user only (no multi-tenancy)
- **No Pagination**: All tables load full dataset (limited to ~100 items)
- **No Rate Limiting**: API endpoints unprotected
- **No Email/SMS**: No notification system
- **Local Storage**: News cache shared across tabs

## 🤝 Contributing

This is a demonstration project. Contributions are welcome for educational purposes:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is provided as-is for educational purposes. No license specified.

## 🙏 Acknowledgments

- **CoinGecko**: Real-time cryptocurrency prices
- **Finnhub**: Cryptocurrency news feed
- **yfinance**: Historical price data
- **Material-UI**: React component library
- **Django**: Backend framework
- **React**: Frontend framework

---

**Built with ❤️ for learning and experimentation**

For questions or issues, please open a GitHub issue.
