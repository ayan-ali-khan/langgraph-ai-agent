from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    database_url: str = "postgresql://postgres:password@localhost:5432/crm_hcp"
    groq_api_key: str = ""
    secret_key: str = "changeme"
    environment: str = "development"
    groq_model_primary: str = "llama-3.3-70b-versatile"
    groq_model_secondary: str = "llama-3.3-70b-versatile"

    class Config:
        env_file = ".env"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
