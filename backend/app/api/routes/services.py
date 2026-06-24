"""Service management routes."""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.api.deps import get_current_user, require_admin
from app.models.user import User
from app.models.service import Service
from app.schemas.service import ServiceCreate, ServiceUpdate, ServiceResponse

router = APIRouter(prefix="/services", tags=["Services"])


@router.get("", response_model=list[ServiceResponse])
async def list_services(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    active_only: bool = True,
):
    """List all services."""
    query = select(Service).order_by(Service.name)
    if active_only:
        query = query.where(Service.is_active == True)
    result = await db.execute(query)
    services = result.scalars().all()
    return [ServiceResponse.model_validate(s) for s in services]


@router.post("", response_model=ServiceResponse, status_code=status.HTTP_201_CREATED)
async def create_service(
    body: ServiceCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    admin: Annotated[User, Depends(require_admin)],
):
    """Create a new service (admin only)."""
    existing = await db.execute(select(Service).where(Service.name == body.name))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Service already exists")

    service = Service(**body.model_dump())
    db.add(service)
    await db.flush()
    await db.refresh(service)
    return ServiceResponse.model_validate(service)


@router.put("/{service_id}", response_model=ServiceResponse)
async def update_service(
    service_id: int,
    body: ServiceUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    admin: Annotated[User, Depends(require_admin)],
):
    """Update a service (admin only)."""
    result = await db.execute(select(Service).where(Service.id == service_id))
    service = result.scalar_one_or_none()
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")

    for key, value in body.model_dump(exclude_unset=True).items():
        setattr(service, key, value)

    await db.flush()
    await db.refresh(service)
    return ServiceResponse.model_validate(service)


@router.delete("/{service_id}")
async def delete_service(
    service_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    admin: Annotated[User, Depends(require_admin)],
):
    """Deactivate a service (admin only)."""
    result = await db.execute(select(Service).where(Service.id == service_id))
    service = result.scalar_one_or_none()
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")

    service.is_active = False
    await db.flush()
    return {"message": f"Service '{service.name}' deactivated"}
