# app/api/v1/endpoints/fields.py
#
# SEGURIDAD:
# - Query parametrizada con DISTINCT ON seguro
# - Todos los valores numéricos casteados explícitamente
# - Sin concatenación de strings en SQL

from fastapi import APIRouter, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import Optional

from app.db.session import get_db
from app.core.security import decode_token

router = APIRouter()
bearer = HTTPBearer(auto_error=False)


def get_user_id(credentials: HTTPAuthorizationCredentials) -> Optional[str]:
    if not credentials:
        return None
    payload = decode_token(credentials.credentials)
    return payload.get("sub") if payload else None


@router.get("/")
def list_fields(
    credentials: HTTPAuthorizationCredentials = Depends(bearer),
    db: Session = Depends(get_db),
):
    user_id = get_user_id(credentials)

    # Si hay usuario autenticado → solo sus campos
    # Si no → todos los campos (compatibilidad)
    if user_id:
        rows = db.execute(text("""
            SELECT DISTINCT ON (field_name)
                field_name,
                result,
                ndvi,
                cobertura,
                water_stress_pct,
                diseases_count,
                plagas_count,
                ai_insight,
                analyzed_at
            FROM analysis_records
            WHERE field_name IS NOT NULL
              AND user_id = :user_id
            ORDER BY field_name, analyzed_at DESC
        """), {"user_id": user_id}).fetchall()
    else:
        rows = db.execute(text("""
            SELECT DISTINCT ON (field_name)
                field_name,
                result,
                ndvi,
                cobertura,
                water_stress_pct,
                diseases_count,
                plagas_count,
                ai_insight,
                analyzed_at
            FROM analysis_records
            WHERE field_name IS NOT NULL
            ORDER BY field_name, analyzed_at DESC
        """)).fetchall()

    fields = []
    for r in rows:
        # Cast explícito a tipos Python nativos — previene errores Decimal
        ndvi      = float(r[2]) if r[2] is not None else 0.0
        cobertura = int(r[3])   if r[3] is not None else 0
        resultado = r[1]        or 'Saludable'
        stress    = int(r[4])   if r[4] is not None else 0
        diseases  = int(r[5])   if r[5] is not None else 0
        plagas    = int(r[6])   if r[6] is not None else 0

        # Cálculo de salud con valores ya validados
        health = min(100, max(0, int(
            (ndvi * 60) +
            ((100 - stress) * 0.25) +
            (15 if diseases == 0 else max(0, 15 - diseases * 5))
        )))

        if resultado == 'Estrés' or health < 45:
            status = 'Crítico'
        elif resultado == 'Alerta' or health < 70:
            status = 'Atención'
        else:
            status = 'Saludable'

        analyzed_at = r[8]
        last_date   = analyzed_at.strftime("%d %b, %Y") if analyzed_at else "Sin análisis"

        fields.append({
            "id":            r[0],
            "name":          r[0],
            "crop":          "Cultivo analizado",
            "status":        status,
            "health":        health,
            "ndvi":          ndvi,
            "cobertura":     cobertura,
            "water_stress":  stress,
            "diseases":      diseases,
            "plagas":        plagas,
            "insight":       r[7] or "",
            "last_analysis": last_date,
        })

    total     = len(fields)
    healthy   = sum(1 for f in fields if f["status"] == "Saludable")
    attention = sum(1 for f in fields if f["status"] == "Atención")
    critical  = sum(1 for f in fields if f["status"] == "Crítico")

    return {
        "items": fields,
        "stats": {
            "total":     total,
            "healthy":   healthy,
            "attention": attention,
            "critical":  critical,
        }
    }