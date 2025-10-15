from ninja import NinjaAPI
from trading.api import router as trading_router

# Create your router's here.

api = NinjaAPI()

api.add_router("/trading/", trading_router)