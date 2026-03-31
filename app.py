from flask import Flask, request, jsonify, render_template
import os

app = Flask(__name__)

# VARIABLES DE RENDER (ADMIN LOGIN)
ADMIN_USERNAME = (os.getenv("ADMIN_USERNAME", "") or "").strip()
ADMIN_PASSWORD = (os.getenv("ADMIN_PASSWORD", "") or "").strip()


# =========================
# HOME
# =========================
@app.route("/")
def home():
    return render_template("index.html")


# =========================
# LOGIN
# =========================
@app.route("/login", methods=["POST"])
def login():
    data = request.get_json() or {}

    username = (data.get("username") or "").strip()
    password = (data.get("password") or "").strip()

    # DEBUG (Render logs)
    print("DEBUG USER:", username)
    print("DEBUG PASS:", password)
    print("ENV USER:", ADMIN_USERNAME)
    print("ENV PASS:", ADMIN_PASSWORD)

    # VALIDACIÓN PRINCIPAL
    if username == ADMIN_USERNAME and password == ADMIN_PASSWORD:
        return jsonify({
            "success": True,
            "access": "free",
            "paid": True
        })

    return jsonify({
        "success": False,
        "access": "denied",
        "paid": False
    })


# =========================
# VERIFY ACCESS
# =========================
@app.route("/verify-access")
def verify_access():
    username = (request.args.get("username") or "").strip()
    password = (request.args.get("password") or "").strip()

    paid = (username == ADMIN_USERNAME and password == ADMIN_PASSWORD)

    return jsonify({
        "paid": paid
    })


# =========================
# RUN LOCAL (IGNORADO EN RENDER)
# =========================
if __name__ == "__main__":
    app.run(debug=True)
