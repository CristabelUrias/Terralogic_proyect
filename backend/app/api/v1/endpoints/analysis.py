# analysis.py
from fastapi import APIRouter, UploadFile, File, HTTPException, Form, Depends
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from sqlalchemy import text
from PIL import Image
import io

from app.core.gemini_service import analyze_crop_image
from app.db.session import get_db

router = APIRouter()

ALLOWED_MIME_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_SIZE_BYTES     = 10 * 1024 * 1024
MIN_DIMENSION      = 100
MAX_DIMENSION      = 10000


def get_field_context(field_name: str, db: Session) -> str:
    """
    RAG — Recupera el historial de los últimos 5 análisis del campo
    y construye un resumen de contexto para enriquecer el prompt de Gemini.
    """
    try:
        rows = db.execute(text("""
            SELECT
                result,
                ndvi,
                water_stress_pct,
                nivel_estres,
                diseases_count,
                enf_detalle,
                plagas_count,
                plagas_detalle,
                cobertura,
                analyzed_at
            FROM analysis_records
            WHERE LOWER(field_name) = LOWER(:field_name)
            ORDER BY analyzed_at DESC
            LIMIT 5
        """), {"field_name": field_name}).fetchall()

        if not rows:
            return ""

        lines = [
            f"HISTORIAL PREVIO DEL CAMPO '{field_name}' (del más reciente al más antiguo):"
        ]

        for i, r in enumerate(rows):
            fecha = str(r.analyzed_at)[:10]
            line  = (
                f"  Análisis {i+1} ({fecha}): "
                f"Estado={r.result}, "
                f"NDVI={round(float(r.ndvi or 0), 2)}, "
                f"Estrés hídrico={round(float(r.water_stress_pct or 0))}% ({r.nivel_estres}), "
                f"Enfermedades={r.diseases_count}"
            )
            if r.enf_detalle and r.enf_detalle not in ("Ninguna", "Ninguna detectada", ""):
                line += f" ({r.enf_detalle})"
            line += f", Plagas={r.plagas_count}"
            if r.plagas_detalle and r.plagas_detalle not in ("Ninguna", "Ninguna detectada", ""):
                line += f" ({r.plagas_detalle})"
            line += f", Cobertura={r.cobertura}%"
            lines.append(line)

        # Calcular tendencia de NDVI
        if len(rows) >= 2:
            ndvi_values = [float(r.ndvi or 0) for r in rows]
            ndvi_diff   = ndvi_values[0] - ndvi_values[-1]
            if ndvi_diff < -0.1:
                lines.append(f"  TENDENCIA NDVI: en descenso ({ndvi_values[-1]:.2f} → {ndvi_values[0]:.2f}) — deterioro progresivo.")
            elif ndvi_diff > 0.1:
                lines.append(f"  TENDENCIA NDVI: en ascenso ({ndvi_values[-1]:.2f} → {ndvi_values[0]:.2f}) — recuperación positiva.")
            else:
                lines.append(f"  TENDENCIA NDVI: estable ({ndvi_values[0]:.2f}).")

        # Detectar enfermedades recurrentes
        enf_recientes = [r.enf_detalle for r in rows if r.diseases_count > 0 and r.enf_detalle]
        if len(enf_recientes) >= 2:
            lines.append(f"  ALERTA: Enfermedades detectadas en {len(enf_recientes)} de los últimos {len(rows)} análisis — posible reincidencia.")

        # Detectar estrés hídrico creciente
        stress_values = [float(r.water_stress_pct or 0) for r in rows]
        if len(stress_values) >= 3 and all(stress_values[i] >= stress_values[i+1] for i in range(len(stress_values)-1)):
            lines.append(f"  ALERTA: Estrés hídrico en aumento continuo durante {len(stress_values)} análisis consecutivos.")

        lines.append(
            "Usa este historial para identificar tendencias, reincidencias y dar recomendaciones específicas. "
            "Si el problema es recurrente, indica que el tratamiento previo no fue suficiente."
        )

        return "\n".join(lines)

    except Exception as e:
        print(f"[RAG] Error recuperando historial: {e}")
        return ""


@router.post("/analyze")
async def analyze_image(
    image:      UploadFile = File(...),
    field_name: str        = Form(default="Campo sin nombre"),
    db:         Session    = Depends(get_db),
):
    # 1. Validar Content-Type
    if image.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(status_code=400, detail="Formato no válido. Usa JPG, PNG o WEBP.")

    # 2. Leer bytes y validar tamaño
    image_bytes = await image.read()
    if len(image_bytes) > MAX_SIZE_BYTES:
        raise HTTPException(status_code=400, detail="La imagen supera el límite de 10MB.")
    if len(image_bytes) < 100:
        raise HTTPException(status_code=400, detail="El archivo es demasiado pequeño para ser una imagen válida.")

    # 3. Validar imagen con Pillow
    try:
        img = Image.open(io.BytesIO(image_bytes))
        img.verify()
        img         = Image.open(io.BytesIO(image_bytes))
        width, height = img.size
        real_format   = img.format
    except Exception:
        raise HTTPException(status_code=400, detail="El archivo no es una imagen válida.")

    # 4. Validar dimensiones
    if width < MIN_DIMENSION or height < MIN_DIMENSION:
        raise HTTPException(status_code=400, detail=f"La imagen debe tener al menos {MIN_DIMENSION}x{MIN_DIMENSION} píxeles.")
    if width > MAX_DIMENSION or height > MAX_DIMENSION:
        raise HTTPException(status_code=400, detail="La imagen supera el tamaño máximo permitido.")

    # 5. Sanitizar nombre del campo
    field_name = field_name.strip()[:200]
    if not field_name:
        field_name = "Campo sin nombre"

    # 6. RAG — Recuperar historial del campo para enriquecer el análisis
    field_context = get_field_context(field_name, db)

    # 7. Analizar con Gemini + contexto histórico
    result = analyze_crop_image(
        image_bytes=image_bytes,
        mime_type=image.content_type,
        field_context=field_context,
    )

    if not result["success"]:
        raise HTTPException(status_code=500, detail=result["error"])

    data = result["data"]

    return JSONResponse({
        "field_name":        field_name,
        "resultado":         data.get("resultado", "Alerta"),
        "enfermedades":      data.get("enfermedades",   {"count": 0, "detalle": "No analizado"}),
        "estres_hidrico":    data.get("estres_hidrico",  {"porcentaje": 0, "nivel": "Bajo"}),
        "plagas":            data.get("plagas",          {"count": 0, "detalle": "No analizado"}),
        "ndvi":              data.get("ndvi", 0.0),
        "cobertura_vegetal": data.get("cobertura_vegetal", 0),
        "insight":           data.get("insight", ""),
        "confianza":         data.get("confianza", 0.0),
        "image_dimensions":  f"{width}x{height}px",
        "image_format":      real_format,
        "rag_context_used":  bool(field_context),
    })