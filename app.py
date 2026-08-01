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

# Llave secreta compartida con Open Than Go
OPEN_THAN_GO_SECRET_TOKEN = os.getenv("OPEN_THAN_GO_SECRET_TOKEN", "clave_falsa_temporal")
OPEN_THAN_GO_URL = os.getenv("OPEN_THAN_GO_URL", "https://openthango.com")

@app.get("/", response_class=HTMLResponse)
async def home(request: Request, token: str = Query(None), credentials: HTTPBasicCredentials = Depends(security)):
    """
    Ruta protegida: 
    1. Si Open Than Go envía el token secreto correcto, se abre.
    2. Si el navegador envía el usuario y contraseña de Administrador correctos, se abre.
    3. Si no, muestra la solicitud de autenticación (usuario/password) o deniega el acceso.
    """
    
    # 1. Validar si viene autorizado por Open Than Go
    if token and token == OPEN_THAN_GO_SECRET_TOKEN:
        with open("static/session.html", "r", encoding="utf-8") as f:
            return HTMLResponse(f.read())

    # 2. Validar si se ingresó el Usuario y Contraseña de Administrador correctamente
    correct_username = secrets.compare_digest(credentials.username, ADMIN_USERNAME)
    correct_password = secrets.compare_digest(credentials.password, ADMIN_PASSWORD)

    if correct_username and correct_password:
        with open("static/session.html", "r", encoding="utf-8") as f:
            return HTMLResponse(f.read())

    # 3. Si las credenciales son incorrectas, solicita de nuevo el login o muestra el error
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Credenciales incorrectas o acceso no autorizado.",
        headers={"WWW-Authenticate": "Basic"},
    )
