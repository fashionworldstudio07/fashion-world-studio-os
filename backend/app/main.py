"""
Fashion World Studio AI Business OS — Main Application Entry
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.core.database import init_db, close_db, async_session
from app.seed.seed_data import seed_database

# Import all models so Base.metadata sees them
import app.models  # noqa: F401

# Import route modules
from app.api.routes import auth, customers, services, transactions, dashboard, test, insights, reports, app_settings, export

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown lifecycle."""
    # Startup
    logger.info(f"🚀 Starting {settings.APP_NAME} v{settings.APP_VERSION}")

    # Validate config
    warnings = settings.validate_critical_keys()
    for w in warnings:
        logger.warning(f"⚠️  {w}")

    # Create tables
    await init_db()
    logger.info("✅ Database tables created")

    # Seed default data
    async with async_session() as session:
        await seed_database(session)

    # Start background job scheduler
    from app.core.scheduler import start_scheduler, stop_scheduler
    start_scheduler()

    logger.info("✅ Application ready")
    yield

    # Shutdown
    stop_scheduler()
    await close_db()
    logger.info("👋 Application shut down")


# Create FastAPI app
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="AI-powered Salon Business Operating System",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "https://willowy-raindrop-89dfca.netlify.app",
        "https://fashionworldstudio.netlify.app",
        "https://fashion-world-studio-v2.netlify.app"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routes
app.include_router(auth.router, prefix="/api")
app.include_router(customers.router, prefix="/api")
app.include_router(services.router, prefix="/api")
app.include_router(transactions.router, prefix="/api")
app.include_router(dashboard.router, prefix="/api")
app.include_router(test.router, prefix="/api")
app.include_router(insights.router, prefix="/api")
app.include_router(reports.router, prefix="/api")
app.include_router(app_settings.router, prefix="/api")
app.include_router(export.router, prefix="/api")


@app.get("/")
async def root():
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "running",
    }


@app.exception_handler(RuntimeError)
async def runtime_error_handler(request: Request, exc: RuntimeError):
    """Handle RuntimeErrors (e.g., AI service failures) gracefully."""
    logger.error(f"RuntimeError on {request.url}: {exc}")
    return JSONResponse(
        status_code=500,
        content={"detail": str(exc)},
    )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """Catch-all for unhandled exceptions."""
    logger.error(f"Unhandled error on {request.url}: {type(exc).__name__}: {exc}")
    return JSONResponse(
        status_code=500,
        content={"detail": f"Internal server error: {type(exc).__name__}"},
    )
