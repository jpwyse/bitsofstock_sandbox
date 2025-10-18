import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from trading.api import router
from ninja.testing import TestClient

client = TestClient(router)

# Test the endpoint
response = client.get("/portfolio/performance-comparison", {"start_date": "2025-01-01", "mode": "actual"})

print(f"Status: {response.status_code}")
print(f"Response: {response.json()}")
