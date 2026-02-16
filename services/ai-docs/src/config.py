"""Service configuration from environment variables."""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Service settings loaded from environment.

    All variables are prefixed with CRESTDESK_ in the environment.
    For example, set CRESTDESK_ANTHROPIC_API_KEY to configure Claude access.
    """

    debug: bool = True
    log_level: str = "INFO"

    # Infrastructure
    database_url: str = "postgresql+asyncpg://crestdesk:crestdesk_dev@localhost:5432/crestdesk"
    redis_url: str = "redis://localhost:6379"

    # Anthropic / Claude
    anthropic_api_key: str = ""
    anthropic_model: str = "claude-sonnet-4-5-20250929"
    max_tokens: int = 4096

    # Networking
    host: str = "0.0.0.0"
    port: int = 8010
    gateway_url: str = "http://localhost:4000"

    class Config:
        env_prefix = "CRESTDESK_"


settings = Settings()
