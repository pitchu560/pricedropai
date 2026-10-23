import os
import sys
from contextlib import asynccontextmanager
from fastapi import FastAPI, status
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base, SessionLocal
from config import settings
from data.importer import dataset_importer
from models import Product

# Import routers
from routers import (
    products,
    alerts,
    approvals,
    verification_logs,
    dataset,
    monitoring
)

# Initialize database schema
Base.metadata.create_all(bind=engine)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Auto-seed database if empty
    db = SessionLocal()
    try:
        count = db.query(Product).count()
        if count == 0:
            print("[INFO] Initializing SQLite database with synthetic demo dataset...")
            dataset_importer.import_all(db)
            print("[INFO] Database seeded successfully.")
    except Exception as e:
        print(f"[WARNING] Startup seed notice: {e}")
    finally:
        db.close()
    yield
    # Shutdown logic (if any)

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Full-Stack Autonomous Price Drop Watcher with Evidence Verification, Decision Engine, and Approval-Gated Simulated Cart Actions.",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(products.router)
app.include_router(alerts.router)
app.include_router(approvals.router)
app.include_router(verification_logs.router)
app.include_router(dataset.router)
app.include_router(monitoring.router)

@app.get("/health", status_code=status.HTTP_200_OK, tags=["Health"])
def health_check():
    """
    Service health probe for uptime and subsystem verification.
    """
    return {
        "status": "healthy",
        "service": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "database": "sqlite",
        "decision_engine": "operational",
        "cart_simulator": "approval_gated_safe"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=False)
