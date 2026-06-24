"""Seed default admin user and predefined salon services."""

import logging
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_password
from app.models.user import User
from app.models.service import Service

logger = logging.getLogger(__name__)

DEFAULT_SERVICES = [
    {"name": "Hair Cut", "category": "hair", "base_price": 500, "duration_minutes": 30},
    {"name": "Hair Spa", "category": "hair", "base_price": 1500, "duration_minutes": 60},
    {"name": "Hair Color", "category": "hair", "base_price": 3000, "duration_minutes": 120},
    {"name": "Hair Smoothening", "category": "hair", "base_price": 5000, "duration_minutes": 180},
    {"name": "Keratin", "category": "hair", "base_price": 6000, "duration_minutes": 180},
    {"name": "Rebonding", "category": "hair", "base_price": 5500, "duration_minutes": 180},
    {"name": "Facial", "category": "skin", "base_price": 1000, "duration_minutes": 45},
    {"name": "Cleanup", "category": "skin", "base_price": 600, "duration_minutes": 30},
    {"name": "Waxing", "category": "skin", "base_price": 800, "duration_minutes": 45},
    {"name": "Threading", "category": "skin", "base_price": 100, "duration_minutes": 15},
    {"name": "Manicure", "category": "nails", "base_price": 500, "duration_minutes": 30},
    {"name": "Pedicure", "category": "nails", "base_price": 700, "duration_minutes": 45},
    {"name": "Makeup", "category": "makeup", "base_price": 2500, "duration_minutes": 60},
    {"name": "Bridal Makeup", "category": "makeup", "base_price": 15000, "duration_minutes": 180},
]


async def seed_database(db: AsyncSession):
    """Seed the database with default admin user and services."""

    # Seed admin user
    result = await db.execute(select(User).where(User.email == "admin@fashionworld.com"))
    if not result.scalar_one_or_none():
        admin = User(
            email="admin@fashionworld.com",
            password_hash=hash_password("admin123"),
            full_name="Fashion World Admin",
            phone="9582480417",
            role="admin",
        )
        db.add(admin)
        logger.info("✅ Default admin user created (admin@fashionworld.com / admin123)")

    # Seed services
    for svc_data in DEFAULT_SERVICES:
        result = await db.execute(select(Service).where(Service.name == svc_data["name"]))
        if not result.scalar_one_or_none():
            service = Service(**svc_data)
            db.add(service)

    await db.commit()
    logger.info("✅ Default services seeded")
