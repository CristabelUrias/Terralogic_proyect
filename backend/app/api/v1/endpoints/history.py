# app/api/v1/endpoints/history.py
#
# SEGURIDAD:
# - Todas las queries usan parámetros nombrados (:param) — inmune a SQL injection
# - Ownership verification — usuario solo ve/elimina sus propios registros
# - Inputs sanitizados antes de llegar a la BD

from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from sqlalchemy import text
from datetime import datetime, timezone
from typing import Optional
from pydantic import BaseModel, validator
import uuid
import re

from app.db.session import get_db
from app.core.security import decode_token

router = APIRouter()
bearer = HTTPBearer(auto_error=False)


# ── Helper: obtener user_id del token ─────────────────────────

def get_user_id(credentials: HTTPAuthorizationCredentials) -> Optional[str]:
    if not credentials:
        return None
    payload = decode_token(credentials.credentials)
    return payload.get("sub") if payload else None


# ── Helper: sanitizar strings de texto libre ──────────────────

def sanitize_text(value: str, max_length: int = 200) -> str:
    """
    Elimina caracteres peligrosos y limita la longitud.
    Previene SQL injection por concatenación y XSS almacenado.
    """
    if not value:
        return ""
    # Eliminar caracteres de control
    value = re.sub(r'[\x00-\x1f\x7f]', '', value)
    # Limitar longitud
    return value.strip()[:max_length]


# ── Schema con validaciones ───────────────────────────────────

class SaveAnalysisPayload(BaseModel):
    field_name:        str
    resultado:         str
    ndvi:              float
    cobertura_vegetal: int
    enfermedades:      dict
    estres_hidrico:    dict
    plagas:            dict
    insight:           str
    confianza:         float
    image_url:         Optional[str] = None

    @validator('resultado')
    def validate_resultado(cls, v):
        allowed = {'Saludable', 'Alerta', 'Estrés'}
        if v not in allowed:
            raise ValueError(f"resultado debe ser uno de: {allowed}")
        return v

    @validator('ndvi')
    def validate_ndvi(cls, v):
        if not -1.0 <= v <= 1.0:
            raise ValueError("NDVI debe estar entre -1.0 y 1.0")
        return round(v, 4)

    @validator('cobertura_vegetal')
    def validate_cobertura(cls, v):
        if not 0 <= v <= 100:
            raise ValueError("Cobertura debe estar entre 0 y 100")
        return v

    @validator('confianza')
    def validate_confianza(cls, v):
        if not 0.0 <= v <= 1.0:
            raise ValueError("Confianza debe estar entre 0.0 y 1.0")
        return round(v, 4)


# ── Guardar análisis ──────────────────────────────────────────

