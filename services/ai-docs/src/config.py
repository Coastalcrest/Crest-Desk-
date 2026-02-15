"""Service configuration from environment variables."""
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Service settings loaded from environment."""

    debug: bool = True
    database_url: str = "postgresql+asyncpg://crestdesk:crestdesk_dev@localhost:5432/crestdesk"
    redis_url: str = "redis://localhost:6379"
    log_level: str = "INFO"

    class Config:
        env_prefix = "CRESTDESK_"


settings = Settings()
