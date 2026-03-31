import os
import json
import stripe
from fastapi import FastAPI, Request, Header, HTTPException
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pathlib import Path

# =========================
# APP INIT
# =========================
app = FastAPI(title="MayKaMi NeuroGame Engine")

# =========================
# STRIPE KEYS (RENDER ENV VARIABLES)
# =========================
stripe.api_key = os.getenv("STRIPE_SECRET_KEY")
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET")
STRIPE_PUBLIC_KEY = os.getenv("STRIPE_PUBLISHABLE_KEY")

# =========================
# PATHS
# =========================
BASE_DIR = Path(__file__).resolve().parent
STATIC_DIR = BASE_DIR / "static"
JSON_PATH = STATIC_DIR / "tvid_ejercicio.json"

app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")

# =========================
# DATABASE LOAD
# =========================
def cargar_db():
    try:
        if not JSON_PATH.exists():
            return {"sesiones": []}

        with open(JSON_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)

        if "sesiones" in data:
            data["sesiones"].sort(key=lambda x: x.get("id", 0))

        return data

    except Exception as e:
        print("DB ERROR:", e)
        return {"sesiones": []}

# =========================
# HOME
# =========================
@app.get("/", response_class=HTMLResponse)
async def home():
    html_path = STATIC_DIR / "session.html"

    if not html_path.exists():
        return HTMLResponse("<h1>session.html no encontrado</h1>", status_code=404)

    with open(html_path, "r", encoding="utf-8") as f:
        return HTMLResponse(f.read())

# =========================
# GET DB
# =========================
@app.get("/tvid_ejercicio.json")
async def get_sessions():
    db = cargar_db()

    if not db["sesiones"]:
        return JSONResponse(
            status_code=404,
            content={"error": "Base de datos vacía"}
        )

    return JSONResponse(content=db)

# =========================
# STRIPE CHECKOUT SESSION
# =========================
@app.post("/create-checkout-session")
async def create_checkout_session():
    try:
        session = stripe.checkout.Session.create(
            payment_method_types=["card"],
            line_items=[
                {
                    "price_data": {
                        "currency": "usd",
                        "product_data": {
                            "name": "MayKaMi NeuroGame Service"
                        },
                        "unit_amount": 1599,  # $15.99
                    },
                    "quantity": 1,
                }
            ],
            mode="payment",
            success_url="https://maykami.onrender.com?success=true",
            cancel_url="https://maykami.onrender.com?canceled=true",
        )

        return {"url": session.url}

    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})

# =========================
# STRIPE WEBHOOK (SEGURIDAD REAL)
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

    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid payload")

    except stripe.error.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid signature")

    # =========================
    # PAGO CONFIRMADO
    # =========================
    if event["type"] == "checkout.session.completed":
        session = event["data"]["object"]

        email = session.get("customer_email", "unknown")

        print("✔ PAGO CONFIRMADO:", email)

        # Aquí puedes activar acceso real:
        # guardar en DB, archivo o memoria
        # ejemplo simple:
        paid_file = BASE_DIR / "paid_users.json"

        if paid_file.exists():
            with open(paid_file, "r") as f:
                data = json.load(f)
        else:
            data = []

        data.append(email)

        with open(paid_file, "w") as f:
            json.dump(data, f)

    return {"status": "ok"}

# =========================
# HEALTH CHECK
# =========================
@app.get("/health")
async def health():
    return {"status": "ok", "engine": "MayKaMi NeuroGame"}
