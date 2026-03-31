import os
import json
import stripe
from pathlib import Path
from fastapi import FastAPI, Request, Header, Depends, HTTPException, status
from fastapi.responses import HTMLResponse, JSONResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from fastapi.security import HTTPBasic, HTTPBasicCredentials

# Configuración de Motor y Rutas
app = FastAPI(title="MayKaMi NeuroGame Engine")
security = HTTPBasic()

BASE_DIR = Path(__file__).resolve().parent
STATIC_DIR = BASE_DIR / "static"
JSON_PATH = STATIC_DIR / "tvid_ejercicio.json"

app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")

# Configuración Stripe (Valores desde Render)
stripe.api_key = os.getenv("STRIPE_SECRET_KEY")
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET")

# Credenciales Admin (Valores desde Render)
ADMIN_USER = os.getenv("ADMIN_USERNAME")
ADMIN_PASS = os.getenv("ADMIN_PASSWORD")

# --- LÓGICA DE AUTENTICACIÓN ---
def get_current_user(credentials: HTTPBasicCredentials = Depends(security)):
    if credentials.username != ADMIN_USER or credentials.password != ADMIN_PASS:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Acceso Denegado",
            headers={"WWW-Authenticate": "Basic"},
        )
    return credentials.username

# --- ENDPOINTS DE CARGA ---
def cargar_db():
    try:
        with open(JSON_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
            if "sesiones" in data:
                data["sesiones"].sort(key=lambda x: x.get("id", 0))
            return data
    except Exception:
        return {"sesiones": []}

# --- RUTAS PRINCIPALES ---
@app.get("/", response_class=HTMLResponse)
async def home():
    html_path = STATIC_DIR / "session.html"
    with open(html_path, "r", encoding="utf-8") as f:
        return HTMLResponse(f.read())

@app.get("/admin", response_class=HTMLResponse)
async def admin_panel(user: str = Depends(get_current_user)):
    """Acceso gratuito para administradores."""
    return f"<h1>Bienvenido {user} al panel de MayKaMi</h1><p>Acceso concedido.</p>"

# --- INTEGRACIÓN STRIPE ---
@app.post("/create-checkout-session")
async def create_checkout():
    """Crea la sesión de pago para el usuario."""
    try:
        checkout_session = stripe.checkout.Session.create(
            payment_method_types=['card'],
            line_items=[{
                'price_data': {
                    'currency': 'usd',
                    'product_data': {'name': 'MayKaMi Full Access'},
                    'unit_amount': 2500,  # $25.00
                },
                'quantity': 1,
            }],
            mode='payment',
            success_url='https://tu-app-en-render.com/static/session.html?session_id={CHECKOUT_SESSION_ID}',
            cancel_url='https://tu-app-en-render.com/',
        )
        return JSONResponse({"url": checkout_session.url})
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=400)

@app.post("/webhook")
async def stripe_webhook(request: Request):
    """Maneja la confirmación del pago desde Stripe."""
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")

    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, STRIPE_WEBHOOK_SECRET
        )
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=400)

    if event['type'] == 'checkout.session.completed':
        session = event['data']['object']
        # Aquí puedes activar el acceso en tu base de datos para el cliente
        print(f"Pago exitoso para: {session.customer_details.email}")

    return JSONResponse({"status": "success"})

# --- DATA ---
@app.get("/tvid_ejercicio.json")
async def get_sessions():
    db = cargar_db()
    return JSONResponse(content=db)

@app.get("/health")
async def health():
    return {"status": "ok", "engine": "MayKaMi NeuroGame"}
