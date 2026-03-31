/* ============================================================
   MAYKAMI NEUROGAME ENGINE - FRONTEND CONTROLLER
   STRIPE + TVID + SESSION MANAGER
   VERSION: PRO SECURE PATCH (NO BREAK CHANGES)
============================================================ */

"use strict";

const startBtn = document.getElementById("start-btn");
const nextBtn = document.getElementById("next-btn");
const backBtn = document.getElementById("back-btn");
const restartBtn = document.getElementById("restart-btn");
const payBtn = document.getElementById("pay-btn");

const block = document.getElementById("block");
const gallery = document.getElementById("visual-gallery");
const circle = document.getElementById("visual-circle");

let sesiones = [];
let current = 0;

// =========================
// PRO SECURITY LAYER (NEW)
// =========================
let userPaid = false;
let sessionActive = false;
let userEmail = null;

// =========================
// INIT APP
// =========================
document.addEventListener("DOMContentLoaded", async () => {
    await loadSessions();

    loadEmailFromStorage();

    await checkPaymentStatus();

    checkUrlStatus();
});

// =========================
// LOAD EMAIL (NEW SAFE LAYER)
// =========================
function loadEmailFromStorage() {
    try {
        userEmail = localStorage.getItem("maykami_email") || null;
    } catch (e) {
        userEmail = null;
    }
}

// =========================
// LOAD TVID SESSIONS (UNCHANGED)
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
// CHECK PAYMENT STATUS (ENHANCED, NOT REMOVED)
// =========================
async function checkPaymentStatus() {
    try {
        const res = await fetch("/health");
        const data = await res.json();

        console.log("Server status:", data.status);

        // =========================
        // PRO SECURITY ADDITION
        // =========================
        if (userEmail) {
            await verifyAccess(userEmail);
        }

    } catch (err) {
        console.error("Error verificando estado:", err);
    }
}

// =========================
// VERIFY ACCESS (NEW PRO LAYER)
// =========================
async function verifyAccess(email) {
    try {
        const res = await fetch(`/verify-access?email=${encodeURIComponent(email)}`);
        const data = await res.json();

        userPaid = data.paid === true;

        console.log("Access status:", userPaid);

    } catch (err) {
        console.error("Access verify error:", err);
        userPaid = false;
    }
}

// =========================
// START SESSION (UNCHANGED + PRO CHECK)
// =========================
startBtn?.addEventListener("click", async () => {

    // PRO SECURITY CHECK
    if (!userPaid) {
        alert("❌ Acceso denegado. Debes completar el pago.");
        return;
    }

    if (!sessionActive) {
        sessionActive = true;
        current = 0;
        showBlock(current);
    }
});

// =========================
// NEXT BLOCK (UNCHANGED + GUARD)
// =========================
nextBtn?.addEventListener("click", () => {
    if (!userPaid) return;

    if (current < sesiones.length - 1) {
        current++;
        showBlock(current);
    }
});

// =========================
// BACK BLOCK (UNCHANGED + GUARD)
// =========================
backBtn?.addEventListener("click", () => {
    if (!userPaid) return;

    if (current > 0) {
        current--;
        showBlock(current);
    }
});

// =========================
// RESTART SESSION (UNCHANGED + GUARD)
// =========================
restartBtn?.addEventListener("click", () => {
    if (!userPaid) return;

    current = 0;
    sessionActive = false;
    showBlock(current);
});

// =========================
// SHOW BLOCK (UNCHANGED)
// =========================
function showBlock(index) {
    if (!sesiones.length) return;

    const bloque = sesiones[index];
    if (!bloque) return;

    if (block) {
        block.innerHTML = "";
    }

    if (block) {
        const div = document.createElement("div");
        div.className = "block-item";
        div.innerText = bloque.texto || "Sin contenido";
        block.appendChild(div);
    }

    console.log("Mostrando bloque:", index);
}

// =========================
// STRIPE PAYMENT (UNCHANGED)
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
// URL PARAM CHECK (UNCHANGED + ENHANCED)
// =========================
function checkUrlStatus() {
    const params = new URLSearchParams(window.location.search);

    if (params.get("success") === "true") {
        console.log("Pago exitoso");

        // PRO FIX: revalidar acceso real
        if (userEmail) {
            verifyAccess(userEmail);
        }
    }

    if (params.get("canceled") === "true") {
        console.log("Pago cancelado");
    }
}

checkUrlStatus();

// =========================
// SIMPLE ACCESS GUARD (NOW REAL)
// =========================
function isAllowed() {
    return userPaid === true;
}

// =========================
// AUTO-LOCK UI IF NOT PAID (UNCHANGED LOGIC + SAFE)
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

// =========================
// NEW SAFE HELPER (OPTIONAL)
// =========================
function setUserEmail(email) {
    try {
        localStorage.setItem("maykami_email", email);
        userEmail = email;

        // auto verify after setting email
        verifyAccess(email);

    } catch (e) {
        console.error("Email save error:", e);
    }
}
