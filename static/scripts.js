/* ============================================================
   FRONTEND LOGIC (static/scripts.js) ACTUALIZADO
   - Traducción total de texto y voz desde el inicio mediante botón.
   - Movimiento circular de respiración natural restaurado.
   - Sincronización estricta: la voz se emite estrictamente DESPUÉS de completarse el tipeo en pantalla.
   - Integración con Open Than Go como aplicación madre.
============================================================ */

const gallery = document.getElementById("visual-gallery");
const circle = document.getElementById("visual-circle");
const block = document.getElementById("block");

const startBtn = document.getElementById("start-btn");
const nextBtn = document.getElementById("next-btn");
const backBtn = document.getElementById("back-btn");
const restartBtn = document.getElementById("restart-btn");
const payBtn = document.getElementById("pay-btn");
const langBtn = document.getElementById("lang-btn");
const motherAppBtn = document.getElementById("mother-app-btn");

const urlParams = new URLSearchParams(window.location.search);
const isAdmin = urlParams.get('auth') === 'admin';
const isPagoOk = urlParams.get('pago') === 'exitoso';

// Idioma por defecto en Español
let currentLang = localStorage.getItem("maykamiLang") || "es";

const translations = {
    es: {
        circle_title: "MAYKAMI",
        ready: "Listo para iniciar sesión",
        admin_access: "¿Ingresar como Administrador?",
        unlocked: "SISTEMA DESBLOQUEADO (ADMIN)",
        closed: "SISTEMA CERRADO.<br><small>Apertura: 9:00 AM/PM (Cobro 10 min antes).</small>",
        taquilla: "TAQUILLA ABIERTA.<br><small>Adquiera su acceso para comenzar.</small>",
        connecting: "Conectando con la pasarela de pago segura...",
        error_payment: "Error en el pago.",
        completed: "Sesión completada exitosamente. Hasta mañana.",
        inhale: "Inhala",
        exhale: "Exhala",
        hold: "Retén",
        start: "Iniciar",
        back: "Atrás",
        next: "Siguiente",
        restart: "Reiniciar",
        stripe_btn: "Stripe ($5.99)",
        lang_label: "Idioma: ES / EN",
        lang_changed: "Idioma cambiado a español"
    },
    en: {
        circle_title: "MAYKAMI",
        ready: "Ready to start session",
        admin_access: "Login as Administrator?",
        unlocked: "SYSTEM UNLOCKED (ADMIN)",
        closed: "SYSTEM CLOSED.<br><small>Opening: 9:00 AM/PM (Checkout 10 min prior).</small>",
        taquilla: "BOX OFFICE OPEN.<br><small>Acquire your access to begin.</small>",
        connecting: "Connecting to secure payment gateway...",
        error_payment: "Payment error.",
        completed: "Session completed successfully. See you tomorrow.",
        inhale: "Inhale",
        exhale: "Exhale",
        hold: "Hold",
        start: "Start",
        back: "Back",
        next: "Next",
        restart: "Restart",
        stripe_btn: "Stripe ($5.99)",
        lang_label: "Language: EN / ES",
        lang_changed: "Language changed to English"
    }
};

function t(key) {
    return translations[currentLang][key] || key;
}

function updateUItexts() {
    if (startBtn) startBtn.textContent = t("start");
    if (backBtn) backBtn.textContent = t("back");
    if (nextBtn) nextBtn.textContent = t("next");
    if (restartBtn) restartBtn.textContent = t("restart");
    if (payBtn) payBtn.textContent = t("stripe_btn");
    if (langBtn) langBtn.textContent = t("lang_label");
    if (circle) circle.textContent = t("circle_title");
    
    if (block.textContent.includes("Listo") || block.textContent.includes("Ready")) {
        block.innerHTML = t("ready");
    }
}

function toggleLanguage() {
    currentLang = currentLang === "es" ? "en" : "es";
    localStorage.setItem("maykamiLang", currentLang);
    updateUItexts();
    speak(t("lang_changed"));
}

/* ================= CONTROL DE ACCESO & APP MADRE ================= */

