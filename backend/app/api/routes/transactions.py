"""
Transaction routes — CRUD and Smart Entry (the core AI feature).
"""

import json
from datetime import datetime, timezone
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.customer import Customer
from app.models.service import Service
from app.models.transaction import Transaction, TransactionService
from app.schemas.transaction import (
    SmartEntryRequest,
    SmartEntryResponse,
    SmartEntryConfirm,
    AIExtractedData,
    TransactionResponse,
    TransactionServiceResponse,
    TransactionListResponse,
)
from app.services.ai_engine import extract_entry_data

router = APIRouter(prefix="/transactions", tags=["Transactions"])


# ── Smart Entry ──────────────────────────────────────────

@router.post("/smart-entry", response_model=SmartEntryResponse)
async def smart_entry(
    body: SmartEntryRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    """
    Process natural language input (voice or text) and extract billing data.
    Returns extracted data for user confirmation before saving.
    """
    # Get available services for context
    result = await db.execute(
        select(Service.name).where(Service.is_active == True)
    )
    available_services = [row[0] for row in result.all()]

    # Extract data using Gemini AI
    extracted = await extract_entry_data(body.text, available_services)

    return SmartEntryResponse(
        extracted=AIExtractedData(**extracted),
        raw_input=body.text,
        requires_confirmation=True,
    )


@router.post("/smart-entry/confirm", response_model=TransactionResponse)
async def confirm_smart_entry(
    body: SmartEntryConfirm,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    """
    Save confirmed smart entry as a transaction.
    Creates or updates the customer record automatically.
    """
    # Find or create customer
    customer = None
    if body.customer_name:
        # Try finding by name (case-insensitive)
        result = await db.execute(
            select(Customer).where(
                func.lower(Customer.name) == body.customer_name.lower()
            )
        )
        customer = result.scalar_one_or_none()

        if not customer and body.phone:
            result = await db.execute(
                select(Customer).where(Customer.phone == body.phone)
            )
            customer = result.scalar_one_or_none()

        if not customer:
            # Create new customer
            customer = Customer(
                name=body.customer_name,
                phone=body.phone,
            )
            db.add(customer)
            await db.flush()
        else:
            # Update existing customer stats
            customer.total_visits += 1
            customer.lifetime_value += body.total_amount
            customer.last_visit = datetime.now(timezone.utc)

    # Create transaction
    transaction = Transaction(
        customer_id=customer.id if customer else None,
        staff_id=current_user.id,
        total_amount=body.total_amount,
        payment_mode=body.payment_mode,
        raw_input=body.raw_input,
        input_type=body.input_type,
        ai_extracted_json=body.ai_extracted_json,
        notes=body.notes,
        service_date=body.service_date or datetime.now(timezone.utc),
    )
    db.add(transaction)
    await db.flush()

    # Add service line items
    for service_name in body.services:
        # Try to find existing service
        result = await db.execute(
            select(Service).where(
                func.lower(Service.name) == service_name.lower()
            )
        )
        service = result.scalar_one_or_none()

        ts = TransactionService(
            transaction_id=transaction.id,
            service_id=service.id if service else None,
            service_name=service_name,
            price=service.base_price if service and service.base_price else 0,
            quantity=1,
        )
        db.add(ts)

    # Update customer lifetime value if new customer
    if customer and customer.total_visits == 1:
        customer.lifetime_value = body.total_amount

    await db.flush()
    await db.refresh(transaction)

    return _format_transaction_response(transaction)


# ── Transaction CRUD ─────────────────────────────────────

@router.get("", response_model=TransactionListResponse)
async def list_transactions(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    payment_mode: Optional[str] = None,
    customer_id: Optional[int] = None,
):
    """List transactions with filters and pagination."""
    query = select(Transaction)

    if date_from:
        query = query.where(Transaction.service_date >= date_from)
    if date_to:
        query = query.where(Transaction.service_date <= date_to)
    if payment_mode:
        query = query.where(Transaction.payment_mode == payment_mode)
    if customer_id:
        query = query.where(Transaction.customer_id == customer_id)

    # Count
    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar() or 0

    # Paginate
    query = query.order_by(Transaction.service_date.desc())
    query = query.offset((page - 1) * page_size).limit(page_size)

    result = await db.execute(query)
    transactions = result.scalars().unique().all()

    return TransactionListResponse(
        transactions=[_format_transaction_response(t) for t in transactions],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/{transaction_id}", response_model=TransactionResponse)
async def get_transaction(
    transaction_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    """Get transaction details."""
    result = await db.execute(
        select(Transaction).where(Transaction.id == transaction_id)
    )
    transaction = result.scalar_one_or_none()
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return _format_transaction_response(transaction)


@router.delete("/{transaction_id}")
async def delete_transaction(
    transaction_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    """Delete (void) a transaction."""
    result = await db.execute(
        select(Transaction).where(Transaction.id == transaction_id)
    )
    transaction = result.scalar_one_or_none()
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")

    # Reverse customer stats
    if transaction.customer:
        transaction.customer.total_visits = max(0, transaction.customer.total_visits - 1)
        transaction.customer.lifetime_value = max(
            0, transaction.customer.lifetime_value - transaction.total_amount
        )

    # Delete related transaction services first to avoid foreign key constraint violations
    from sqlalchemy import delete
    await db.execute(delete(TransactionService).where(TransactionService.transaction_id == transaction_id))

    await db.delete(transaction)
    return {"message": "Transaction voided"}


# ── Helpers ──────────────────────────────────────────────

def _format_transaction_response(t: Transaction) -> TransactionResponse:
    """Format a Transaction ORM object to response schema."""
    return TransactionResponse(
        id=t.id,
        customer_id=t.customer_id,
        customer_name=t.customer.name if t.customer else None,
        staff_id=t.staff_id,
        total_amount=t.total_amount,
        payment_mode=t.payment_mode,
        raw_input=t.raw_input,
        input_type=t.input_type,
        notes=t.notes,
        service_date=t.service_date,
        created_at=t.created_at,
        services=[
            TransactionServiceResponse(
                id=ts.id,
                service_name=ts.service_name,
                price=ts.price,
                quantity=ts.quantity,
            )
            for ts in (t.services or [])
        ],
    )
