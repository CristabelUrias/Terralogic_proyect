import os
import re
import time
from collections import defaultdict
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.api.v1.api import api_router
from app.db.session import engine
from app.db.base import Base
from app.core.rate_limit import limiter

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="TerraLogic AI API",
    version="1.0.0",
    docs_url=None,
    redoc_url=None,
    openapi_url=None,
)

# ── Rate limiter ──────────────────────────────────────────────
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ── CORS ──────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost",
        "http://127.0.0.1",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Registro de IPs sospechosas ───────────────────────────────
_suspicious_ips: dict[str, dict] = defaultdict(lambda: {"count": 0, "blocked_until": 0})
SUSPICIOUS_THRESHOLD = 10
BLOCK_SECONDS = 300

# ── User-Agents maliciosos ────────────────────────────────────
MALICIOUS_UA_PATTERNS = [
    r"nikto", r"sqlmap", r"nmap", r"masscan", r"hydra",
    r"burpsuite", r"metasploit", r"dirbuster", r"gobuster",
    r"wfuzz", r"nuclei", r"acunetix", r"nessus", r"openvas",
    r"zgrab", r"python-requests/2\.2[0-9]",
]

# ── Patrones WAF ──────────────────────────────────────────────
WAF_PATTERNS = [
    r"(union[\s\+%20]+select|select[\s\+%20]+from|drop[\s\+%20]+table|insert[\s\+%20]+into|delete[\s\+%20]+from)",
    r"(union\s+select|select\s+from|drop\s+table|insert\s+into|delete\s+from)",
    r"(--|;--|'--|#|/\*|\*/)",
    r"(or\s+1=1|and\s+1=1|or\s+'1'='1)",
    r"(sleep\s*\(|benchmark\s*\(|waitfor\s+delay)",
    r"(%20union%20|%20select%20|%20from%20|%20where%20)",
    r"(<script|javascript:|onerror=|onload=|onclick=|alert\s*\()",
    r"(document\.cookie|window\.location|eval\s*\()",
    r"(\.\./|\.\.\\|%2e%2e%2f|%252e%252e)",
    r"(;\s*cat\s|;\s*ls\s|;\s*pwd|;\s*id\s|&&\s*id|`id`|\$\(id\))",
    r"(169\.254\.169\.254|metadata\.google|localhost:(?!5173|3000|8000))",
]

COMPILED_WAF = [re.compile(p, re.IGNORECASE) for p in WAF_PATTERNS]
COMPILED_UA = [re.compile(p, re.IGNORECASE) for p in MALICIOUS_UA_PATTERNS]


def get_client_ip(request: Request) -> str:
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def flag_ip(ip: str):
    entry = _suspicious_ips[ip]
    entry["count"] += 1
    if entry["count"] >= SUSPICIOUS_THRESHOLD:
        entry["blocked_until"] = time.time() + BLOCK_SECONDS
        print(f"[SECURITY] IP bloqueada: {ip}")


def is_ip_blocked(ip: str) -> bool:
    entry = _suspicious_ips.get(ip)
    if not entry:
        return False

    if entry["blocked_until"] > time.time():
        return True

    if entry["blocked_until"] > 0:
        entry["count"] = 0
        entry["blocked_until"] = 0

    return False


# ── MIDDLEWARE 1: Seguridad ───────────────────────────────────
@app.middleware("http")
async def security_gate(request: Request, call_next):

    ip = get_client_ip(request)

    if is_ip_blocked(ip):
        return JSONResponse(
            status_code=403,
            content={"detail": "Acceso denegado."}
        )

    ua = request.headers.get("User-Agent", "")

    for pattern in COMPILED_UA:
        if pattern.search(ua):
            flag_ip(ip)
            return JSONResponse(
                status_code=403,
                content={"detail": "Acceso denegado."}
            )

    full_url = str(request.url)
    query_str = str(request.url.query)

    for pattern in COMPILED_WAF:
        if pattern.search(full_url) or pattern.search(query_str):
            flag_ip(ip)
            return JSONResponse(
                status_code=400,
                content={"detail": "Solicitud no válida."}
            )

    if request.method in ("POST", "PUT", "PATCH"):

        content_type = request.headers.get("content-type", "")

        if "application/json" in content_type:

            try:
                body_bytes = await request.body()
                body_str = body_bytes.decode("utf-8", errors="ignore")

                for pattern in COMPILED_WAF:
                    if pattern.search(body_str):
                        flag_ip(ip)

                        return JSONResponse(
                            status_code=400,
                            content={"detail": "Solicitud no válida."}
                        )

                async def receive():
                    return {
                        "type": "http.request",
                        "body": body_bytes
                    }

                request._receive = receive

            except Exception:
                pass

    return await call_next(request)


# ── MIDDLEWARE 2: Tamaño request ──────────────────────────────
MAX_BODY_SIZE = 15 * 1024 * 1024

@app.middleware("http")
async def limit_body_size(request: Request, call_next):

    content_length = request.headers.get("content-length")

    if content_length and int(content_length) > MAX_BODY_SIZE:

        return JSONResponse(
            status_code=413,
            content={
                "detail": "El contenido enviado supera el límite permitido (15MB)."
            }
        )

    return await call_next(request)


# ── MIDDLEWARE 3: Headers seguridad ───────────────────────────
@app.middleware("http")
async def security_headers(request: Request, call_next):

    response = await call_next(request)

    response.headers["Server"] = "TerraLogic"
    response.headers["X-Powered-By"] = ""

    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"

    response.headers["Permissions-Policy"] = (
        "geolocation=(), microphone=(), camera=()"
    )

    # IMPORTANTE PARA REACT/VITE
    response.headers["Content-Security-Policy"] = (
        "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob:;"
    )

    response.headers["Strict-Transport-Security"] = (
        "max-age=31536000; includeSubDomains"
    )

    if request.url.path.startswith("/api/v1/auth"):

        response.headers["Cache-Control"] = (
            "no-store, no-cache, must-revalidate"
        )

        response.headers["Pragma"] = "no-cache"

    return response


# ── Manejo errores ────────────────────────────────────────────
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):

    ip = get_client_ip(request)

    print(
        f"[ERROR] {request.method} {request.url} "
        f"→ {type(exc).__name__}: {exc} | IP: {ip}"
    )

    return JSONResponse(
        status_code=500,
        content={
            "detail": "Error interno del servidor."
        },
    )


# ── Archivos estáticos ────────────────────────────────────────
os.makedirs("./uploads", exist_ok=True)

app.mount(
    "/uploads",
    StaticFiles(directory="./uploads"),
    name="uploads"
)

# ── Routers ───────────────────────────────────────────────────
app.include_router(api_router, prefix="/api/v1")


@app.get("/", tags=["Health"])
def root():
    return {"status": "online"}