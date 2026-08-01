import os
import json
import pytz
from pathlib import Path
from datetime import datetime
from fastapi import FastAPI, Request, Depends, HTTPException, status
from fastapi.responses import HTMLResponse, JSONResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from fastapi.security import HTTPBasic, HTTPBasicCredentials

app = FastAPI(title="MayKaMi NeuroGame Engine")
security = HTTPBasic()

# --- CONFIGURACIÓN DE RUTAS ---
BASE_DIR = Path(__file__).resolve().parent
STATIC_DIR = BASE_DIR / "static"
JSON_PATH = STATIC_DIR / "tvid_ejercicio.json"

app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")

# --- VARIABLES DE ENTORNO (Render) ---
ADMIN_USER = os.getenv("ADMIN_USERNAME")
ADMIN_PASS = os.getenv("ADMIN_PASSWORD")
APP_URL = "https://onrender.com"

# --- REGLAS DE NEGOCIO ---
TIMEZONE = pytz.timezone("America/New_York")
MAX_CUPOS = 135
registro_sesion = {"id_actual": "", "contador": 0}

def obtener_info_tiempo():
    ahora = datetime.now(TIMEZONE)
    h = ahora.hour
    turno = "AM" if (h >= 0 and h < 12) else "PM"
    id_unico_turno = f"{ahora.strftime('%Y-%m-%d')}_{turno}"
    return turno, id_unico_turno

# --- SEGURIDAD: ENTRADA GRATIS ADMIN ---
def autenticar_admin(credentials: HTTPBasicCredentials = Depends(security)):
    if credentials.username != ADMIN_USER or credentials.password != ADMIN_PASS:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Acceso Denegado",
            headers={"WWW-Authenticate": "Basic"},
        )
    return True

# --- RUTAS ---
@app.get("/", response_class=HTMLResponse)
async def home():
    with open(STATIC_DIR / "session.html", "r", encoding="utf-8") as f:
        return HTMLResponse(f.read())

@app.get("/admin")
async def login_gratis(user: str = Depends(autenticar_admin)):
    """Redirección directa del servidor para el Administrador"""
    return RedirectResponse(url="/static/session.html?auth=admin")

@app.post("/validate-access")
async def validar_acceso(request: Request):
    """Valida los cupos máximos permitidos por turno de forma segura"""
    global registro_sesion
    turno, id_turno = obtener_info_tiempo()
    
    if registro_sesion["id_actual"] != id_turno:
        registro_sesion = {"id_actual": id_turno, "contador": 0}
        
    if registro_sesion["contador"] >= MAX_CUPOS:
        return JSONResponse({"error": "Cupo agotado para este turno diario."}, status_code=403)
        
    registro_sesion["contador"] += 1
    return {"status": "authorized"}

@app.get("/tvid_ejercicio.json")
async def get_sessions():
    try:
        with open(JSON_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    except:
        return {"sesiones": []}
