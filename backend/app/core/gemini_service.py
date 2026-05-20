# app/core/gemini_service.py
#
# Analiza imágenes de cultivos usando Gemini 2.5 Flash.
# Devuelve un JSON estructurado con los resultados.

import os
import base64
import json
from google import genai
from google.genai import types
from dotenv import load_dotenv

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL   = "gemini-2.5-flash"

client = genai.Client(api_key=GEMINI_API_KEY)

PROMPT = """
Eres un ingeniero agrónomo certificado con más de 15 años de experiencia en diagnóstico fitosanitario,
manejo integrado de plagas y enfermedades en cultivos tropicales, subtropicales y árboles frutales.

TIPOS DE IMAGEN VÁLIDOS — analiza cualquiera de estos:
- Imágenes aéreas o de drones de cultivos completos
- Fotografías cercanas de hojas, tallos, frutos o raíces
- Imágenes de corteza, troncos o ramas de árboles
- Cualquier parte de una planta o árbol con síntomas visibles

Analiza la imagen con criterio técnico evaluando TODOS los elementos visibles:
coloración, textura, patrones de distribución de anomalías, presencia de organismos
(hongos, líquenes, musgos, insectos), daños físicos, lesiones, manchas, pudriciones,
exudados, galerías, perforaciones, deformaciones o cualquier signo de deterioro.

CRITERIOS DE DIAGNÓSTICO:

Estado general (resultado):
- "Saludable": sin signos de daño activo, organismo en buen estado fitosanitario.
- "Alerta": anomalías presentes que requieren monitoreo o intervención preventiva.
- "Estrés": daño visible significativo con riesgo real para la planta o cultivo.

Enfermedades — identifica específicamente:
- Fúngicas: manchas foliares, mildiu, roya, antracnosis, tizón, pudriciones, líquenes patógenos,
  costras fúngicas en corteza, cancros, chancros, podredumbre de cuello.
- Bacterianas: lesiones acuosas, exudados, marchitez, agallas, chancros bacterianos.
- Virales: mosaico, deformación, amarillamiento irregular, enanismo.
- Nutricionales: clorosis, necrosis de bordes, decoloración generalizada.
- En corteza/tronco: cancros, pudrición de madera, hongos xilófagos, musgos y líquenes
  que indiquen humedad excesiva o deterioro de la corteza.

Plagas — identifica específicamente:
- Insectos barrenadores: galerías en corteza, aserrín o exudados en tronco, orificios de entrada/salida.
- Insectos masticadores: esqueletizado foliar, perforaciones, daño en bordes, mordeduras en corteza.
- Insectos chupadores: decoloración plateada/bronceada, fumagina, cochinillas, escamas en ramas.
- Ácaros: bronceado fino, punteado plateado, telarañas.
- Minadores: galerías sinuosas en lámina foliar.
- Perforadores de madera: orificios circulares en tronco, aserrín acumulado, savia fermentada.
- Presencia visible de insectos, larvas, huevos o daños característicos.

Estrés hídrico — evalúa según lo visible:
- En hojas: enrollamiento, marchitez, coloración grisácea o amarillenta.
- En corteza: agrietamiento excesivo, deshidratación visible, exfoliación anormal.
- En suelo (si visible): sequedad extrema o encharcamiento.

INSTRUCCIÓN CRÍTICA — insight y recomendaciones:
El campo "insight" debe incluir en 3-5 oraciones:
1. Diagnóstico confirmatorio con nombre técnico del problema detectado.
2. Causa probable basada en los síntomas observados.
3. Acción inmediata recomendada (producto, dosis o práctica específica).
4. Acción preventiva a mediano plazo.
Si la planta está sana, indica el estado positivo y recomienda prácticas de mantenimiento.

Responde ÚNICAMENTE con un JSON válido con esta estructura exacta, sin texto adicional, sin bloques de código:

{
  "resultado": "Saludable" | "Alerta" | "Estrés",
  "enfermedades": {
    "count": número entero (0-10),
    "detalle": "nombre técnico, síntomas observados y área afectada, o 'Ninguna detectada'"
  },
  "estres_hidrico": {
    "porcentaje": número entero (0-100),
    "nivel": "Bajo" | "Moderado" | "Alto" | "Crítico"
  },
  "plagas": {
    "count": número entero (0-10),
    "detalle": "nombre técnico de la plaga, tipo de daño y severidad estimada, o 'Ninguna detectada'"
  },
  "ndvi": número decimal entre 0.0 y 1.0,
  "cobertura_vegetal": número entero (0-100),
  "insight": "Diagnóstico técnico con causa probable, acción inmediata y medida preventiva.",
  "confianza": número decimal entre 0.0 y 1.0
}

REGLAS ANTI-ALUCINACIÓN — de cumplimiento estricto:
- NUNCA devuelvas ndvi 0.0 ni cobertura 0 si hay vegetación visible en la imagen.
- Si la imagen muestra un árbol, tronco, rama o cualquier parte de planta: es una imagen válida,
  analízala completamente. NO la rechaces como "no válida".
- Líquenes en corteza (estructuras planas gris-verdosas): son organismos indicadores de humedad,
  NO son cultivos pero SÍ son síntomas fitosanitarios relevantes — repórtalos en enfermedades.
- Musgo en corteza: indicador de humedad excesiva, microclima húmedo o corteza deteriorada.
- Si ves orificios, galerías, aserrín o exudados en tronco: son síntomas de insectos barrenadores.
- NUNCA inventes plagas o enfermedades que no puedas observar en la imagen.
- Si los síntomas son ambiguos: usa confianza menor a 0.5 y recomienda inspección en campo.
- La confianza debe ser honesta según la calidad y claridad de la imagen.
- Solo devuelve resultado "Alerta" con confianza 0.1 si la imagen no tiene ningún elemento vegetal visible.
"""


