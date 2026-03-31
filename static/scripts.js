"use strict";

/* ============================================================
   MAYKAMI NEUROGAME ENGINE - FRONTEND PRO SECURE
   STRIPE + ACCESS CONTROL + SESSION ENGINE
============================================================ */

let sesiones = [];
let currentIndex = 0;

// Estado de usuario (SOLO backend manda la verdad)
let accessGranted = false;
let userEmail = null;

// =========================
// ELEMENTOS UI
// =========================
const startBtn = document.getElementById("start-btn");
const nextBtn = document.getElementById("next-btn");
const backBtn = document.getElementById("back-btn");
const restartBtn = document.getElementById("restart-btn");
const payBtn = document.getElementById("pay-btn");

const block = document.getElementById("block");

// =========================
// INIT
// =========================
document.addEventListener("DOMContentLoaded", async () => {
    loadLocalEmail();
    await loadSessions();

    if (userEmail) {
        await verifyAccess(userEmail);
    }

    checkUrlStatus();
});

// =========================
// LOAD EMAIL (LOCAL STORAGE)
// =========================
function loadLocalEmail() {
    userEmail = localStorage.getItem("maykami_email");
}

// =========================
// SAVE EMAIL
// =========================
function saveEmail(email) {
    if (!email) return;
    localStorage.setItem("maykami_email", email);
    userEmail = email;
}

// =========================
// LOAD SESSIONS
// =========================
async function loadSessions() {
    try {
        const res = await fetch("/tvid_ejercicio.json");
        const data = await res.json();
        sesiones = data.sesiones || [];
    } catch (err) {
        console.error("Error loading sessions:", err);
    }
}

// =========================
// VERIFY ACCESS (REAL SECURITY)
// =========================
async function verifyAccess(email) {
    try {
        const res = await fetch(`/verify-access?email=${encodeURIComponent(email)}`);
        const data = await res.json();

        accessGranted = data.paid === true;

        if (!accessGranted) {
            lockUI();
        } else {
            unlockUI();
        }

    } catch (err) {
        console.error("Access verify error:", err);
        accessGranted = false;
        lockUI();
    }
}

// =========================
// LOCK / UNLOCK UI
// =========================
function lockUI() {
    if (block) block.style.opacity = "0.4";
    if (startBtn) startBtn.disabled = true;
}

function unlockUI() {
    if (block) block.style.opacity = "1";
    if (startBtn) startBtn.disabled = false;
}

// =========================
// START SESSION
// =========================
startBtn?.addEventListener("click", () => {
    if (!accessGranted) {
        alert("❌ Acceso bloqueado. Debes completar el pago.");
        return;
    }

    currentIndex = 0;
    showBlock(currentIndex);
});

// =========================
// NEXT
// =========================
nextBtn?.addEventListener("click", () => {
    if (!accessGranted) return;

    if (currentIndex < sesiones.length - 1) {
        currentIndex++;
        showBlock(currentIndex);
    }
});

// =========================
// BACK
// =========================
backBtn?.addEventListener("click", () => {
    if (!accessGranted) return;

    if (currentIndex > 0) {
        currentIndex--;
        showBlock(currentIndex);
    }
});

// =========================
// RESTART
// =========================
restartBtn?.addEventListener("click", () => {
    if (!accessGranted) return;

    currentIndex = 0;
    showBlock(currentIndex);
});

// =========================
// SHOW BLOCK
// =========================
function showBlock(index) {
    if (!sesiones.length) return;

    const item = sesiones[index];
    if (!item) return;

    if (block) {
        block.innerHTML = `
            <div class="block-item">
                ${item.texto || "Sin contenido"}
            </div>
        `;
    }
}

// =========================
// STRIPE PAYMENT
// =========================
payBtn?.addEventListener("click", async () => {
    try {
        const res = await fetch("/create-checkout-session", {
            method: "POST"
        });

        const data = await res.json();

        if (data.url) {
            window.location.href = data.url;
        } else {
            console.error("No checkout URL");
        }

    } catch (err) {
        console.error("Payment error:", err);
    }
});

// =========================
// AFTER PAYMENT URL CHECK
// =========================
function checkUrlStatus() {
    const params = new URLSearchParams(window.location.search);

    if (params.get("success") === "true") {
        console.log("✔ Pago exitoso detectado");

        // fuerza revalidación con backend
        if (userEmail) {
            verifyAccess(userEmail);
        }
    }

    if (params.get("canceled") === "true") {
        console.log("❌ Pago cancelado");
    }
}

// =========================
// AUTO SECURITY CHECK LOOP
// =========================
setInterval(() => {
    if (!accessGranted) {
        lockUI();
    }
}, 3000);

// =========================
// OPTIONAL: SIMPLE EMAIL LOGIN HOOK
// =========================
function setUserEmail(email) {
    saveEmail(email);
    verifyAccess(email);
}
