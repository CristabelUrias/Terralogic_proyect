# test_gemini.py
import os
from dotenv import load_dotenv
from google import genai

load_dotenv()

api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    print("ERROR: GEMINI_API_KEY no encontrada en el .env")
    exit(1)

print(f"API Key: {api_key[:8]}...\n")

client = genai.Client(api_key=api_key)

# Paso 1: Listar modelos disponibles
print("Modelos disponibles en tu cuenta:")
print("-" * 40)
available = []
for m in client.models.list():
    if "generateContent" in (m.supported_actions or []):
        print(f"  {m.name}")
        available.append(m.name)

if not available:
    print("No se encontraron modelos disponibles.")
    exit(1)

# Paso 2: Probar el primer modelo disponible
print(f"\nProbando: {available[0]}")
try:
    response = client.models.generate_content(
        model=available[0],
        contents="Responde solo: 'Conexion exitosa con TerraLogic AI'"
    )
    print(f"Respuesta: {response.text.strip()}")
    print(f"\nUSA ESTE MODELO EN TU PROYECTO: {available[0]}")
except Exception as e:
    print(f"Error: {e}")