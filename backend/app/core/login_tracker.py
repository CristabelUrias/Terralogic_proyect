# ARCHIVO NUEVO
# app/core/login_tracker.py
#
# Rastrea intentos fallidos de login por IP y email.
# Bloquea temporalmente después de N intentos fallidos.
# Usa memoria en lugar de Redis para simplicidad en desarrollo.

import time
from collections import defaultdict
from threading import Lock

# Configuración
MAX_ATTEMPTS     = 5     # Intentos antes de bloquear
BLOCK_SECONDS    = 300   # 5 minutos de bloqueo
WINDOW_SECONDS   = 600   # Ventana de tiempo para contar intentos (10 min)

_lock    = Lock()
_attempts: dict[str, list[float]] = defaultdict(list)  # key -> lista de timestamps
_blocked:  dict[str, float]       = {}                  # key -> timestamp de bloqueo


def _make_key(ip: str, email: str) -> str:
    return f"{ip}:{email.lower()}"


def is_blocked(ip: str, email: str) -> tuple[bool, int]:
    """
    Verifica si una IP/email está bloqueada.
    Returns: (blocked, seconds_remaining)
    """
    key = _make_key(ip, email)
    with _lock:
        if key in _blocked:
            elapsed  = time.time() - _blocked[key]
            remaining = int(BLOCK_SECONDS - elapsed)
            if remaining > 0:
                return True, remaining
            else:
                # Bloqueo expirado — limpiar
                del _blocked[key]
                _attempts[key] = []
    return False, 0


def record_failure(ip: str, email: str) -> tuple[bool, int]:
    """
    Registra un intento fallido.
    Returns: (now_blocked, attempts_remaining)
    """
    key  = _make_key(ip, email)
    now  = time.time()
    with _lock:
        # Limpiar intentos fuera de la ventana de tiempo
        _attempts[key] = [t for t in _attempts[key] if now - t < WINDOW_SECONDS]
        _attempts[key].append(now)

        count = len(_attempts[key])
        if count >= MAX_ATTEMPTS:
            _blocked[key] = now
            _attempts[key] = []
            return True, 0

        return False, MAX_ATTEMPTS - count


def record_success(ip: str, email: str) -> None:
    """Limpia los intentos fallidos tras un login exitoso."""
    key = _make_key(ip, email)
    with _lock:
        _attempts.pop(key, None)
        _blocked.pop(key, None)