from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """AI Docs service configuration."""

    app_name: str = "crestdesk-ai-docs"
    debug: bool = False
    host: str = "0.0.0.0"
    port: int = 8010

    # Anthropic
    anthropic_api_key: str = ""
    anthropic_model: str = "claude-sonnet-4-5-20250929"
    max_tokens: int = 4096

    # Service URLs
    gateway_url: str = "http://localhost:4000"

    class Config:
        env_prefix = "AI_DOCS_"
        env_file = ".env"


settings = Settings()
