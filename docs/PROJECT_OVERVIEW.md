# Crypto Trading Sandbox - Project Overview

## Quick Reference

**Project Type:** Technical Assessment for Bits of Stock  
**Timeline:** 5-7 days  
**Developer:** James Wyse  
**Purpose:** Demonstrate full-stack development capabilities

## Project Summary

Build a cryptocurrency trading sandbox platform that allows users to simulate buying, holding, and selling cryptocurrencies with real-time price data via WebSockets.

## Tech Stack

### Backend
- **Framework:** Django 5.0+ with Django Ninja (REST API)
- **WebSocket:** Django Channels + Redis
- **Database:** SQLite (dev) / PostgreSQL (prod)
- **Price Data:** CoinGecko REST API
- **Deployment:** Heroku

### Frontend
- **Framework:** React 18 (Create React App)
- **UI Library:** Material-UI v5
- **Charts:** Recharts
- **WebSocket:** Socket.IO Client
- **Deployment:** Heroku (with backend)

## Core Features

1. **Real-time Price Updates** - WebSocket broadcasts every 30 seconds
2. **Portfolio Dashboard** - Total value, gain/loss, performance chart
3. **Trading** - Buy/sell cryptocurrencies with validation
4. **Holdings** - View all positions with current values
5. **Transaction History** - Complete audit trail with filters
6. **Interactive Charts** - Multiple timeframes (1D, 5D, 1M, 6M, YTD, 1Y, 5Y, Max)

## Design Requirements

- Match "Bits of Stock" aesthetic from provided mockups
- Purple/blue color scheme (#5B4FDB primary)
- Clean, modern UI with Material-UI components
- Responsive design (desktop priority)

## Key Constraints

- **Single user** (demo account hardcoded)
- **CoinGecko free tier** (10,000 calls/month)
- **No real money** (simulation only)
- **Manual worker control** (start/stop price updates)

## Success Criteria

✅ All features functional  
✅ Real-time price updates working  
✅ Clean, maintainable code  
✅ Matches design mockups  
✅ Deployed to live URL  
✅ Comprehensive documentation  

## Related Documentation

- `IMPLEMENTATION_PLAN.md` - Day-by-day implementation guide