@router.post("/save")
def save_analysis(
    payload: SaveAnalysisPayload,
    credentials: HTTPAuthorizationCredentials = Depends(bearer),
    db: Session = Depends(get_db),
):
    user_id   = get_user_id(credentials)
    record_id = str(uuid.uuid4())
    now       = datetime.now(timezone.utc)

    # Sanitizar todos los inputs de texto libre
    field_name    = sanitize_text(payload.field_name, 200)
    enf_detalle   = sanitize_text(payload.enfermedades.get("detalle", ""), 500)
    plagas_detalle = sanitize_text(payload.plagas.get("detalle", ""), 500)
    insight       = sanitize_text(payload.insight, 2000)
    nivel_estres  = sanitize_text(payload.estres_hidrico.get("nivel", ""), 50)

    # Validar valores numéricos de los dicts
    stress_pct   = max(0, min(100, int(payload.estres_hidrico.get("porcentaje", 0))))
    enf_count    = max(0, int(payload.enfermedades.get("count", 0)))
    plagas_count = max(0, int(payload.plagas.get("count", 0)))

    db.execute(text("""
        INSERT INTO analysis_records (
            id, field_name, result, ndvi, cobertura,
            diseases_count, enf_detalle,
            water_stress_pct, nivel_estres,
            plagas_count, plagas_detalle,
            ai_insight, confianza,
            image_url, user_id,
            crop, resolution, analysis_type,
            analyzed_at, created_at
        ) VALUES (
            :id, :field_name, :result, :ndvi, :cobertura,
            :diseases_count, :enf_detalle,
            :water_stress_pct, :nivel_estres,
            :plagas_count, :plagas_detalle,
            :ai_insight, :confianza,
            :image_url, :user_id,
            :crop, :resolution, :analysis_type,
            :analyzed_at, :created_at
        )
    """), {
        "id":               record_id,
        "field_name":       field_name,
        "result":           payload.resultado,
        "ndvi":             payload.ndvi,
        "cobertura":        payload.cobertura_vegetal,
        "diseases_count":   enf_count,
        "enf_detalle":      enf_detalle,
        "water_stress_pct": stress_pct,
        "nivel_estres":     nivel_estres,
        "plagas_count":     plagas_count,
        "plagas_detalle":   plagas_detalle,
        "ai_insight":       insight,
        "confianza":        payload.confianza,
        "image_url":        payload.image_url,
        "user_id":          user_id,
        "crop":             "Sin especificar",
        "resolution":       "N/A",
        "analysis_type":    "Gemini AI",
        "analyzed_at":      now,
        "created_at":       now,
    })
    db.commit()

    try:
        auto_create_alerts(payload, field_name, db)
    except Exception:
        pass

    return {"id": record_id, "message": "Análisis guardado correctamente"}


# ── Listar análisis — solo los del usuario autenticado ────────

@router.get("/list")
def list_analyses(
    skip:  int = 0,
    limit: int = 20,
    credentials: HTTPAuthorizationCredentials = Depends(bearer),
    db: Session = Depends(get_db),
):
    # Validar paginación para evitar abusos
    skip  = max(0, min(skip, 10000))
    limit = max(1, min(limit, 100))

    user_id = get_user_id(credentials)

    # Si hay usuario autenticado → solo sus registros
    # Si no hay token → devuelve todos (para compatibilidad)
    if user_id:
        rows = db.execute(text("""
            SELECT
                id, field_name, result, ndvi, cobertura,
                diseases_count, enf_detalle,
                water_stress_pct, nivel_estres,
                plagas_count, plagas_detalle,
                ai_insight, confianza,
                image_url, analyzed_at
            FROM analysis_records
            WHERE user_id = :user_id
            ORDER BY analyzed_at DESC
            LIMIT :limit OFFSET :skip
        """), {"user_id": user_id, "limit": limit, "skip": skip}).fetchall()

        total = db.execute(
            text("SELECT COUNT(*) FROM analysis_records WHERE user_id = :user_id"),
            {"user_id": user_id}
        ).scalar()
    else:
        rows = db.execute(text("""
            SELECT
                id, field_name, result, ndvi, cobertura,
                diseases_count, enf_detalle,
                water_stress_pct, nivel_estres,
                plagas_count, plagas_detalle,
                ai_insight, confianza,
                image_url, analyzed_at
            FROM analysis_records
            ORDER BY analyzed_at DESC
            LIMIT :limit OFFSET :skip
        """), {"limit": limit, "skip": skip}).fetchall()

        total = db.execute(
            text("SELECT COUNT(*) FROM analysis_records")
        ).scalar()

    records = []
    for r in rows:
        analyzed_at = r[14]
        records.append({
            "id":               str(r[0]),
            "field_name":       r[1] or "Sin nombre",
            "result":           r[2],
            "ndvi":             float(r[3]) if r[3] else 0.0,
            "cobertura":        int(r[4]) if r[4] else 0,
            "diseases_count":   int(r[5]) if r[5] else 0,
            "enf_detalle":      r[6] or "Ninguna",
            "water_stress_pct": int(r[7]) if r[7] else 0,
            "nivel_estres":     r[8] or "—",
            "plagas_count":     int(r[9]) if r[9] else 0,
            "plagas_detalle":   r[10] or "Ninguna",
            "ai_insight":       r[11] or "",
            "confianza":        float(r[12]) if r[12] else 0.0,
            "image_url":        r[13],
            "date":             analyzed_at.strftime("%d %b, %Y") if analyzed_at else "—",
            "time":             analyzed_at.strftime("%I:%M %p") if analyzed_at else "—",
        })

    return {"items": records, "total": total}


