from app.celery_app import celery_app
from app import tasks  # noqa: F401  # Ensure task registration

__all__ = ("celery_app",)
