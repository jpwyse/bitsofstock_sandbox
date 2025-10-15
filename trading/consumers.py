import json
import asyncio
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.conf import settings
from django.utils import timezone
from trading.models import Cryptocurrency
from trading.services.coingecko import CoinGeckoService
import logging

# Create your consumers here.

logger = logging.getLogger(__name__)


class PriceConsumer(AsyncWebsocketConsumer):
    """WebSocket consumer for real-time price updates"""

    async def connect(self):
        """Handle WebSocket connection"""
        await self.channel_layer.group_add("prices", self.channel_name)
        await self.accept()

        # Send connection confirmation
        await self.send(text_data=json.dumps({
            'type': 'connected',
            'message': 'WebSocket connected successfully',
            'timestamp': str(timezone.now())
        }))

        logger.info(f"WebSocket connected: {self.channel_name}")

    async def disconnect(self, close_code):
        """Handle WebSocket disconnection"""
        await self.channel_layer.group_discard("prices", self.channel_name)
        logger.info(f"WebSocket disconnected: {self.channel_name}")

    async def price_update(self, event):
        """Send price update to WebSocket"""
        await self.send(text_data=json.dumps(event['data']))