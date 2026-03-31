from flask import Flask, request, jsonify, render_template
import os

app = Flask(__name__)

ADMIN_USERNAME = os.getenv("ADMIN_USERNAME", "")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "")


@app.route("/")
def home():
    return render_template("index.html")


@app.route("/login", methods=["POST"])
def login():
    data = request.get_json()

    username = (data.get("username") or "").strip()
    password = (data.get("password") or "").strip()

    admin_user = (ADMIN_USERNAME or "").strip()
    admin_pass = (ADMIN_PASSWORD or "").strip()

    print("DEBUG USER:", username)
    print("DEBUG PASS:", password)
    print("ENV USER:", admin_user)
    print("ENV PASS:", admin_pass)

    if username == admin_user and password == admin_pass:
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
    # ACCESO GRATIS SI COINCIDE CON ADMIN EN RENDER
    if username == ADMIN_USERNAME and password == ADMIN_PASSWORD:
        return jsonify({
            "success": True,
            "access": "free",
            "paid": True
        })

    # SI NO COINCIDE → BLOQUEADO O PAGO
    return jsonify({
        "success": False,
        "access": "denied",
        "paid": False
    })


# VERIFICACIÓN NORMAL (SI QUIERES EXTENDER PAGO DESPUÉS)
@app.route("/verify-access")
def verify_access():
    username = request.args.get("username")
    password = request.args.get("password")

    if username == ADMIN_USERNAME and password == ADMIN_PASSWORD:
        return jsonify({"paid": True})

    return jsonify({"paid": False})


if __name__ == "__main__":
    app.run(debug=True)
