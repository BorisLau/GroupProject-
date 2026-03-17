from cryptography.fernet import Fernet, InvalidToken
from .config import get_settings


def _get_fernet() -> Fernet:
    settings = get_settings()
    try:
        return Fernet(settings.app_encryption_key.encode("utf-8"))
    except Exception as exc:  # noqa: BLE001
        raise ValueError("APP_ENCRYPTION_KEY must be a valid Fernet key") from exc


def encrypt_secret(raw_secret: str) -> str:
    secret = raw_secret.strip()
    if not secret:
        raise ValueError("secret cannot be empty")
    token = _get_fernet().encrypt(secret.encode("utf-8"))
    return token.decode("utf-8")


def decrypt_secret(encrypted_secret: str) -> str:
    try:
        plain = _get_fernet().decrypt(encrypted_secret.encode("utf-8"))
    except InvalidToken as exc:
        raise ValueError("Cannot decrypt stored secret") from exc
    return plain.decode("utf-8")
