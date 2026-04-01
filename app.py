import os
import json
import stripe
import pytz
from pathlib import Path
from datetime import datetime
from fastapi import FastAPI, Request, Depends, HTTPException, status
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.security import HTTPBasic, HTTPBasicCredentials

app = FastAPI(title="MAYKAMI NeuroGame Engine")
security = HTTPBasic()

# --- CONFIGURACIÓN DE RUTAS ---
BASE_DIR = Path(__file__).resolve().parent
STATIC_DIR = BASE_DIR / "static"
JSON_PATH = STATIC_DIR / "tvid_ejercicio.json"

app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")

# --- VARIABLES DE ENTORNO (Render) ---
stripe.api_key = os.getenv("STRIPE_SECRET_KEY")
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET")
ADMIN_USER = os.getenv("ADMIN_USERNAME")
ADMIN_PASS = os.getenv("ADMIN_PASSWORD")
APP_URL = "https://maykami.onrender.com"

# --- REGLAS DE NEGOCIO ---
TIMEZONE = pytz.timezone("America/New_York")
MAX_CUPOS = 400
# Contador volátil (se reinicia si el servidor hace redeploy o duerme)
registro_sesion = {"id_actual": "", "contador": 0}

def obtener_info_tiempo():
    ahora = datetime.now(TIMEZONE)
    h, m = ahora.hour, ahora.minute
    es_ventana_am = (h == 9 and 0 <= m <= 15)
    es_ventana_pm = (h == 21 and 0 <= m <= 15)
    
    turno = "AM" if es_ventana_am else "PM" if es_ventana_pm else None
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

# --- RUTAS PRINCIPALES ---
@app.get("/", response_class=HTMLResponse)
async def home():
    with open(STATIC_DIR / "session.html", "r", encoding="utf-8") as f:
        return HTMLResponse(f.read())

@app.get("/admin")
async def acceso_admin(es_admin: bool = Depends(autenticar_admin)):
    """Ruta para entrar sin pagar y sin restricción de horario."""
    return JSONResponse({
        "status": "Acceso Total Concedido",
        "redirect": "/static/session.html?auth=admin"
    })

@app.post("/checkout")
async def create_checkout_session():
    turno, id_turno = obtener_info_tiempo()
    global registro_sesion

    if not turno:
        return JSONResponse({"error": "La taquilla abre solo a las 9:00 AM y 9:00 PM por 15 min."}, status_code=403)

    # Resetear contador si es un nuevo turno/día
    if registro_sesion["id_actual"] != id_turno:
        registro_sesion = {"id_actual": id_turno, "contador": 0}

    if registro_sesion["contador"] >= MAX_CUPOS:
        return JSONResponse({"error": "Lo sentimos, cupo de 400 personas agotado para este turno."}, status_code=403)

    try:
        session = stripe.checkout.Session.create(
            payment_method_types=['card'],
            line_items=[{
                'price_data': {
                    'currency': 'usd',
                    'product_data': {'name': f'Sesión MAYKAMI - Turno {turno}'},
                    'unit_amount': 2500, # $25.00
                },
                'quantity': 1,
            }],
            mode='payment',
            success_url=f"{APP_URL}/static/session.html?pago=exitoso&t={id_turno}",
            cancel_url=f"{APP_URL}/",
        )
        registro_sesion["contador"] += 1
        return {"url": session.url}
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=400)

@app.get("/tvid_ejercicio.json")
async def get_sessions():
    """Sirve la sesión diaria. La de las 9 PM es repetición de la de las 9 AM."""
    ahora = datetime.now(TIMEZONE)
    # Selecciona una sesión (1-21) basada en el día del año para que cambie cada día
    session_id = (ahora.timetuple().tm_yday % 21) + 1
    
    try:
        with open(JSON_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
            # Filtramos para que AM y PM consuman la misma ID hoy
            sesion_hoy = [s for s in data["sesiones"] if s["id"] == session_id]
            return {"sesiones": sesion_hoy}
    except:
        return {"sesiones": []}
