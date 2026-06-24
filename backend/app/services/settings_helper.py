from sqlalchemy import select
from app.core.database import async_session
from app.models.settings import AppSetting
from app.core.config import settings

async def get_db_setting(key: str, default: str) -> str:
    """Retrieve a setting from the database or fall back to default."""
    async with async_session() as db:
        try:
            result = await db.execute(select(AppSetting).where(AppSetting.key == key))
            setting = result.scalar_one_or_none()
            if setting and setting.value is not None:
                return setting.value
        except Exception:
            pass
    return default
