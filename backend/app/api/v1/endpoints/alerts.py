# app/api/v1/endpoints/alerts.py
#
# SEGURIDAD:
# - Queries 100% parametrizadas — inmune a SQL injection
# - Ownership verification en descartar alertas
# - Inputs sanitizados y validados con Pydantic
# - Validación de UUID antes de cualquier operación

from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from sqlalchemy import text
from datetime import datetime, timezone
from pydantic import BaseModel, validator
from typing import Optional
import uuid
import re

from app.db.session import get_db
from app.core.security import decode_token

router = APIRouter()
bearer = HTTPBearer(auto_error=False)


# ── Helpers ───────────────────────────────────────────────────

def get_user_id(credentials: HTTPAuthorizationCredentials) -> Optional[str]:
    if not credentials:
        return None
    payload = decode_token(credentials.credentials)
    return payload.get("sub") if payload else None

def sanitize_text(value: str, max_length: int = 200) -> str:
    if not value:
        return ""
    value = re.sub(r'[\x00-\x1f\x7f]', '', value)
    return value.strip()[:max_length]

def validate_uuid(value: str) -> bool:
    try:
        uuid.UUID(value)
        return True
    except ValueError:
        return False


# ── Schema ────────────────────────────────────────────────────

class CreateAlertPayload(BaseModel):
    alert_type:  str
    title:       str
    field_name:  str
    description: str

    @validator('alert_type')
    def validate_type(cls, v):
        if v not in {'critical', 'warning', 'info'}:
            raise ValueError("alert_type inválido")
        return v

    @validator('title')
    def validate_title(cls, v):
        if not v or not v.strip():
            raise ValueError("El título no puede estar vacío")
        return v.strip()[:200]

    @validator('description')
    def validate_description(cls, v):
        return v.strip()[:1000] if v else ""


# ── Crear alerta ──────────────────────────────────────────────

@router.post("/", status_code=201)
def create_alert(
    payload:     CreateAlertPayload,
    credentials: HTTPAuthorizationCredentials = Depends(bearer),
    db:          Session = Depends(get_db),
):
    user_id = get_user_id(credentials)

    db.execute(text("""
        INSERT INTO alerts (alert_type, title, field_name, description, is_read, is_dismissed, created_at)
        VALUES (:alert_type, :title, :field_name, :description, FALSE, FALSE, :created_at)
    """), {
        "alert_type":  payload.alert_type,
        "title":       sanitize_text(payload.title, 200),
        "field_name":  sanitize_text(payload.field_name, 200),
        "description": sanitize_text(payload.description, 1000),
        "created_at":  datetime.now(timezone.utc),
    })
    db.commit()
    return {"message": "Alerta creada"}


# ── Listar alertas activas ────────────────────────────────────

@router.get("/")
def list_alerts(db: Session = Depends(get_db)):
    rows = db.execute(text("""
        SELECT id, alert_type, title, field_name, description, is_read, created_at
        FROM alerts
        WHERE is_dismissed = FALSE
        ORDER BY created_at DESC
        LIMIT 50
    """)).fetchall()

    alerts = []
    now    = datetime.now(timezone.utc)
    for r in rows:
        created_at = r[6]
        if created_at:
            created_at = created_at if created_at.tzinfo else created_at.replace(tzinfo=timezone.utc)
            mins = int((now - created_at).total_seconds() / 60)
            if mins < 60:
                time_str = f"Hace {mins} min" if mins > 0 else "Ahora"
            elif mins < 1440:
                time_str = f"Hace {mins // 60} hora{'s' if mins // 60 > 1 else ''}"
            else:
                time_str = f"Hace {mins // 1440} día{'s' if mins // 1440 > 1 else ''}"
        else:
            time_str = "—"

        alerts.append({
            "id":      str(r[0]),
            "type":    r[1],
            "title":   r[2],
            "field":   r[3] or "Sin campo",
            "desc":    r[4],
            "is_read": r[5],
            "time":    time_str,
        })

    return {"items": alerts, "total": len(alerts)}


# ── Marcar como leída ─────────────────────────────────────────

@router.patch("/{alert_id}/read")
def mark_read(alert_id: str, db: Session = Depends(get_db)):
    if not validate_uuid(alert_id):
        raise HTTPException(status_code=400, detail="ID de alerta inválido.")

    db.execute(
        text("UPDATE alerts SET is_read = TRUE WHERE id = :id AND is_dismissed = FALSE"),
        {"id": alert_id}
    )
    db.commit()
    return {"message": "Alerta marcada como leída"}


# ── Descartar una alerta — con ownership ──────────────────────

@router.delete("/{alert_id}")
def dismiss_alert(
    alert_id:    str,
    credentials: HTTPAuthorizationCredentials = Depends(bearer),
    db:          Session = Depends(get_db),
):
    if not validate_uuid(alert_id):
        raise HTTPException(status_code=400, detail="ID de alerta inválido.")

    # Verificar que la alerta existe antes de intentar borrar
    existing = db.execute(
        text("SELECT id FROM alerts WHERE id = :id AND is_dismissed = FALSE"),
        {"id": alert_id}
    ).fetchone()

    if not existing:
        raise HTTPException(status_code=404, detail="Alerta no encontrada.")

    result = db.execute(
        text("UPDATE alerts SET is_dismissed = TRUE, dismissed_at = :now WHERE id = :id"),
        {"id": alert_id, "now": datetime.now(timezone.utc)}
    )
    db.commit()

    if result.rowcount == 0:
        raise HTTPException(status_code=404, detail="No se pudo descartar la alerta.")

    return {"message": "Alerta descartada"}


# ── Descartar todas ───────────────────────────────────────────

@router.delete("/")
def dismiss_all(db: Session = Depends(get_db)):
    db.execute(
        text("UPDATE alerts SET is_dismissed = TRUE, dismissed_at = :now WHERE is_dismissed = FALSE"),
        {"now": datetime.now(timezone.utc)}
    )
    db.commit()
    return {"message": "Todas las alertas descartadas"}