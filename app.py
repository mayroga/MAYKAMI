from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from pathlib import Path
import os

app = FastAPI()

BASE_DIR = Path(__file__).resolve().parent
STATIC_DIR = BASE_DIR / "static"

app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

# =========================
# ADMIN CREDENTIALS (RENDER ENV)
# =========================
ADMIN_USERNAME = os.getenv("ADMIN_USERNAME", "admin")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "1234")

# =========================
# SIMPLE SESSION MEMORY
# =========================
active_sessions = set()

# =========================
# HOME
# =========================
@app.get("/")
def home():
    return FileResponse(STATIC_DIR / "index.html")


# =========================
# LOGIN VERIFY
# =========================
@app.post("/login")
async def login(request: Request):
    data = await request.json()

    username = data.get("username")
    password = data.get("password")

    if not username or not password:
        raise HTTPException(status_code=400, detail="Missing credentials")

    if username == ADMIN_USERNAME and password == ADMIN_PASSWORD:
        token = f"session_{username}"
        active_sessions.add(token)

        return JSONResponse({
            "status": "ok",
            "token": token
        })

    raise HTTPException(status_code=403, detail="Acceso denegado")


# =========================
# CHECK ACCESS
# =========================
@app.post("/verify-access")
async def verify_access(request: Request):
    data = await request.json()
    token = data.get("token")

    if not token:
        raise HTTPException(status_code=403, detail="Acceso denegado")

    if token not in active_sessions:
        raise HTTPException(status_code=403, detail="Acceso denegado")

    return {"status": "ok"}


# =========================
# JSON DATA
# =========================
@app.get("/tvid_ejercicio.json")
def get_data():
    file_path = STATIC_DIR / "tvid_ejercicio.json"

    if not file_path.exists():
        raise HTTPException(status_code=404, detail="JSON no encontrado")

    return FileResponse(file_path)


# =========================
# HEALTH
# =========================
@app.get("/health")
def health():
    return {"status": "running"}
