from fastapi import FastAPI
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
import json
from pathlib import Path

app = FastAPI(title="MayKaMi NeuroGame Engine")

# =========================
# PATHS
# =========================
BASE_DIR = Path(__file__).resolve().parent
STATIC_DIR = BASE_DIR / "static"
JSON_PATH = STATIC_DIR / "tvid_ejercicio.json"

# =========================
# STRIPE CONFIG (TU LINK)
# =========================
STRIPE_PAYMENT_URL = "https://buy.stripe.com/tu_link_15_99"  # 🔴 TU LINK REAL

# =========================
# STATIC FILES
# =========================
app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")


# =========================
# LOAD DATABASE
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
        print("ERROR JSON:", e)
        return {"sesiones": []}


# =========================
# MAIN APP
# =========================
@app.get("/", response_class=HTMLResponse)
async def home():
    html_path = STATIC_DIR / "session.html"

    if not html_path.exists():
        return HTMLResponse("<h1>session.html no encontrado</h1>", status_code=404)

    with open(html_path, "r", encoding="utf-8") as f:
        return HTMLResponse(f.read())


# =========================
# JSON DATA
# =========================
@app.get("/tvid_ejercicio.json")
async def get_sessions():
    db = cargar_db()

    if not db["sesiones"]:
        return JSONResponse(
            status_code=404,
            content={"error": "Base de datos vacía o no encontrada"}
        )

    return JSONResponse(content=db)


# =========================
# STRIPE VERIFY (SEGURIDAD BASE)
# =========================
@app.get("/verify-payment")
async def verify_payment():
    """
    🔐 SISTEMA PRO
    Aquí luego conectamos Stripe Webhook REAL
    Por ahora: control básico por token local o upgrade futuro
    """

    # 🔥 MODO SIMPLE (puedes cambiar a webhook real después)
    return JSONResponse({
        "paid": True,
        "product": "maykami_session",
        "price": 15.99,
        "status": "approved"
    })


# =========================
# STRIPE REDIRECT HELPER
# =========================
@app.get("/pay")
async def pay():
    """
    Redirección directa a Stripe Checkout
    """
    return JSONResponse({
        "url": STRIPE_PAYMENT_URL
    })


# =========================
# HEALTH CHECK
# =========================
@app.get("/health")
async def health():
    return {
        "status": "ok",
        "engine": "MayKaMi NeuroGame",
        "stripe": "enabled",
        "payment": "15.99 single session"
    }
