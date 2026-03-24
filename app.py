from fastapi import FastAPI
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
import json
from pathlib import Path

app = FastAPI(title="MayKaMi NeuroGame Engine")

# Configuración de rutas
BASE_DIR = Path(__file__).resolve().parent
STATIC_DIR = BASE_DIR / "static"
JSON_PATH = STATIC_DIR / "tvid_ejercicio.json"

# Montaje de archivos estáticos
app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")

def cargar_db():
    """Carga y ordena las sesiones de entrenamiento."""
    try:
        if not JSON_PATH.exists():
            print("Error: No existe el archivo tvid_ejercicio.json")
            return {"sesiones": []}
        
        with open(JSON_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
        
        # Ordenar por ID para mantener la jerarquía del entrenamiento
        if "sesiones" in data:
            data["sesiones"].sort(key=lambda x: x.get("id", 0))
        return data
    except Exception as e:
        print(f"Error crítico en lectura de JSON: {e}")
        return {"sesiones": []}

@app.get("/", response_class=HTMLResponse)
async def home():
    """Punto de entrada de la aplicación MayKaMi."""
    html_path = STATIC_DIR / "session.html"
    if not html_path.exists():
        return HTMLResponse("<h1>Error: session.html no encontrado en static/</h1>", status_code=404)
    
    with open(html_path, "r", encoding="utf-8") as f:
        return HTMLResponse(f.read())

@app.get("/tvid_ejercicio.json")
async def get_sessions():
    """Endpoint para obtener la base de datos de ejercicios con validación."""
    db = cargar_db()
    if not db["sesiones"]:
        return JSONResponse(
            status_code=404, 
            content={"error": "Base de datos de sesiones no encontrada o vacía"}
        )
    return JSONResponse(content=db)

@app.get("/health")
async def health():
    """Verificación de estado del servidor."""
    return {"status": "ok", "engine": "MayKaMi NeuroGame"}
