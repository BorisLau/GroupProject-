from functools import lru_cache
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parents[1]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    env: str = "development"
    app_name: str = "mindmap-backend"
    cors_origins: str = "*"

    supabase_url: str
    supabase_anon_key: str
    supabase_service_role_key: str

    app_encryption_key: str

    deepseek_base_url: str = "https://api.deepseek.com"
    deepseek_model: str = "deepseek-chat"

    redis_url: str | None = None
    celery_broker_url: str | None = None
    celery_result_backend: str | None = None

    max_upload_size_bytes: int = 10 * 1024 * 1024
    job_poll_interval_seconds: int = 2
    local_mindmap_output_dir: str = "local_output/mindmaps"

    @property
    def cors_origin_list(self) -> list[str]:
        origins = [item.strip() for item in self.cors_origins.split(",")]
        return [origin for origin in origins if origin]

    @property
    def local_mindmap_output_path(self) -> Path:
        path = Path(self.local_mindmap_output_dir)
        if path.is_absolute():
            return path
        return (BASE_DIR / path).resolve()

    @property
    def effective_celery_broker_url(self) -> str:
        if self.celery_broker_url:
            return self.celery_broker_url
        if self.redis_url:
            return self.redis_url
        return "redis://localhost:6379/0"

    @property
    def effective_celery_result_backend(self) -> str:
        if self.celery_result_backend:
            return self.celery_result_backend
        if self.redis_url:
            return self.redis_url
        return "redis://localhost:6379/1"


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
