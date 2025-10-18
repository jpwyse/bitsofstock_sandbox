from decimal import Decimal
from django.core.management.base import BaseCommand
from django.db import transaction
from trading.models import Portfolio, Transaction, Cryptocurrency
import logging

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Backfill realized_gain_loss for all existing transactions'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Preview changes without saving to database',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']

        if dry_run:
            self.stdout.write(self.style.WARNING('DRY RUN MODE - No changes will be saved'))

        self.stdout.write(self.style.SUCCESS('=' * 60))
        self.stdout.write(self.style.SUCCESS('Backfilling Realized Gains/Losses'))
        self.stdout.write(self.style.SUCCESS('=' * 60))

        # Get all portfolios
        portfolios = Portfolio.objects.all()

        total_transactions = 0
        total_buys = 0
        total_sells = 0
        total_net_realized = Decimal('0.00')

        for portfolio in portfolios:
            self.stdout.write(f"\nProcessing portfolio: {portfolio.user.username}")

            # Get all cryptocurrencies this portfolio has traded
            crypto_ids = Transaction.objects.filter(
                portfolio=portfolio
            ).values_list('cryptocurrency_id', flat=True).distinct()

            for crypto_id in crypto_ids:
                crypto = Cryptocurrency.objects.get(id=crypto_id)

                # Get all transactions for this portfolio-crypto pair, chronologically
                transactions = Transaction.objects.filter(
                    portfolio=portfolio,
                    cryptocurrency=crypto
                ).order_by('timestamp')

                if not transactions.exists():
                    continue

                # Initialize tracking variables
                running_quantity = Decimal('0')
                running_cost_basis = Decimal('0')
                average_cost = Decimal('0')

                crypto_buys = 0
                crypto_sells = 0
                crypto_realized = Decimal('0.00')

                for txn in transactions:
                    if txn.transaction_type == Transaction.TransactionType.BUY:
                        # BUY: Update running totals and average cost
                        running_cost_basis += (txn.quantity * txn.price_per_unit)
                        running_quantity += txn.quantity

                        if running_quantity > 0:
                            average_cost = running_cost_basis / running_quantity

                        # Set realized gain/loss to 0 for BUY
                        txn.realized_gain_loss = Decimal('0.00')
                        crypto_buys += 1

                    else:  # SELL
                        # Calculate realized gain/loss BEFORE updating running totals
                        if average_cost > 0:
                            realized_gain_loss = (txn.price_per_unit - average_cost) * txn.quantity
                        else:
                            # Edge case: selling before any buys (shouldn't happen in production)
                            self.stdout.write(
                                self.style.WARNING(
                                    f"  Warning: SELL transaction {txn.id} has no prior BUY. Setting realized P&L to 0."
                                )
                            )
                            realized_gain_loss = Decimal('0.00')

                        # Update running totals (reduce proportionally)
                        cost_sold = average_cost * txn.quantity
                        running_cost_basis -= cost_sold
                        running_quantity -= txn.quantity

                        # Handle floating point rounding errors
                        if running_quantity < Decimal('0.00000001'):
                            running_quantity = Decimal('0')
                            running_cost_basis = Decimal('0')
                            average_cost = Decimal('0')
                        elif running_quantity > 0:
                            average_cost = running_cost_basis / running_quantity

                        # Set realized gain/loss
                        txn.realized_gain_loss = realized_gain_loss
                        crypto_sells += 1
                        crypto_realized += realized_gain_loss

                    # Save transaction if not dry-run
                    if not dry_run:
                        txn.save()

                    total_transactions += 1

                total_buys += crypto_buys
                total_sells += crypto_sells
                total_net_realized += crypto_realized

                # Display crypto summary
                self.stdout.write(
                    f"  {crypto.symbol}: {crypto_buys} BUYs, {crypto_sells} SELLs | "
                    f"Realized P&L: {self.format_currency(crypto_realized)}"
                )

        # Display final summary
        self.stdout.write(self.style.SUCCESS('\n' + '=' * 60))
        self.stdout.write(self.style.SUCCESS('Summary'))
        self.stdout.write(self.style.SUCCESS('=' * 60))
        self.stdout.write(f"Total transactions processed: {total_transactions}")
        self.stdout.write(f"Total BUYs: {total_buys} (all set to $0.00)")
        self.stdout.write(f"Total SELLs: {total_sells} (all calculated)")
        self.stdout.write(f"Net realized gain/loss: {self.format_currency(total_net_realized)}")
        self.stdout.write(self.style.SUCCESS('=' * 60))

        if dry_run:
            self.stdout.write(self.style.WARNING('\nDRY RUN COMPLETE - No changes saved'))
        else:
            self.stdout.write(self.style.SUCCESS('\nBackfill completed successfully!'))

    def format_currency(self, value):
        """Format currency with color coding"""
        formatted = f"${value:,.2f}"
        if value > 0:
            return self.style.SUCCESS(f"+{formatted}")
        elif value < 0:
            return self.style.ERROR(formatted)
        else:
            return formatted
