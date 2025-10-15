# Implementation Plan - Optimized for Claude Assistant

## How to Use This Guide

1. **Start each session** by telling Claude: "Reference IMPLEMENTATION_PLAN.md and SESSION_CONTEXT.md"
2. **Work through sections** in order
3. **Update SESSION_CONTEXT.md** after completing each major section
4. **Test frequently** - don't move on until current section works

---

## Phase 1: Project Setup (Start Here)

## Day 1: Project Setup & Foundation (8 hours)

### Morning Session (4 hours)
1.4 Configure Backend Settings
File: backend/crypto_sandbox/settings.py

Setup Channels for WebSocket

1.5 Configure Frontend
File: frontend/src/setupProxy.js

Configure API proxy
Configure WebSocket proxy

1.6 Material-UI Theme
File: frontend/src/theme/theme.js

Implement color palette (purple/blue primary)
Configure typography
Setup component overrides

Day 2: Core Backend Development (8 hours)
Morning Session (4 hours)
2.1 Database Models
File: backend/trading/models.py
Create models in this order:

User (demo user)
Portfolio (cash balance, total value)
Cryptocurrency (BTC, ETH, SOL, XRP, USDC)
Holding (user's crypto positions)
Transaction (buy/sell history)
PriceHistory (historical prices)

2.2 Django Ninja API Schemas
File: backend/trading/schemas.py
Create schemas for:

Portfolio summary
Holdings list
Cryptocurrency data
Transaction data
Buy/sell requests
Trade responses

Afternoon Session (4 hours)
2.3 Service Layer
File: backend/trading/services/coingecko.py

CoinGecko API client
Current prices method
Historical prices method
Caching implementation

File: backend/trading/services/trading.py

Execute buy logic
Execute sell logic
Portfolio updates
Holding calculations

File: backend/trading/services/portfolio.py

Calculate portfolio history
Timeframe calculations
Historical value reconstruction

2.4 Django Ninja API Endpoints
File: backend/trading/api.py
Implement endpoints:

GET /api/v1/portfolio/summary
GET /api/v1/portfolio/history
GET /api/v1/holdings
GET /api/v1/cryptocurrencies
POST /api/v1/trades/buy
POST /api/v1/trades/sell
GET /api/v1/transactions



Day 3: WebSocket Implementation (8 hours)

Morning Session (4 hours)
3.1 WebSocket Consumer
File: backend/trading/consumers.py
Simple implementation:

Handle connect (join "prices" group)
Handle disconnect (leave group)
Handle price_update (forward to client)


3.2 WebSocket Routing
File: backend/trading/routing.py

3.3 ASGI Configuration
File: backend/crypto_sandbox/asgi.py
Configure for both HTTP and WebSocket protocols.

Afternoon Session (4 hours)
3.4 Price Update Management Command
File: backend/trading/management/commands/update_prices.py
Manual start/stop worker:

Fetch from CoinGecko every 30s
Update database
Broadcast via WebSocket
Error handling
Graceful shutdown

Day 4: Frontend Core (8 hours)

Morning Session (4 hours)
4.1 API Service Layer
File: frontend/src/services/api.js
Create API client with methods for:

Portfolio (summary, history)
Holdings
Cryptocurrencies
Trading (buy, sell)
Transactions


4.2 WebSocket Service
File: frontend/src/services/websocket.js
Create WebSocket client:

Connect/disconnect methods
Subscribe/unsubscribe pattern
Event handling
Auto-reconnect


4.3 Portfolio Context
File: frontend/src/context/PortfolioContext.js
Global state management:

Portfolio data
Holdings
Cryptocurrencies
Loading states
WebSocket integration
Refresh methods


Afternoon Session (4 hours)
4.4 Utility Functions
File: frontend/src/utils/formatters.js

formatCurrency
formatCrypto
formatPercent
formatDate

File: frontend/src/utils/calculations.js

calculateQuantityFromUSD
calculateUSDFromQuantity
getGainLossColor

4.5 Navigation Component
File: frontend/src/components/Common/Navigation.js
Top navigation bar with:

Logo
Dashboard link
History link
User avatar


4.6 Portfolio Summary Component
File: frontend/src/components/Dashboard/PortfolioSummary.js
Display:

Total portfolio value (large)
Gain/loss chip (color-coded)
Cash balance
Last updated
Trade button


4.7 Holdings List Component
File: frontend/src/components/Dashboard/HoldingsList.js
Display holdings with:

Crypto icon
Symbol and name
Current value
Gain/loss percentage
Click to trade

4.8 Cryptocurrency List Component
File: frontend/src/components/Dashboard/CryptocurrencyList.js
Display all available cryptos with:

Icon
Name and symbol
Current price
24h change
Click to trade

4.9 Dashboard Page
File: frontend/src/components/Dashboard/Dashboard.js
Compose all components:

Portfolio summary
Holdings list
Cryptocurrency list
Trade modal (stub for now)

Day 5: Trading & Charts (8 hours)

Morning Session (4 hours)
5.1 Trade Modal Component
File: frontend/src/components/Trade/TradeModal.js
Material-UI Dialog with:

Buy/Sell tabs
Cryptocurrency selector
Amount input (USD or Crypto toggle)
Real-time conversion
Preview section
Validation
Confirm/Cancel buttons


5.2 Trade Form Logic
File: frontend/src/components/Trade/TradeForm.js
Handle:

Form state
Input validation
API calls
Success/error states
Portfolio refresh

Afternoon Session (4 hours)
5.3 Portfolio Chart Component
File: frontend/src/components/Charts/PortfolioChart.js
Recharts implementation:

LineChart with AreaChart
Timeframe selector buttons
Fetch historical data
Loading states
Responsive design


5.4 Chart Data Processing
File: frontend/src/components/Charts/ChartDataProcessor.js
Process portfolio history:

Format data for Recharts
Calculate data points for each timeframe
Handle empty states

5.5 Integration Testing
Test complete flow:

View portfolio
Execute buy trade
Verify holdings update
Verify portfolio recalculates
Execute sell trade
Verify transaction history
Check chart updates

Day 6: Transaction History & Polish (8 hours)

Morning Session (4 hours)
6.1 Transaction History Page
File: frontend/src/components/History/TransactionHistory.js
Implement:

Filter tabs (All, Buys, Sells)
Transaction list
Pagination
Transaction cards with details


6.2 Transaction Card Component
File: frontend/src/components/History/TransactionCard.js
Display:

Buy/Sell icon (color-coded)
Crypto name and symbol
Quantity and price
Total amount
Timestamp

6.3 Routing
File: frontend/src/App.js
Setup React Router:

/ - Dashboard
/history - Transaction History

Afternoon Session (4 hours)
6.4 UI Polish
Responsive Design:

Test on different screen sizes
Adjust spacing and typography
Ensure mobile usability

Loading States:

Add skeleton loaders
Loading spinners
Empty states

Animations:

Hover effects
Transitions
Number animations

Error Handling:

User-friendly error messages
Retry mechanisms
Fallback UI

6.5 Bug Fixes
Test and fix:

Edge cases in trading
WebSocket reconnection
Chart edge cases
Negative balance prevention
Decimal precision

6.6 Performance Optimization

Minimize re-renders
Optimize API calls
Lazy load components
Code splitting

Day 7: Testing, Documentation & Final Deployment (8 hours)
Morning Session (4 hours)
7.1 End-to-End Testing
Manual Testing Checklist:

Worker starts and updates prices
WebSocket connects
Portfolio displays correctly
Buy trade executes
Sell trade executes
Holdings update in real-time
Transaction history displays
Charts render all timeframes
Error handling works
No console errors

7.2 Code Review & Cleanup

Remove console.log statements
Add comments to complex code
Ensure consistent formatting
Update requirements.txt
Update package.json

7.3 Documentation
README.md:

Project overview
Features list
Tech stack
Setup instructions
Running locally
Heroku deployment
Worker management
API documentation
Architecture diagram
Design decisions
Future enhancements
