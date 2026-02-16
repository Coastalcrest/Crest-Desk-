"""Service configuration from environment variables."""
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Service settings loaded from environment."""

    debug: bool = True
    database_url: str = "postgresql+asyncpg://crestdesk:crestdesk_dev@localhost:5432/crestdesk"
    redis_url: str = "redis://localhost:6379"
    log_level: str = "INFO"

    # OpenAI / DALL-E integration
    openai_api_key: str = ""
    image_model: str = "dall-e-3"

    # Media storage
    media_storage_bucket: str = "crestdesk-media-dev"
    media_cdn_base_url: str = "https://media.crestdesk.dev"

    # Rate limits
    max_batch_size: int = 20

    class Config:
        env_prefix = "CRESTDESK_"


settings = Settings()
