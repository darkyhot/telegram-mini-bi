from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str = "sqlite:///./data/mini_bi.db"
    ollama_base_url: str = "http://localhost:11434"
    ollama_model: str = "qwen2.5:latest"
    telegram_bot_token: str = ""
    max_file_size_mb: int = 10
    max_rows: int = 100000
    upload_dir: str = "./data/uploads"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
