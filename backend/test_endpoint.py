import asyncio
from datetime import datetime, timedelta, timezone
from sqlalchemy import select, func
from app.core.database import async_session, init_db
from app.models.transaction import Transaction, TransactionService

async def main():
    # Ensure tables/DB connection is ready
    await init_db()
    
    async with async_session() as db:
        now = datetime.now(timezone.utc)
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        month_start = today_start.replace(day=1)
        
        print("Python month_start (UTC):", month_start)
        
        # Test Top services SQLAlchemy query
        sr = await db.execute(
            select(
                TransactionService.service_name,
                func.count(TransactionService.id).label("count"),
                func.coalesce(func.sum(TransactionService.price), 0).label("revenue"),
            ).join(Transaction, TransactionService.transaction_id == Transaction.id)
            .where(Transaction.service_date >= month_start)
            .group_by(TransactionService.service_name)
            .order_by(func.count(TransactionService.id).desc()).limit(10)
        )
        srows = sr.all()
        print("SQLAlchemy Top Services rows:", srows)
        
        # Test revenue trend
        ago30 = today_start - timedelta(days=30)
        tr = await db.execute(
            select(
                func.date(Transaction.service_date).label("day"),
                func.coalesce(func.sum(Transaction.total_amount), 0).label("revenue"),
                func.count(func.distinct(Transaction.customer_id)).label("customers"),
            ).where(Transaction.service_date >= ago30)
            .group_by(func.date(Transaction.service_date))
            .order_by(func.date(Transaction.service_date))
        )
        trows = tr.all()
        print("SQLAlchemy Revenue Trend rows:", trows)

if __name__ == "__main__":
    asyncio.run(main())
