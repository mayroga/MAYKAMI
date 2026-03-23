from fastapi import FastAPI
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
import json
from pathlib import Path

app = FastAPI(title="MayKaMi NeuroGame Engine")

BASE_DIR = Path(__file__).resolve().parent
STATIC_DIR = BASE_DIR / "static"
JSON_PATH = STATIC_DIR / "tvid_ejercicio.json"

app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")

def cargar_db():
    try:
        if not JSON_PATH.exists():
            print("No existe JSON")
            return {"sesiones": []}
        with open(JSON_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
        data["sesiones"].sort(key=lambda x: x.get("id", 0))
        return data
    except Exception as e:
        print("Error JSON:", e)
        return {"sesiones": []}

@app.get("/", response_class=HTMLResponse)
async def home():
    html_path = STATIC_DIR / "session.html"
    if not html_path.exists():
        return HTMLResponse("<h1>No existe session.html</h1>")
    with open(html_path, "r", encoding="utf-8") as f:
        return HTMLResponse(f.read())

@app.get("/tvid_ejercicio.json")
async def get_sessions():
    db = cargar_db()
    return JSONResponse(content=db)

@app.get("/health")
async def health():
    return {"status": "ok"}
