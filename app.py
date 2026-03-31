import os
import json
import stripe
from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pathlib import Path

# =========================
# APP
# =========================
app = FastAPI(title="MayKaMi PRO Engine")

# =========================
# STRIPE KEYS
# =========================
stripe.api_key = os.getenv("STRIPE_SECRET_KEY")
WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET")

# =========================
# PATHS
# =========================
BASE_DIR = Path(__file__).resolve().parent
STATIC_DIR = BASE_DIR / "static"
JSON_PATH = STATIC_DIR / "tvid_ejercicio.json"
PAID_FILE = BASE_DIR / "paid_users.json"

app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")

# =========================
# DB
# =========================
def cargar_db():
    if not JSON_PATH.exists():
        return {"sesiones": []}

    with open(JSON_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)

    data["sesiones"].sort(key=lambda x: x.get("id", 0))
    return data

# =========================
# HOME
# =========================
@app.get("/", response_class=HTMLResponse)
async def home():
    html_path = STATIC_DIR / "session.html"
    return HTMLResponse(open(html_path, "r", encoding="utf-8").read())

# =========================
# DATA
# =========================
@app.get("/tvid_ejercicio.json")
async def get_sessions():
    return cargar_db()

# =========================
# CREATE STRIPE SESSION
# =========================
@app.post("/create-checkout-session")
async def checkout():
    session = stripe.checkout.Session.create(
        payment_method_types=["card"],
        mode="payment",
        line_items=[{
            "price_data": {
                "currency": "usd",
                "product_data": {"name": "MayKaMi PRO Access"},
                "unit_amount": 1599,
            },
            "quantity": 1
        }],
        success_url="https://maykami.onrender.com?success=true",
        cancel_url="https://maykami.onrender.com?canceled=true",
    )

    return {"url": session.url}

# =========================
# VERIFY ACCESS (PRO SECURITY)
# =========================
@app.get("/verify-access")
async def verify_access(email: str):
    if not PAID_FILE.exists():
        return {"paid": False}

    with open(PAID_FILE, "r") as f:
        data = json.load(f)

    return {"paid": email in data}

# =========================
# WEBHOOK STRIPE (PRO FIXED)
# =========================
@app.post("/webhook")
async def webhook(request: Request):
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")

    if not sig_header:
        raise HTTPException(status_code=400, detail="Missing Stripe signature")

    try:
        event = stripe.Webhook.construct_event(
            payload,
            sig_header,
            WEBHOOK_SECRET
        )
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid webhook")

    # =========================
    # PAYMENT SUCCESS
    # =========================
    if event["type"] == "checkout.session.completed":
        session = event["data"]["object"]

        email = session.get("customer_details", {}).get("email")

        if email:
            if PAID_FILE.exists():
                with open(PAID_FILE, "r") as f:
                    users = json.load(f)
            else:
                users = []

            if email not in users:
                users.append(email)

            with open(PAID_FILE, "w") as f:
                json.dump(users, f)

            print("✔ Pago registrado:", email)

    return {"status": "ok"}

# =========================
# HEALTH
# =========================
@app.get("/health")
async def health():
    return {"status": "ok", "engine": "MayKaMi PRO"}
