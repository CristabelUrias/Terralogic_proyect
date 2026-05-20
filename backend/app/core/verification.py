# app/core/verification.py
import random
import time
from threading import Lock

_lock  = Lock()
_store: dict[str, dict] = {}  # email -> {code, expires_at, attempts}

OTP_EXPIRE_SECONDS = 900   # 15 minutos
MAX_ATTEMPTS       = 5


def generate_otp(email: str) -> str:
    """Genera un código OTP de 6 dígitos y lo almacena."""
    code = str(random.randint(100000, 999999))
    with _lock:
        _store[email.lower()] = {
            "code":       code,
            "expires_at": time.time() + OTP_EXPIRE_SECONDS,
            "attempts":   0,
        }
    return code


def verify_otp(email: str, code: str) -> tuple[bool, str]:
    """
    Verifica el OTP ingresado.
    Retorna (válido, mensaje)
    """
    key = email.lower()
    with _lock:
        entry = _store.get(key)

        if not entry:
            return False, "Código no encontrado. Solicita uno nuevo."

        if time.time() > entry["expires_at"]:
            del _store[key]
            return False, "El código ha expirado. Solicita uno nuevo."

        entry["attempts"] += 1

        if entry["attempts"] > MAX_ATTEMPTS:
            del _store[key]
            return False, "Demasiados intentos incorrectos. Solicita un nuevo código."

        if entry["code"] != code.strip():
            remaining = MAX_ATTEMPTS - entry["attempts"]
            return False, f"Código incorrecto. {remaining} intento(s) restante(s)."

        # Código válido — limpiar
        del _store[key]
        return True, "Verificado correctamente."


def has_pending_otp(email: str) -> bool:
    """Verifica si hay un OTP pendiente y no expirado para este email."""
    key   = email.lower()
    entry = _store.get(key)
    if not entry:
        return False
    if time.time() > entry["expires_at"]:
        del _store[key]
        return False
    return True