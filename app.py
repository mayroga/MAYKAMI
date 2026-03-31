from flask import Flask, request, jsonify, render_template
import os

app = Flask(__name__)

ADMIN_USERNAME = os.getenv("ADMIN_USERNAME", "")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "")


@app.route("/")
def home():
    return render_template("index.html")


# LOGIN GRATIS (USANDO RENDER KEYS)
@app.route("/login", methods=["POST"])
def login():
    data = request.get_json()

    username = data.get("username")
    password = data.get("password")

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
