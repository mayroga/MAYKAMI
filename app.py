import os
from fastapi import FastAPI, Request, HTTPException, status, Depends, Query
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.security import HTTPBasic, HTTPBasicCredentials
import secrets

app = FastAPI()
security = HTTPBasic()

# Credenciales de Administrador (las que ya usas en Render)
ADMIN_USERNAME = os.getenv("ADMIN_USERNAME", "admin")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "password")

# --- NUEVA VARIABLE DE ENTORNO PARA OPEN THAN GO ---
OPEN_THAN_GO_SECRET_TOKEN = os.getenv("OPEN_THAN_GO_SECRET_TOKEN", "clave_falsa_temporal")
OPEN_THAN_GO_URL = os.getenv("OPEN_THAN_GO_URL", "https://openthango.com")

@app.get("/", response_class=HTMLResponse)
async def home(token: str = None):
    # Si Open Than Go envía el token correcto, o si entra de forma directa permitida
    with open("static/session.html", "r", encoding="utf-8") as f:
        return HTMLResponse(f.read())
