import os
from fastapi import FastAPI, Request, HTTPException, status, Query
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.security import HTTPBasic, HTTPBasicCredentials
import secrets

app = FastAPI()
security = HTTPBasic()

# Credenciales de Administrador (las que ya usas)
ADMIN_USERNAME = os.getenv("ADMIN_USERNAME", "admin")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "password")

# Llave secreta compartida con Open Than Go (configurada en las variables de entorno de Render)
OPEN_THAN_GO_SECRET_TOKEN = os.getenv("OPEN_THAN_GO_SECRET_TOKEN", "clave_falsa_temporal")
OPEN_THAN_GO_URL = os.getenv("OPEN_THAN_GO_URL", "https://openthango.com")

def verificar_admin(credentials: HTTPBasicCredentials = None):
    """Verifica el usuario y contraseña de administrador"""
    if not credentials:
        return False
    correct_username = secrets.compare_digest(credentials.username, ADMIN_USERNAME)
    correct_password = secrets.compare_digest(credentials.password, ADMIN_PASSWORD)
    return correct_username and correct_password

@app.get("/", response_class=HTMLResponse)
async def home(request: Request, token: str = Query(None)):
    """
    Ruta principal protegida: 
    1. Se abre si Open Than Go envía el token secreto correcto.
    2. Se abre si entras como Administrador con tu User y Password.
    3. Si no, se bloquea y redirige a Open Than Go.
    """
    # 1. Validar si viene autorizado por Open Than Go mediante la palabra secreta
    if token and token == OPEN_THAN_GO_SECRET_TOKEN:
        with open("static/session.html", "r", encoding="utf-8") as f:
            return HTMLResponse(f.read())

    # 2. Validar si intentas entrar con tu Usuario y Contraseña de Administrador
    auth_header = request.headers.get("Authorization")
    if auth_header:
        try:
            schema, _, encoded = auth_header.partition(" ")
            if schema.lower() == "basic":
                import base64
                decoded = base64.b64decode(encoded).decode("utf-8")
                username, password = decoded.split(":", 1)
                if secrets.compare_digest(username, ADMIN_USERNAME) and secrets.compare_digest(password, ADMIN_PASSWORD):
                    with open("static/session.html", "r", encoding="utf-8") as f:
                        return HTMLResponse(f.read())
        except Exception:
            pass

    # 3. Si no hay token válido ni credenciales de admin, se deniega el acceso (Error 403)
    # Opcional: puedes redirigir automáticamente a Open Than Go si prefieres
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Acceso restringido. Por favor realice su acceso a través de Open Than Go."
    )
    
