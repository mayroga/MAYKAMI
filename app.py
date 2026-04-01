import os
import json
import stripe
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
stripe.api_key = os.getenv("STRIPE_SECRET_KEY")
ADMIN_USER = os.getenv("ADMIN_USERNAME")
ADMIN_PASS = os.getenv("ADMIN_PASSWORD")
APP_URL = "https://maykami.onrender.com"

# --- REGLAS DE NEGOCIO ---
TIMEZONE = pytz.timezone("America/New_York")
MAX_CUPOS = 400
registro_sesion = {"id_actual": "", "contador": 0}

def obtener_info_tiempo():
    ahora = datetime.now(TIMEZONE)
    h, m = ahora.hour, ahora.minute
    # Ventana de cobro: 10 min antes (8:50-9:15 y 20:50-21:15)
    es_ventana_am = (h == 8 and m >= 50) or (h == 9 and m <= 15)
    es_ventana_pm = (h == 20 and m >= 50) or (h == 21 and m <= 15)
    
    turno = "AM" if (h == 8 or h == 9) else "PM" if (h == 20 or h == 21) else None
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
    """Redirección directa del servidor al servicio."""
    return RedirectResponse(url="/static/session.html?auth=admin")

@app.post("/checkout")
async def create_checkout_session():
    turno, id_turno = obtener_info_tiempo()
    global registro_sesion

    if not turno:
        return JSONResponse({"error": "Cobro disponible 10 min antes de las 9:00 AM/PM."}, status_code=403)

    if registro_sesion["id_actual"] != id_turno:
        registro_sesion = {"id_actual": id_turno, "contador": 0}

    if registro_sesion["contador"] >= MAX_CUPOS:
        return JSONResponse({"error": "Cupo de 400 personas agotado."}, status_code=403)

    try:
        session = stripe.checkout.Session.create(
            payment_method_types=['card'],
            line_items=[{
                'price_data': {
                    'currency': 'usd',
                    'product_data': {'name': f'MayKaMi - Turno {turno}'},
                    'unit_amount': 2500,
                },
                'quantity': 1,
            }],
            mode='payment',
            success_url=f"{APP_URL}/static/session.html?pago=exitoso",
            cancel_url=f"{APP_URL}/",
        )
        registro_sesion["contador"] += 1
        return {"url": session.url}
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=400)

@app.get("/tvid_ejercicio.json")
async def get_sessions():
    try:
        with open(JSON_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    except:
        return {"sesiones": []}