circle.onclick = () => {
    if (confirm(t("admin_access"))) {
        window.location.href = "/admin";
    }
};

function irAppMadre() {
    window.location.href = "https://openthango.com";
}

function checkAccess() {
    if (isAdmin || isPagoOk) {
        if (isAdmin) block.innerHTML = t("unlocked");
        startBtn.style.display = "inline-block";
        if (payBtn) payBtn.style.display = "none";
        return true;
    }

    const ahora = new Date();
    const h = ahora.getHours();
    const m = ahora.getMinutes();
    const esVentana = (h === 8 && m >= 50) || (h === 9 && m <= 15) || (h === 20 && m >= 50) || (h === 21 && m <= 15);

    if (!esVentana) {
        block.innerHTML = t("closed");
        startBtn.style.display = "none";
        if (payBtn) payBtn.style.display = "none";
        return false;
    }

    block.innerHTML = t("taquilla");
    startBtn.style.display = "none";
    if (payBtn) payBtn.style.display = "inline-block";
    return false;
}

async function iniciarPago() {
    block.innerHTML = t("connecting");
    try {
        const response = await fetch("/checkout", { method: "POST" });
        const data = await response.json();
        if (data.url) {
            window.location.href = data.url;
        } else {
            alert(data.error || t("error_payment"));
        }
    } catch (err) { console.error("Error Stripe:", err); }
}

/* ================= AUDIO & ENGINE CORE ================= */

const bgMusic = new Audio("https://www.soundhelix.com/examples/mp3/SoundHelix-Song-15.mp3");
bgMusic.loop = true;
bgMusic.volume = 0.04;

function playMusic() {
    bgMusic.play().catch(() => {
        document.body.addEventListener("click", () => {
            bgMusic.play();
        }, { once: true });
    });
}

let engine = {
    locked: false,
    abort: false,
    timers: new Set(),
    breathLoop: null,
    session: null
};

let userData = JSON.parse(localStorage.getItem("maykamiData")) || {
    sessionId: 1,
    step: 0,
    disciplina: 40
};

let slideIndex = 0;

function safeTimeout(fn, t) {
    const id = setTimeout(() => {
        engine.timers.delete(id);
        fn();
    }, t);
    engine.timers.add(id);
}

function resetEngine() {
    engine.abort = true;
    window.speechSynthesis.cancel();
    engine.timers.forEach(t => clearTimeout(t));
    engine.timers.clear();
    startBreathing(null, false);
}

/* 🔊 VOZ EJECUTADA ESTRICTAMENTE DESPUÉS DE LAS LETRAS */
function speak(text) {
    return new Promise(resolve => {
        window.speechSynthesis.cancel();
        const cleanText = text.replace(/<[^>]*>/g, "");
        const utter = new SpeechSynthesisUtterance(cleanText);
        utter.lang = currentLang === "es" ? "es-ES" : "en-US";
        utter.rate = 0.88;
        utter.pitch = 0.95;
        utter.onend = resolve;
        utter.onerror = resolve;
        window.speechSynthesis.speak(utter);
    });
}

function extractSeconds(text) {
    const match = text.match(/(\d{1,3})\s*(segundos|seg|s|seconds)/i);
    return match ? parseInt(match[1]) : null;
}

/* ================= MOVIMIENTO DE RESPIRACIÓN NATURAL (CÍRCULO ORIGINAL) ================= */
function startBreathing(seconds = null, forceHold = false) {
    clearInterval(engine.breathLoop);
    const cycle = 3400;
    const start = Date.now();
    const duration = seconds ? seconds * 1000 : Infinity;

    function loop() {
        if (engine.abort || (Date.now() - start >= duration)) return;
        
        circle.className = "inhale";
        circle.textContent = t("inhale");

        safeTimeout(() => {
            if (forceHold) {
                circle.className = "hold";
                circle.textContent = t("hold");
            }

            safeTimeout(() => {
                circle.className = "exhale";
                circle.textContent = t("exhale");
                safeTimeout(loop, cycle * 0.4);
            }, forceHold ? cycle * 0.2 : 0);

        }, cycle * 0.4);
    }

    loop();
}

