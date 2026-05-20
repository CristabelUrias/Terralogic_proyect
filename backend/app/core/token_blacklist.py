# ARCHIVO NUEVO
# app/core/token_blacklist.py
#
# Lista negra de tokens JWT.
# Cuando un usuario cierra sesión o cambia contraseña,
# el token anterior se invalida inmediatamente.

import time
from threading import Lock

_lock      = Lock()
_blacklist: dict[str, float] = {}  # token_jti -> expiry_timestamp


def blacklist_token(jti: str, exp: float) -> None:
    """Agrega un token a la lista negra hasta que expire."""
    with _lock:
        _blacklist[jti] = exp
        _cleanup()


def is_blacklisted(jti: str) -> bool:
    """Verifica si un token está en la lista negra."""
    with _lock:
        return jti in _blacklist


def _cleanup() -> None:
    """Elimina tokens expirados para no llenar la memoria."""
    now     = time.time()
    expired = [jti for jti, exp in _blacklist.items() if exp < now]
    for jti in expired:
        del _blacklist[jti]