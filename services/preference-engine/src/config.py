"""Configuration for the preference-engine service."""
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/crestdesk"
    redis_url: str = "redis://localhost:6379/0"
    port: int = 8000
    debug: bool = False
    log_level: str = "info"

    model_config = {"env_prefix": "CRESTDESK_"}


settings = Settings()
