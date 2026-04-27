"""JWT and password hashing."""
import os
from datetime import datetime, timedelta
from passlib.context import CryptContext
from jose import JWTError, jwt

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def _normalize_password(password: str) -> str:
    """
    Normalize password so bcrypt's 72-byte limit is never exceeded.
    Operates on bytes to be safe with non-ASCII characters.
    """
    pw_bytes = password.encode("utf-8")
    if len(pw_bytes) > 72:
        pw_bytes = pw_bytes[:72]
    return pw_bytes.decode("utf-8", errors="ignore")


def hash_password(password: str) -> str:
    password = _normalize_password(password)
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    plain = _normalize_password(plain)
    return pwd_context.verify(plain, hashed)


def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire_min = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "10080"))  # 7 days
    to_encode.update({"exp": datetime.utcnow() + timedelta(minutes=expire_min)})
    secret = os.getenv("JWT_SECRET", "change-me-in-production")
    algo = os.getenv("JWT_ALGORITHM", "HS256")
    return jwt.encode(to_encode, secret, algorithm=algo)


def decode_token(token: str) -> dict | None:
    try:
        secret = os.getenv("JWT_SECRET", "change-me-in-production")
        return jwt.decode(token, secret, algorithms=[os.getenv("JWT_ALGORITHM", "HS256")])
    except JWTError:
        return None
