release: python manage.py migrate
web: daphne backend.asgi:application --port $PORT --bind 0.0.0.0 -v2
worker: python manage.py update_prices --interval 30