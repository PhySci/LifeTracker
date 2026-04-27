from __future__ import annotations

import base64
from datetime import UTC, datetime, timedelta
import hashlib
import hmac
import json
import os
import secrets


PASSWORD_SCHEME = "pbkdf2_sha256"
PASSWORD_ITERATIONS = 260_000
TOKEN_TTL_SECONDS = 60 * 60 * 24 * 30


def _get_secret_key() -> str:
    secret_key = os.getenv("SECRET_KEY")
    if secret_key:
        return secret_key
    if os.getenv("ENVIRONMENT") == "production":
        raise RuntimeError("SECRET_KEY must be set in production")
    return "lifetracker-local-dev-secret"


SECRET_KEY = _get_secret_key()


def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    password_hash = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt.encode("utf-8"),
        PASSWORD_ITERATIONS,
    ).hex()
    return f"{PASSWORD_SCHEME}${PASSWORD_ITERATIONS}${salt}${password_hash}"


def verify_password(password: str, stored_password: str) -> bool:
    parts = stored_password.split("$")
    if len(parts) != 4 or parts[0] != PASSWORD_SCHEME:
        return hmac.compare_digest(password, stored_password)

    _, iterations, salt, expected_hash = parts
    actual_hash = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt.encode("utf-8"),
        int(iterations),
    ).hex()
    return hmac.compare_digest(actual_hash, expected_hash)


def password_needs_rehash(stored_password: str) -> bool:
    return not stored_password.startswith(f"{PASSWORD_SCHEME}${PASSWORD_ITERATIONS}$")


def create_access_token(user_id: int) -> str:
    expires_at = datetime.now(UTC) + timedelta(seconds=TOKEN_TTL_SECONDS)
    payload = {"sub": user_id, "exp": int(expires_at.timestamp())}
    payload_json = json.dumps(payload, separators=(",", ":"), sort_keys=True).encode(
        "utf-8"
    )
    payload_b64 = _urlsafe_b64encode(payload_json)
    signature = _sign(payload_b64)
    return f"{payload_b64}.{signature}"


def read_token_subject(token: str) -> int | None:
    try:
        payload_b64, signature = token.split(".", 1)
    except ValueError:
        return None

    if not hmac.compare_digest(_sign(payload_b64), signature):
        return None

    try:
        payload = json.loads(_urlsafe_b64decode(payload_b64))
    except (ValueError, json.JSONDecodeError):
        return None

    user_id = payload.get("sub")
    expires_at = payload.get("exp")
    if not isinstance(user_id, int) or not isinstance(expires_at, int):
        return None
    if expires_at < int(datetime.now(UTC).timestamp()):
        return None

    return user_id


def _sign(value: str) -> str:
    signature = hmac.new(
        SECRET_KEY.encode("utf-8"),
        value.encode("utf-8"),
        hashlib.sha256,
    ).digest()
    return _urlsafe_b64encode(signature)


def _urlsafe_b64encode(value: bytes) -> str:
    return base64.urlsafe_b64encode(value).rstrip(b"=").decode("ascii")


def _urlsafe_b64decode(value: str) -> bytes:
    padding = "=" * (-len(value) % 4)
    return base64.urlsafe_b64decode(value + padding)