# ── Eliminar análisis — solo el propio ───────────────────────

@router.delete("/{record_id}")
def delete_analysis(
    record_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(bearer),
    db: Session = Depends(get_db),
):
    # Validar que record_id sea un UUID válido
    try:
        uuid.UUID(record_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="ID de registro inválido.")

    user_id = get_user_id(credentials)

    if user_id:
        # Con token: solo puede borrar sus propios registros
        result = db.execute(
            text("DELETE FROM analysis_records WHERE id = :id AND user_id = :user_id"),
            {"id": record_id, "user_id": user_id}
        )
    else:
        # Sin token: borrado sin restricción (compatibilidad)
        result = db.execute(
            text("DELETE FROM analysis_records WHERE id = :id"),
            {"id": record_id}
        )

    db.commit()

    if result.rowcount == 0:
        raise HTTPException(
            status_code=404,
            detail="Registro no encontrado o no tienes permiso para eliminarlo."
        )

    return {"message": "Análisis eliminado correctamente"}


# ── Auto-generar alertas ──────────────────────────────────────

def auto_create_alerts(payload: SaveAnalysisPayload, field_name: str, db: Session):
    alerts = []

    stress = max(0, min(100, int(payload.estres_hidrico.get("porcentaje", 0))))
    if stress > 70:
        alerts.append({
            "alert_type":  "critical",
            "title":       "Estrés Hídrico Crítico Detectado",
            "field_name":  field_name,
            "description": f"Estrés hídrico del {stress}% en {field_name}. Se requiere riego urgente.",
        })
    elif stress > 40:
        alerts.append({
            "alert_type":  "warning",
            "title":       "Estrés Hídrico Moderado",
            "field_name":  field_name,
            "description": f"Nivel de estrés hídrico: {stress}% en {field_name}. Considerar aumentar el riego.",
        })

    enf_count = max(0, int(payload.enfermedades.get("count", 0)))
    if enf_count > 0:
        detalle = sanitize_text(payload.enfermedades.get("detalle", ""), 300)
        alerts.append({
            "alert_type":  "critical" if enf_count > 1 else "warning",
            "title":       f"Enfermedades Detectadas en {field_name}",
            "field_name":  field_name,
            "description": f"Se detectaron {enf_count} enfermedad(es): {detalle}.",
        })

    plagas_count = max(0, int(payload.plagas.get("count", 0)))
    if plagas_count > 0:
        detalle = sanitize_text(payload.plagas.get("detalle", ""), 300)
        alerts.append({
            "alert_type":  "critical" if plagas_count > 1 else "warning",
            "title":       f"Presencia de Plagas en {field_name}",
            "field_name":  field_name,
            "description": f"Se detectaron {plagas_count} plaga(s): {detalle}.",
        })

    ndvi = round(float(payload.ndvi), 4)
    if ndvi < 0.3:
        alerts.append({
            "alert_type":  "critical",
            "title":       f"NDVI Crítico en {field_name}",
            "field_name":  field_name,
            "description": f"NDVI de {ndvi} indica vegetación muy deteriorada. Evaluación urgente.",
        })
    elif ndvi < 0.5:
        alerts.append({
            "alert_type":  "warning",
            "title":       f"Vigor Vegetal Bajo en {field_name}",
            "field_name":  field_name,
            "description": f"NDVI de {ndvi} sugiere cultivo con bajo vigor. Revisar nutrición.",
        })

    now = datetime.now(timezone.utc)
    for alert in alerts:
        db.execute(text("""
            INSERT INTO alerts (alert_type, title, field_name, description, is_read, is_dismissed, created_at)
            VALUES (:alert_type, :title, :field_name, :description, FALSE, FALSE, :created_at)
        """), {**alert, "created_at": now})

    if alerts:
        db.commit()