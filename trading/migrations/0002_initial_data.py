# Generated manually for initial data

from django.db import migrations
from decimal import Decimal


def create_initial_data(apps, schema_editor):
    """Create demo user, cryptocurrencies, and portfolio"""
    User = apps.get_model('trading', 'User')
    Portfolio = apps.get_model('trading', 'Portfolio')
    Cryptocurrency = apps.get_model('trading', 'Cryptocurrency')

    # Create demo user
    demo_user = User.objects.create(
        username='demo_user',
        email='demo@cryptosandbox.com'
    )

    # Create portfolio for demo user
    Portfolio.objects.create(
        user=demo_user,
        cash_balance=Decimal('10000.00'),
        initial_cash=Decimal('10000.00')
    )

    # Create supported cryptocurrencies
    cryptocurrencies = [
        {
            'symbol': 'BTC',
            'name': 'Bitcoin',
            'coingecko_id': 'bitcoin',
            'icon_url': 'https://assets.coingecko.com/coins/images/1/large/bitcoin.png'
        },
        {
            'symbol': 'ETH',
            'name': 'Ethereum',
            'coingecko_id': 'ethereum',
            'icon_url': 'https://assets.coingecko.com/coins/images/279/large/ethereum.png'
        },
        {
            'symbol': 'SOL',
            'name': 'Solana',
            'coingecko_id': 'solana',
            'icon_url': 'https://assets.coingecko.com/coins/images/4128/large/solana.png'
        },
        {
            'symbol': 'XRP',
            'name': 'XRP',
            'coingecko_id': 'ripple',
            'icon_url': 'https://assets.coingecko.com/coins/images/44/large/xrp-symbol-white-128.png'
        },
        {
            'symbol': 'USDC',
            'name': 'USD Coin',
            'coingecko_id': 'usd-coin',
            'icon_url': 'https://assets.coingecko.com/coins/images/6319/large/USD_Coin_icon.png'
        },
    ]

    for crypto_data in cryptocurrencies:
        Cryptocurrency.objects.create(**crypto_data)


def delete_initial_data(apps, schema_editor):
    """Reverse migration - delete all initial data"""
    User = apps.get_model('trading', 'User')
    Cryptocurrency = apps.get_model('trading', 'Cryptocurrency')

    # Delete demo user (cascade will delete portfolio)
    User.objects.filter(username='demo_user').delete()

    # Delete cryptocurrencies
    Cryptocurrency.objects.filter(symbol__in=['BTC', 'ETH', 'SOL', 'XRP', 'USDC']).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('trading', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(create_initial_data, delete_initial_data),
    ]
