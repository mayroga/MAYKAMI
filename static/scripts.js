/* ============================================================
   MAYKAMI NEUROGAME ENGINE - FRONTEND CONTROLLER
   STRIPE + TVID + SESSION MANAGER
============================================================ */

const startBtn = document.getElementById("start-btn");
const nextBtn = document.getElementById("next-btn");
const backBtn = document.getElementById("back-btn");
const restartBtn = document.getElementById("restart-btn");

const block = document.getElementById("block");
const gallery = document.getElementById("visual-gallery");
const circle = document.getElementById("visual-circle");

let sesiones = [];
let current = 0;
let userPaid = false;
let sessionActive = false;

// =========================
// INIT APP
// =========================
document.addEventListener("DOMContentLoaded", async () => {
    await loadSessions();
    await checkPaymentStatus();
});

// =========================
// LOAD TVID SESSIONS
// =========================
async function loadSessions() {
    try {
        const res = await fetch("/tvid_ejercicio.json");
        const data = await res.json();
        sesiones = data.sesiones || [];
        console.log("Sesiones cargadas:", sesiones.length);
    } catch (err) {
        console.error("Error cargando sesiones:", err);
    }
}

// =========================
// CHECK PAYMENT STATUS
// =========================
async function checkPaymentStatus() {
    try {
        const res = await fetch("/health");
        const data = await res.json();

        console.log("Server status:", data.status);

        // ⚠️ IMPORTANTE:
        // aquí solo simulamos estado UI
        // el backend REAL debe bloquear acceso si no pagó

    } catch (err) {
        console.error("Error verificando estado:", err);
    }
}

// =========================
// START SESSION
// =========================
startBtn?.addEventListener("click", async () => {

    // 🔥 verificación de acceso (frontend UI only)
    if (!sessionActive) {
        sessionActive = true;
        current = 0;
        showBlock(current);
    }
});

// =========================
// NEXT BLOCK
// =========================
nextBtn?.addEventListener("click", () => {
    if (current < sesiones.length - 1) {
        current++;
        showBlock(current);
    }
});

// =========================
// BACK BLOCK
// =========================
backBtn?.addEventListener("click", () => {
    if (current > 0) {
        current--;
        showBlock(current);
    }
});

// =========================
// RESTART SESSION
// =========================
restartBtn?.addEventListener("click", () => {
    current = 0;
    sessionActive = false;
    showBlock(current);
});

// =========================
// SHOW BLOCK
// =========================
function showBlock(index) {
    if (!sesiones.length) return;

    const bloque = sesiones[index];

    if (!bloque) return;

    // limpiar pantalla sin congelar
    if (block) {
        block.innerHTML = "";
    }

    // mostrar contenido
    if (block) {
        const div = document.createElement("div");
        div.className = "block-item";
        div.innerText = bloque.texto || "Sin contenido";
        block.appendChild(div);
    }

    console.log("Mostrando bloque:", index);
}

// =========================
// STRIPE PAYMENT (REDIRECT)
// =========================
async function goToPayment() {
    try {
        const res = await fetch("/create-checkout-session", {
            method: "POST"
        });

        const data = await res.json();

        if (data.url) {
            window.location.href = data.url;
        } else {
            console.error("No payment URL received");
        }

    } catch (err) {
        console.error("Error en pago:", err);
    }
}

// =========================
// URL PARAM CHECK (SUCCESS / CANCEL)
// =========================
function checkUrlStatus() {
    const params = new URLSearchParams(window.location.search);

    if (params.get("success") === "true") {
        console.log("Pago exitoso");
        userPaid = true;
    }

    if (params.get("canceled") === "true") {
        console.log("Pago cancelado");
    }
}

checkUrlStatus();

// =========================
// SIMPLE ACCESS GUARD (UI ONLY)
// =========================
function isAllowed() {
    return userPaid === true;
}

// =========================
// AUTO-LOCK UI IF NOT PAID (OPTIONAL)
// =========================
setInterval(() => {
    if (!isAllowed()) {
        if (block) {
            block.style.opacity = "0.6";
        }
    } else {
        if (block) {
            block.style.opacity = "1";
        }
    }
}, 2000);