async function typeText(text) {
    block.innerHTML = "";
    for (let i = 0; i < text.length; i++) {
        if (engine.abort) return;
        block.innerHTML += text[i];
        await new Promise(r => safeTimeout(r, 12));
    }
}

async function loadSession() {
    try {
        const res = await fetch("/tvid_ejercicio.json");
        const data = await res.json();
        const diaAnio = Math.floor((new Date() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
        const idHoy = (diaAnio % 21) + 1;
        engine.session = data.sesiones.find(s => s.id === idHoy) || data.sesiones[0];
    } catch (e) {
        console.error("Error JSON:", e);
    }
}

async function runStep() {
    if (engine.locked) return;
    engine.locked = true;
    resetEngine();
    engine.abort = false;

    const step = engine.session?.bloques?.[userData.step];
    if (!step) { finish(); return; }

    nextBtn.style.display = "inline-block";
    restartBtn.style.display = "inline-block";
    backBtn.style.display = "inline-block";

    let textoMostrar = step.texto || (step.textos ? step.textos[0] : "");
    if (currentLang === "en" && step.texto_en) {
        textoMostrar = step.texto_en;
    }

    if (step.textos?.length) {
        for (const tItem of step.textos) {
            if (engine.abort) break;
            const sec = extractSeconds(tItem);
            const hold = tItem.toLowerCase().includes("retén") || tItem.toLowerCase().includes("hold");

            // 1. PRIMERO APARECEN LAS LETRAS EN PANTALLA
            await typeText(tItem);
            // 2. DESPUÉS SE REPRODUCE LA VOZ
            await speak(tItem);

            if (/respira|inhala|exhala|breathe|inhale|exhale/i.test(tItem)) startBreathing(sec || 8, hold);
            await new Promise(r => safeTimeout(r, 600));
        }
    } else if (textoMostrar) {
        const sec = extractSeconds(textoMostrar);
        const hold = textoMostrar.toLowerCase().includes("retén") || textoMostrar.toLowerCase().includes("hold");

        // 1. PRIMERO APARECEN LAS LETRAS
        await typeText(textoMostrar);
        // 2. DESPUÉS HABLA LA VOZ
        await speak(textoMostrar);

        if (/respira|inhala|exhala|breathe|inhale|exhale/i.test(textoMostrar)) startBreathing(sec || 8, hold);
    }

    engine.locked = false;
}

function finish() {
    block.innerHTML = t("completed");
    userData.step = 0;
    save();
    engine.locked = false;
}

function save() {
    localStorage.setItem("maykamiData", JSON.stringify(userData));
}

function initGallery() {
    gallery.innerHTML = "";
    for (let i = 0; i < 20; i++) {
        const div = document.createElement("div");
        div.className = "slide";
        div.style.backgroundImage = `
        linear-gradient(rgba(255,255,255,0.18), rgba(255,255,255,0.18)),
        url(https://picsum.photos/1920/1080?random=${i})
        `;
        div.style.backgroundSize = "cover";
        div.style.backgroundPosition = "center";
        div.style.filter = "brightness(1.18) contrast(1.08) saturate(1.1)";
        gallery.appendChild(div);
    }

    const slides = document.querySelectorAll(".slide");
    if (slides[0]) slides[0].classList.add("active");

    setInterval(() => {
        const all = document.querySelectorAll(".slide");
        all.forEach(s => s.classList.remove("active"));
        slideIndex = (slideIndex + 1) % all.length;
        if (all[slideIndex]) all[slideIndex].classList.add("active");
    }, 7000);
}

startBtn.onclick = async () => {
    startBtn.style.display = "none";
    playMusic();
    userData.step = 0;
    initGallery();
    await loadSession();
    runStep();
};

nextBtn.onclick = () => { userData.step++; save(); runStep(); };
backBtn.onclick = () => { if (userData.step > 0) userData.step--; save(); runStep(); };
restartBtn.onclick = () => { userData.step = 0; save(); runStep(); };
if (payBtn) payBtn.onclick = iniciarPago;

updateUItexts();
checkAccess();
setInterval(checkAccess, 60000);
save();
