from fastapi import FastAPI
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
import json
from pathlib import Path

app = FastAPI(title="MayKaMi NeuroGame Engine")

# =================== RUTAS Y ARCHIVOS ===================
BASE_DIR = Path(__file__).resolve().parent
STATIC_DIR = BASE_DIR / "static"
DB_PATH = STATIC_DIR / "tvid_ejercicio.json"

# Montar archivos estáticos
app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")

# =================== FUNCIONES ===================
def cargar_db():
    """Carga el JSON de sesiones y lo ordena por ID"""
    try:
        if not DB_PATH.exists():
            print(f"ERROR: No se encuentra {DB_PATH}")
            return {"sesiones": []}
        with open(DB_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
        if "sesiones" in data:
            data["sesiones"].sort(key=lambda x: x.get("id", 0))
            return data
        return {"sesiones": []}
    except Exception as e:
        print(f"Error crítico en JSON: {e}")
        return {"sesiones": []}

# =================== ENDPOINTS ===================
@app.get("/", response_class=HTMLResponse)
async def home():
    """Sirve la página principal session.html"""
    index_path = STATIC_DIR / "session.html"
    try:
        with open(index_path, "r", encoding="utf-8") as f:
            return HTMLResponse(f.read())
    except Exception as e:
        return HTMLResponse(f"<h1>Error de Sistema</h1><p>No se halló session.html</p>")

@app.get("/tvid_ejercicio.json")
async def get_sessions_json():
    """Devuelve el contenido de las sesiones en JSON"""
    db = cargar_db()
    return JSONResponse(content=db)

@app.get("/health")
async def health():
    """Endpoint para verificación de salud de la app"""
    return {"status": "ok"}