def analyze_crop_image(image_bytes: bytes, mime_type: str = "image/jpeg", field_context: str = "") -> dict:
    """
    Analiza una imagen de cultivo con Gemini.

    Args:
        image_bytes: Bytes de la imagen
        mime_type: Tipo MIME (image/jpeg, image/png, image/webp)

    Returns:
        dict con los resultados del análisis
    """
    try:
        # Construir prompt enriquecido con contexto RAG si existe
        rag_section = ""
        if field_context:
            rag_section = f"""
CONTEXTO HISTÓRICO DEL CAMPO (RAG):
{field_context}

Usa este historial para:
- Identificar si los problemas son nuevos o recurrentes
- Detectar tendencias de deterioro o mejora
- Ajustar la severidad del diagnóstico según la evolución
- Dar recomendaciones específicas basadas en lo que ya se intentó

"""
        full_prompt = rag_section + PROMPT

        response = client.models.generate_content(
            model=GEMINI_MODEL,
            contents=[
                types.Part.from_bytes(data=image_bytes, mime_type=mime_type),
                full_prompt,
            ],
            config=types.GenerateContentConfig(
                temperature=0.1,
                top_p=0.8,
                top_k=20,
                max_output_tokens=8192,
            ),
        )

        raw = response.text.strip()

        # Limpiar bloques de código markdown
        if "```" in raw:
            parts = raw.split("```")
            for part in parts:
                if "{" in part:
                    raw = part
                    break
            if raw.startswith("json"):
                raw = raw[4:]

        # Extraer solo el bloque JSON entre { }
        start = raw.find("{")
        end   = raw.rfind("}") + 1
        if start != -1 and end > start:
            raw = raw[start:end]

        raw = raw.strip()

        result = json.loads(raw)
        return {"success": True, "data": result}

    except json.JSONDecodeError as e:
        print(f"[GEMINI RAW RESPONSE]: {response.text if 'response' in locals() else 'sin respuesta'}")
        return {
            "success": False,
            "error": f"Gemini devolvió una respuesta no válida: {e}",
            "raw": response.text if 'response' in locals() else ""
        }
    except Exception as e:
        error_msg = str(e)
        if "429" in error_msg:
            return {"success": False, "error": "Límite de cuota de Gemini alcanzado. Intenta en unos minutos."}
        return {"success": False, "error": f"Error al analizar la imagen: {error_msg}"}