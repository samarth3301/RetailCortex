from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    clerk_jwks_url: str
    clerk_secret_key: str = ""
    allowed_origins: list[str] = ["http://localhost:3000"]

    database_url: str

    # Elastic MCP Settings
    elastic_cloud_id: str = ""
    elastic_api_key: str = ""
    elastic_index: str = "retail-products"

    # Dynatrace MCP Settings
    dynatrace_url: str = ""
    dynatrace_token: str = ""

    # Google Cloud / Gemini Settings
    google_cloud_project: str = ""
    google_application_credentials: str = ""


settings = Settings()  # type: ignore
