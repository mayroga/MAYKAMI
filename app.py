import os
import json
import stripe
from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pathlib import Path

app = FastAPI(title="MayKaMi NeuroGame Engine")

stripe.api_key = os.getenv("STRIPE_SECRET_KEY")
WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET")

BASE_DIR = Path(__file__).resolve().parent
STATIC_DIR = BASE_DIR / "static"
JSON_PATH = STATIC_DIR / "tvid_ejercicio.json"
PAID_FILE = BASE_DIR / "paid_users.json"

app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")


def cargar_db():
    try:
        if not JSON_PATH.exists():
            return {"sesiones": []}

        with open(JSON_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)

        if "sesiones" in data:
            data["sesiones"].sort(key=lambda x: x.get("id", 0))

        return data
    except:
        return {"sesiones": []}


@app.get("/", response_class=HTMLResponse)
async def home():
    html_path = STATIC_DIR / "session.html"
    if not html_path.exists():
        return HTMLResponse("<h1>ERROR</h1>", status_code=404)

    return HTMLResponse(open(html_path, "r", encoding="utf-8").read())


@app.get("/tvid_ejercicio.json")
async def get_sessions():
    return JSONResponse(content=cargar_db())


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.post("/create-checkout-session")
async def create_checkout():
    try:
        session = stripe.checkout.Session.create(
            payment_method_types=["card"],
            mode="payment",
            line_items=[{
                "price_data": {
                    "currency": "usd",
                    "product_data": {"name": "MayKaMi Access"},
                    "unit_amount": 1599,
                },
                "quantity": 1
            }],
            success_url="https://maykami.onrender.com?success=true",
            cancel_url="https://maykami.onrender.com?canceled=true",
        )

        return {"url": session.url}

    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})


@app.post("/webhook")
async def webhook(request: Request):
    payload = await request.body()
    sig = request.headers.get("stripe-signature")

    if not sig:
        raise HTTPException(status_code=400, detail="No signature")

    try:
        event = stripe.Webhook.construct_event(
            payload,
            sig,
            WEBHOOK_SECRET
        )
    except:
        raise HTTPException(status_code=400, detail="Invalid webhook")

    if event["type"] == "checkout.session.completed":
        session = event["data"]["object"]
        email = session.get("customer_details", {}).get("email")

        if email:
            if PAID_FILE.exists():
                data = json.load(open(PAID_FILE))
            else:
                data = []

            if email not in data:
                data.append(email)

            json.dump(data, open(PAID_FILE, "w"))

    return {"ok": True}


@app.get("/verify-access")
async def verify_access(email: str):
    if not PAID_FILE.exists():
        return {"paid": False}

    data = json.load(open(PAID_FILE))
    return {"paid": email in data}
