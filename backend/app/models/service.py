"""Service model — salon services catalog."""

from datetime import datetime, timezone
from sqlalchemy import String, Boolean, DateTime, Integer, Float
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Service(Base):
    __tablename__ = "services"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    category: Mapped[str] = mapped_column(String(100), nullable=True)  # hair, skin, nails, makeup
    base_price: Mapped[float] = mapped_column(Float, nullable=True)
    duration_minutes: Mapped[int] = mapped_column(Integer, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_custom: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    def __repr__(self) -> str:
        return f"<Service {self.name} ₹{self.base_price}>"
