from fastapi import FastAPI
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
import json
from pathlib import Path
import stripe
import os

app = FastAPI(title="MayKaMi NeuroGame Engine")

# ================= STRIPE =================
stripe.api_key = os.getenv("STRIPE_SECRET_KEY")
YOUR_DOMAIN = "https://maykami.onrender.com"

@app.post("/create-checkout-session")
async def create_checkout_session():
    try:
        session = stripe.checkout.Session.create(
            payment_method_types=["card"],
            line_items=[{
                "price_data": {
                    "currency": "usd",
                    "product_data": {
                        "name": "MayKaMi Servicio"
                    },
                    "unit_amount": 1599,
                },
                "quantity": 1,
            }],
            mode="payment",
            success_url=YOUR_DOMAIN + "?success=true",
            cancel_url=YOUR_DOMAIN + "?canceled=true",
        )
        return {"url": session.url}
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})

# ================= TU CÓDIGO ORIGINAL =================

BASE_DIR = Path(__file__).resolve().parent
STATIC_DIR = BASE_DIR / "static"
JSON_PATH = STATIC_DIR / "tvid_ejercicio.json"

app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")

def cargar_db():
    try:
        if not JSON_PATH.exists():
            print("Error: No existe el archivo tvid_ejercicio.json")
            return {"sesiones": []}
       
        with open(JSON_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
       
        if "sesiones" in data:
            data["sesiones"].sort(key=lambda x: x.get("id", 0))
        return data
    except Exception as e:
        print(f"Error crítico en lectura de JSON: {e}")
        return {"sesiones": []}

@app.get("/", response_class=HTMLResponse)
async def home():
    html_path = STATIC_DIR / "session.html"
    if not html_path.exists():
        return HTMLResponse("<h1>Error: session.html no encontrado en static/</h1>", status_code=404)
   
    with open(html_path, "r", encoding="utf-8") as f:
        return HTMLResponse(f.read())

@app.get("/tvid_ejercicio.json")
async def get_sessions():
    db = cargar_db()
    if not db["sesiones"]:
        return JSONResponse(
            status_code=404,
            content={"error": "Base de datos de sesiones no encontrada o vacía"}
        )
    return JSONResponse(content=db)

@app.get("/health")
async def health():
    return {"status": "ok", "engine": "MayKaMi NeuroGame"}
   # =========================
# STRIPE SOLO COBRO (SEGURO)
# =========================
import os
import stripe
from fastapi import Request, Header, HTTPException

stripe.api_key = os.getenv("STRIPE_SECRET_KEY")
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET")

@app.post("/create-checkout-session")
async def create_checkout_session():
    try:
        session = stripe.checkout.Session.create(
            payment_method_types=["card"],
            line_items=[{
                "price_data": {
                    "currency": "usd",
                    "product_data": {
                        "name": "MayKaMi NeuroGame Service"
                    },
                    "unit_amount": 1599,
                },
                "quantity": 1,
            }],
            mode="payment",
            success_url="https://maykami.onrender.com?success=true",
            cancel_url="https://maykami.onrender.com?canceled=true",
        )

        return {"url": session.url}

    except Exception as e:
        return {"error": str(e)}

# =========================
# WEBHOOK STRIPE
# =========================
@app.post("/webhook")
async def stripe_webhook(request: Request, stripe_signature: str = Header(None)):

    payload = await request.body()

    try:
        event = stripe.Webhook.construct_event(
            payload,
            stripe_signature,
            STRIPE_WEBHOOK_SECRET
        )

    except Exception:
        raise HTTPException(status_code=400, detail="Webhook error")

    if event["type"] == "checkout.session.completed":
        print("PAGO CONFIRMADO ✔")

    return {"status": "ok"} 
