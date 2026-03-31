import os
import json
import stripe
from pathlib import Path
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

# Stripe & Admin Setup (Desde variables de entorno en Render)
stripe.api_key = os.getenv("STRIPE_SECRET_KEY")
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET")
ADMIN_USER = os.getenv("ADMIN_USERNAME")
ADMIN_PASS = os.getenv("ADMIN_PASSWORD")
APP_URL = "https://maykami.onrender.com"

# --- SEGURIDAD ADMIN ---
def autenticar_admin(credentials: HTTPBasicCredentials = Depends(security)):
    if credentials.username != ADMIN_USER or credentials.password != ADMIN_PASS:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Acceso Denegado",
            headers={"WWW-Authenticate": "Basic"},
        )
    return credentials.username

# --- RUTAS DE ACCESO ---
@app.get("/", response_class=HTMLResponse)
async def home():
    html_path = STATIC_DIR / "session.html"
    with open(html_path, "r", encoding="utf-8") as f:
        return HTMLResponse(f.read())

@app.get("/admin")
async def login_gratis(user: str = Depends(autenticar_admin)):
    """Acceso directo para el administrador usando las keys de Render."""
    return JSONResponse({"status": "Acceso concedido", "usuario": user, "redirect": "/static/session.html"})

# --- PASARELA DE PAGO ---
@app.post("/checkout")
async def create_checkout_session():
    try:
        session = stripe.checkout.Session.create(
            payment_method_types=['card'],
            line_items=[{
                'price_data': {
                    'currency': 'usd',
                    'product_data': {'name': 'MayKaMi Full Training'},
                    'unit_amount': 2500, # $25.00
                },
                'quantity': 1,
            }],
            mode='payment',
            success_url=f"{APP_URL}/static/session.html?pago=exitoso",
            cancel_url=f"{APP_URL}/",
        )
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
