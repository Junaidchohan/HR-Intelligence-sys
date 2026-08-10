from __future__ import annotations

import datetime
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from app.config import settings
from app.db import get_db
from app.models import User

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def hash_password(plain: str) -> str:
    # FIX: bcrypt has a hard 72-BYTE limit, not character limit.
    # We must check the UTF-8 byte length to guarantee Render compatibility.
    plain_bytes = plain.encode('utf-8')
    if len(plain_bytes) > 72:
        # Truncate safely at the byte level
        truncated_bytes = plain_bytes[:72]
        plain = truncated_bytes.decode('utf-8', errors='ignore')
        print(f"⚠️ [SECURITY] Password exceeded 72 bytes. Truncated to 72 bytes to satisfy bcrypt.")
    
    return pwd_context.hash(plain)


def create_access_token(subject: str, expires_minutes: Optional[int] = None) -> str:
    expire = datetime.datetime.utcnow() + datetime.timedelta(
        minutes=expires_minutes or settings.access_token_expire_minutes
    )
    payload = {"sub": subject, "exp": expire}
    return jwt.encode(payload, settings.secret_key, algorithm=settings.algorithm)


def decode_token(token: str) -> str:
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        sub = payload.get("sub")
        if not sub:
            raise ValueError("missing sub")
        return sub
    except (JWTError, ValueError) as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token") from exc


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    email = decode_token(token)
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user


def require_admin(user: User = Depends(get_current_user)) -> User:
    if user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return user