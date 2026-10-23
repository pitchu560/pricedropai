from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional
import os

class Settings(BaseSettings):
    APP_NAME: str = "AI Price Drop Watcher Agent"
    APP_VERSION: str = "1.0.0"
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./price_watcher.db")
    EVIDENCE_MAX_AGE_SECONDS: int = 86400  # 24 hours
    MAX_PRICE_DROP_PERCENTAGE_CAP: float = 85.0  # Drops >85% trigger UNCERTAIN verification flag
    ALERT_COOLDOWN_MINUTES: int = 60
    CORS_ORIGINS: list[str] = ["*"]
    
    model_config = SettingsConfigDict(
        env_file=".env",
        extra="ignore"
    )

settings = Settings()
