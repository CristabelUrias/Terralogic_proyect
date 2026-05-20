#ARCHIVO NUEVO
# app/core/rate_limit.py
#
# Rate limiting usando slowapi (wrapper de limits para FastAPI).
# Limita requests por IP para proteger endpoints críticos.

from slowapi import Limiter
from slowapi.util import get_remote_address

# Usa la IP del cliente como identificador
limiter = Limiter(key_func=get_remote_address)