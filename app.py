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

app = FastAPI(title="MayKaMi NeuroGame Engine")
security = HTTPBasic()

# Configuración de directorios
BASE_DIR = Path(__file__).resolve().parent
STATIC_DIR = BASE_DIR / "static"
JSON_PATH = STATIC_DIR / "tvid_ejercicio.json"

app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")

# Configuración de Entorno (Render)
stripe.api_key = os.getenv("STRIPE_SECRET_KEY")
ADMIN_USER = os.getenv("ADMIN_USERNAME")
ADMIN_PASS = os.getenv("ADMIN_PASSWORD")
APP_URL = "https://maykami.onrender.com"
TIMEZONE = pytz.timezone("America/New_York")

# Estado Global de Cupos (400 personas por turno)
# En Render esto se reinicia si la app entra en sleep, lo cual es ideal para limpiar turnos
estado_cupos = {"dia_turno": "", "contador": 0}

def verificar_ventana_acceso():
    """Valida si estamos en el rango de 9:00-9:15 AM/PM."""
    ahora = datetime.now(TIMEZONE)
    h, m = ahora.hour, ahora.minute
    
    # Ventanas: 9:00 a 9:15 (AM es 9, PM es 21)
    es_am = (h == 9 and 0 <= m <= 15)
    es_pm = (h == 21 and 0 <= m <= 15)
    
    turno = "AM" if es_am else "PM" if es_pm else None
    id_turno = f"{ahora.date()}_{turno}"
    
    return turno is not None, turno, id_turno

# --- SEGURIDAD ADMIN ---
def autenticar_admin(credentials: HTTPBasicCredentials = Depends(security)):
    if credentials.username != ADMIN_USER or credentials.password != ADMIN_PASS:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Acceso Denegado",
            headers={"WWW-Authenticate": "Basic"},
        )
    return credentials.username

# --- RUTAS ---
@app.get("/", response_class=HTMLResponse)
async def home():
    html_path = STATIC_DIR / "session.html"
    with open(html_path, "r", encoding="utf-8") as f:
        return HTMLResponse(f.read())

@app.get("/admin")
async def login_admin(user: str = Depends(autenticar_admin)):
    """El administrador entra sin restricciones de hora ni pago."""
    return JSONResponse({
        "status": "Acceso concedido", 
        "redirect": "/static/session.html?admin=true"
    })

@app.post("/checkout")
async def create_checkout_session():
    abierto, turno, id_turno = verificar_ventana_acceso()
    global estado_cupos

    if not abierto:
        return JSONResponse({"error": "Servicio disponible solo a las 9:00 AM y 9:00 PM (15 min)."}, status_code=403)

    # Reiniciar contador si es un turno nuevo
    if estado_cupos["dia_turno"] != id_turno:
        estado_cupos = {"dia_turno": id_turno, "contador": 0}

    if estado_cupos["contador"] >= 400:
        return JSONResponse({"error": "Cupo agotado (máximo 400 personas)."}, status_code=403)

    try:
        session = stripe.checkout.Session.create(
            payment_method_types=['card'],
            line_items=[{
                'price_data': {
                    'currency': 'usd',
                    'product_data': {'name': f'Sesión MayKaMi {turno}'},
                    'unit_amount': 2500, # $25.00
                },
                'quantity': 1,
            }],
            mode='payment',
            success_url=f"{APP_URL}/static/session.html?pago=exitoso&t={id_turno}",
            cancel_url=f"{APP_URL}/",
        )
        estado_cupos["contador"] += 1
        return {"url": session.url}
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=400)

@app.get("/tvid_ejercicio.json")
async def get_sessions():
    """Entrega la sesión del día (id 1-21) para AM y PM."""
    ahora = datetime.now(TIMEZONE)
    # Calculamos el ID de sesión basado en el día del año para que cambie a las 9 AM de mañana
    session_id = (ahora.timetuple().tm_yday % 21) + 1
    
    try:
        with open(JSON_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
            # Filtramos para que AM y PM vean lo mismo hoy
            sesion_hoy = [s for s in data["sesiones"] if s["id"] == session_id]
            return {"sesiones": sesion_hoy}
    except:
        return {"sesiones": []}
