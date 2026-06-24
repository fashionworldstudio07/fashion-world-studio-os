"""Transaction models — billing records and service line items."""

from datetime import datetime, timezone
from sqlalchemy import String, DateTime, Integer, Float, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Transaction(Base):
    __tablename__ = "transactions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    customer_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("customers.id"), nullable=True, index=True
    )
    staff_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id"), nullable=True
    )
    total_amount: Mapped[float] = mapped_column(Float, nullable=False)
    payment_mode: Mapped[str] = mapped_column(
        String(20), nullable=False, default="cash"
    )  # cash | upi | card | mixed
    raw_input: Mapped[str] = mapped_column(Text, nullable=True)  # Original voice/text input
    input_type: Mapped[str] = mapped_column(
        String(20), nullable=True
    )  # voice | text | manual
    ai_extracted_json: Mapped[str] = mapped_column(Text, nullable=True)  # AI parse result
    notes: Mapped[str] = mapped_column(Text, nullable=True)
    service_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    # Relationships
    customer = relationship("Customer", back_populates="transactions", lazy="selectin")
    staff = relationship("User", lazy="selectin")
    services = relationship("TransactionService", back_populates="transaction", lazy="selectin")

    def __repr__(self) -> str:
        return f"<Transaction #{self.id} ₹{self.total_amount}>"


class TransactionService(Base):
    """Line items linking transactions to services."""
    __tablename__ = "transaction_services"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    transaction_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("transactions.id"), nullable=False, index=True
    )
    service_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("services.id"), nullable=True
    )
    service_name: Mapped[str] = mapped_column(String(255), nullable=False)  # Denormalized for speed
    price: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    quantity: Mapped[int] = mapped_column(Integer, default=1)

    # Relationships
    transaction = relationship("Transaction", back_populates="services")
    service = relationship("Service", lazy="selectin")
