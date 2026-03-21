from fastapi import FastAPI
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
import json
from pathlib import Path

# ======================================
# APP MAYKAMI
# ======================================
app = FastAPI(title="MayKaMi NeuroGame Engine")

# ======================================
# RUTAS BASE
# ======================================
BASE_DIR = Path(__file__).resolve().parent
STATIC_DIR = BASE_DIR / "static"
DB_PATH = STATIC_DIR / "tvid_ejercicio.json"  # JSON de sesiones MayKaMi

# Montar archivos estáticos
app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")

# ======================================
# CARGA DE BASE DE DATOS
# ======================================
def cargar_db():
    try:
        if not DB_PATH.exists():
            print(f"ERROR: No se encuentra {DB_PATH}")
            return {"sesiones": []}

        with open(DB_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)

        # Validación básica y ordenación por ID
        if "sesiones" in data:
            data["sesiones"].sort(key=lambda x: x.get('id', 0))
            return data

        return {"sesiones": []}

    except Exception as e:
        print(f"Error crítico al cargar JSON: {e}")
        return {"sesiones": []}

# ======================================
# RUTAS PRINCIPALES
# ======================================
@app.get("/", response_class=HTMLResponse)
async def home():
    index_path = STATIC_DIR / "session.html"
    try:
        with open(index_path, "r", encoding="utf-8") as f:
            return HTMLResponse(f.read())
    except Exception as e:
        return HTMLResponse(
            "<h1>Error de Sistema</h1><p>No se halló session.html</p>"
        )

@app.get("/session_content")
async def session_content():
    """
    Devuelve todas las sesiones disponibles en tvid_ejercicio.json
    para que scripts.js las cargue dinámicamente.
    """
    db = cargar_db()
    return JSONResponse(content=db)

@app.get("/health")
async def health():
    return {"status": "ok"}
