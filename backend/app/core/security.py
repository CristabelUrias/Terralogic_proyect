import os
import re
from datetime import datetime, timedelta
from typing import Any, Union
import uuid
from dotenv import load_dotenv
from jose import jwt
from passlib.context import CryptContext

load_dotenv()
 
SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "")
if not SECRET_KEY:
    raise RuntimeError("JWT_SECRET_KEY no está definida en el archivo .env")
ALGORITHM                    = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES  = int(os.environ.get("JWT_EXPIRE_MINUTES", "480"))
INACTIVITY_TIMEOUT_MINUTES   = 60  # Sesión expira tras 60 min sin actividad
 
PWD_CONTEXT = CryptContext(schemes=["bcrypt"], deprecated="auto")

# ── Hash y verificación ───────────────────────────────────────

def get_password_hash(password: str) -> str:
    return PWD_CONTEXT.hash(password)

def verify_password(plain: str, hashed: str) -> bool:
    return PWD_CONTEXT.verify(plain, hashed)


# ── Política de contraseñas ───────────────────────────────────

def validate_password_strength(password: str) -> tuple[bool, str]:
    """
    Valida que la contraseña cumpla los requisitos mínimos de seguridad.
    Retorna (válida, mensaje_error)
    """
    if len(password) < 8:
        return False, "La contraseña debe tener al menos 8 caracteres."
    if not re.search(r'[0-9]', password):
        return False, "La contraseña debe contener al menos un número."
    if not re.search(r'[A-Za-z]', password):
        return False, "La contraseña debe contener al menos una letra."
    if password.lower() in {
        "password", "12345678", "password1", "terralogic",
        "terralogic1", "admin1234", "12345678a"
    }:
        return False, "La contraseña es demasiado común. Elige una más segura."
    return True, ""


# ── Tokens JWT ────────────────────────────────────────────────

def create_access_token(subject: Union[str, Any], expires_delta: timedelta = None) -> str:
    now    = datetime.utcnow()
    expire = now + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    payload = {
        "sub":  str(subject),
        "exp":  expire,
        "jti":  str(uuid.uuid4()),   # ID único para blacklist
        "iat":  now,                  # Issued at — para calcular inactividad
        "last": now.timestamp(),      # Último uso — se actualiza con cada request
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> dict | None:
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except Exception:
        return None


def is_token_inactive(payload: dict) -> bool:
    """
    Verifica si el token ha estado inactivo más de INACTIVITY_TIMEOUT_MINUTES.
    """
    last_used = payload.get("last")
    if not last_used:
        return False
    elapsed = datetime.utcnow().timestamp() - float(last_used)
    return elapsed > (INACTIVITY_TIMEOUT_MINUTES * 60)


def refresh_token_activity(token: str) -> str | None:
    """
    Genera un nuevo token con el timestamp 'last' actualizado.
    Se llama en cada request autenticado para resetear el timeout.
    """
    payload = decode_token(token)
    if not payload:
        return None

    now = datetime.utcnow()
    payload["last"] = now.timestamp()
    # Mantener la expiración original
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)