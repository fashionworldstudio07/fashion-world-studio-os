"""Customer management routes — CRUD, search, history."""

from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.customer import Customer
from app.schemas.customer import (
    CustomerCreate,
    CustomerUpdate,
    CustomerResponse,
    CustomerListResponse,
)

router = APIRouter(prefix="/customers", tags=["Customers"])


@router.get("", response_model=CustomerListResponse)
async def list_customers(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    search: Optional[str] = Query(None, description="Search by name or phone"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    """List customers with optional search and pagination."""
    query = select(Customer)

    if search:
        search_term = f"%{search}%"
        query = query.where(
            or_(
                Customer.name.ilike(search_term),
                Customer.phone.ilike(search_term),
            )
        )

    # Count total
    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar() or 0

    # Paginate
    query = query.order_by(Customer.last_visit.desc())
    query = query.offset((page - 1) * page_size).limit(page_size)

    result = await db.execute(query)
    customers = result.scalars().all()

    return CustomerListResponse(
        customers=[CustomerResponse.model_validate(c) for c in customers],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/{customer_id}", response_model=CustomerResponse)
async def get_customer(
    customer_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    """Get customer details by ID."""
    result = await db.execute(select(Customer).where(Customer.id == customer_id))
    customer = result.scalar_one_or_none()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    return CustomerResponse.model_validate(customer)


@router.post("", response_model=CustomerResponse, status_code=status.HTTP_201_CREATED)
async def create_customer(
    body: CustomerCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    """Create a new customer."""
    # Check duplicate phone
    if body.phone:
        existing = await db.execute(
            select(Customer).where(Customer.phone == body.phone)
        )
        if existing.scalar_one_or_none():
            raise HTTPException(status_code=409, detail="Phone number already exists")

    customer = Customer(**body.model_dump())
    db.add(customer)
    await db.flush()
    await db.refresh(customer)
    return CustomerResponse.model_validate(customer)


@router.put("/{customer_id}", response_model=CustomerResponse)
async def update_customer(
    customer_id: int,
    body: CustomerUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    """Update customer details."""
    result = await db.execute(select(Customer).where(Customer.id == customer_id))
    customer = result.scalar_one_or_none()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    update_data = body.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(customer, key, value)

    await db.flush()
    await db.refresh(customer)
    return CustomerResponse.model_validate(customer)


@router.delete("/{customer_id}")
async def delete_customer(
    customer_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    """Delete a customer."""
    result = await db.execute(select(Customer).where(Customer.id == customer_id))
    customer = result.scalar_one_or_none()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    # Set customer_id to None in transactions referencing this customer
    from sqlalchemy import update
    from app.models.transaction import Transaction
    await db.execute(
        update(Transaction)
        .where(Transaction.customer_id == customer_id)
        .values(customer_id=None)
    )

    await db.delete(customer)
    return {"message": "Customer deleted"}
