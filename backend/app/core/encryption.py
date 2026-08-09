import base64
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from app.config import settings

_fernet_instance = None

def get_fernet() -> Fernet:
    global _fernet_instance
    if _fernet_instance is not None:
        return _fernet_instance

    password = settings.secret_key.encode()
    salt = b"talent_intelligence_byok_salt"  # Static salt for key derivation
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt=salt,
        iterations=100000,
    )
    key = base64.urlsafe_b64encode(kdf.derive(password))
    _fernet_instance = Fernet(key)
    return _fernet_instance

def encrypt_token(plain_text: str | None) -> str | None:
    if not plain_text:
        return None
    fernet = get_fernet()
    return fernet.encrypt(plain_text.encode()).decode()

def decrypt_token(encrypted_text: str | None) -> str | None:
    if not encrypted_text:
        return None
    try:
        fernet = get_fernet()
        return fernet.decrypt(encrypted_text.encode()).decode()
    except Exception:
        return None
