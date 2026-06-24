"""App Settings routes — Read and update runtime configuration."""

from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.api.deps import get_current_user, require_admin
from app.models.user import User
from app.models.settings import AppSetting

router = APIRouter(prefix="/settings", tags=["Settings"])


@router.get("")
async def list_settings(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    category: Optional[str] = None,
):
    """List all app settings, optionally filtered by category."""
    query = select(AppSetting)
    result = await db.execute(query)
    settings_db = result.scalars().all()
    db_map = {s.key: s for s in settings_db}

    # Define standard settings with their defaults and categories
    from app.core.config import settings as config_settings
    defaults = {
        "SALON_NAME": (config_settings.SALON_NAME, "general"),
        "SALON_CITY": (config_settings.SALON_CITY, "general"),
        "SALON_STATE": (config_settings.SALON_STATE, "general"),
        "DEFAULT_WHATSAPP_RECIPIENT": (config_settings.DEFAULT_WHATSAPP_RECIPIENT, "whatsapp"),
        "DEFAULT_EMAIL_RECIPIENT": (config_settings.DEFAULT_EMAIL_RECIPIENT, "email"),
        "SMTP_HOST": (config_settings.SMTP_HOST, "email"),
        "SMTP_PORT": (str(config_settings.SMTP_PORT), "email"),
        "SMTP_USER": (config_settings.SMTP_USER, "email"),
        "SMTP_PASSWORD": (config_settings.SMTP_PASSWORD, "email"),
    }

    response_data = []
    for key, (def_val, cat) in defaults.items():
        if category and cat != category:
            continue
        db_item = db_map.get(key)
        val = db_item.value if db_item else def_val
        
        # Mask password if not empty
        if key == "SMTP_PASSWORD" and val:
            val = "********"
            
        response_data.append({
            "id": db_item.id if db_item else None,
            "key": key,
            "value": val,
            "category": cat,
            "updated_at": db_item.updated_at.isoformat() if (db_item and db_item.updated_at) else None,
        })
    return response_data


@router.get("/{key}")
async def get_setting(
    key: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    """Get a specific setting by key."""
    result = await db.execute(select(AppSetting).where(AppSetting.key == key))
    setting = result.scalar_one_or_none()
    
    if not setting:
        # Check defaults
        from app.core.config import settings as config_settings
        defaults = {
            "SALON_NAME": (config_settings.SALON_NAME, "general"),
            "SALON_CITY": (config_settings.SALON_CITY, "general"),
            "SALON_STATE": (config_settings.SALON_STATE, "general"),
            "DEFAULT_WHATSAPP_RECIPIENT": (config_settings.DEFAULT_WHATSAPP_RECIPIENT, "whatsapp"),
            "DEFAULT_EMAIL_RECIPIENT": (config_settings.DEFAULT_EMAIL_RECIPIENT, "email"),
            "SMTP_HOST": (config_settings.SMTP_HOST, "email"),
            "SMTP_PORT": (str(config_settings.SMTP_PORT), "email"),
            "SMTP_USER": (config_settings.SMTP_USER, "email"),
            "SMTP_PASSWORD": (config_settings.SMTP_PASSWORD, "email"),
        }
        if key in defaults:
            val, cat = defaults[key]
            return {
                "key": key,
                "value": val,
                "category": cat,
            }
        raise HTTPException(status_code=404, detail=f"Setting '{key}' not found")

    return {
        "key": setting.key,
        "value": setting.value,
        "category": setting.category,
    }


@router.put("")
async def update_settings(
    body: dict,
    db: Annotated[AsyncSession, Depends(get_db)],
    admin: Annotated[User, Depends(require_admin)],
):
    """
    Update multiple settings at once.
    Body format: { "settings": [{"key": "...", "value": "...", "category": "..."}] }
    """
    items = body.get("settings", [])
    updated = []

    for item in items:
        key = item.get("key")
        value = item.get("value", "")
        category = item.get("category", "general")

        if not key:
            continue

        result = await db.execute(select(AppSetting).where(AppSetting.key == key))
        setting = result.scalar_one_or_none()

        if key == "SMTP_PASSWORD":
            # If masked password or empty, don't overwrite if password already exists
            if value == "********" or not value:
                if setting and setting.value:
                    continue
                if not setting:
                    # Don't create setting with empty password if we have config default
                    from app.core.config import settings as config_settings
                    if config_settings.SMTP_PASSWORD:
                        continue

        if setting:
            setting.value = value
            setting.category = category
        else:
            setting = AppSetting(key=key, value=value, category=category)
            db.add(setting)

        updated.append(key)

    await db.flush()
    return {"updated": updated, "count": len(updated)}


@router.delete("/{key}")
async def delete_setting(
    key: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    admin: Annotated[User, Depends(require_admin)],
):
    """Delete a setting by key (admin only)."""
    result = await db.execute(select(AppSetting).where(AppSetting.key == key))
    setting = result.scalar_one_or_none()
    if not setting:
        raise HTTPException(status_code=404, detail=f"Setting '{key}' not found")

    await db.delete(setting)
    return {"message": f"Setting '{key}' deleted"}
