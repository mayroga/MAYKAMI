/* ============================================================
   MAYKAMI NEUROGAME ENGINE - V9.1 (SERVER REDIRECT & BYPASS)
============================================================ */

const gallery = document.getElementById("visual-gallery");
const circle = document.getElementById("visual-circle");
const block = document.getElementById("block");

const startBtn = document.getElementById("start-btn");
const nextBtn = document.getElementById("next-btn");
const backBtn = document.getElementById("back-btn");
const restartBtn = document.getElementById("restart-btn");
const payBtn = document.getElementById("pay-btn");

const params = new URLSearchParams(window.location.search);
const isAdmin = params.get('auth') === 'admin';
const isPagoOk = params.get('pago') === 'exitoso';

/* ================= ACCESO ADMINISTRATIVO ================= */

// Clic en el círculo para forzar login de administrador en cualquier momento
circle.onclick = () => {
    if (confirm("¿Ingresar credenciales de administrador?")) {
        window.location.href = "/admin";
    }
};

function checkAccess() {
    // Si el servidor nos mandó con ?auth=admin, saltamos todo
    if (isAdmin) {
        block.innerHTML = "BIENVENIDO ADMINISTRADOR<br><small>Acceso total ilimitado.</small>";
        payBtn.style.display = "none";
        startBtn.style.display = "inline-block";
        return true;
    }

    // Si viene de un pago exitoso
    if (isPagoOk) {
        payBtn.style.display = "none";
        startBtn.style.display = "inline-block";
        block.innerHTML = "Acceso Premium verificado.";
        return true;
    }

    const ahora = new Date();
    const h = ahora.getHours();
    const m = ahora.getMinutes();

    // Ventana 8:50-9:15 y 20:50-21:15
    const esAM = (h === 8 && m >= 50) || (h === 9 && m <= 15);
    const esPM = (h === 20 && m >= 50) || (h === 21 && m <= 15);

    if (!esAM && !esPM) {
        block.innerHTML = "SISTEMA CERRADO.<br><small>Disponible 10 min antes de las 9:00 AM/PM.</small>";
        payBtn.style.display = "none";
        startBtn.style.display = "none";
        return false;
    }

    block.innerHTML = "SISTEMA LISTO.<br><small>Adquiera su acceso para comenzar.</small>";
    payBtn.style.display = "inline-block";
    startBtn.style.display = "none";
    return false;
}

/* ================= PASARELA DE PAGO ================= */

async function iniciarPago() {
    block.innerHTML = "Conectando con Stripe...";
    try {
        const response = await fetch("/checkout", { method: "POST" });
        const data = await response.json();
        if (data.url) {
            window.location.href = data.url;
        } else {
            alert(data.error);
            block.innerHTML = data.error;
        }
    } catch (err) { console.error("Error Checkout:", err); }
}

/* ================= ENGINE CORE ================= */

let engine = { locked: false, abort: false, timers: new Set(), session: null };
let userData = { step: 0 };

const bgMusic = new Audio("https://www.soundhelix.com/examples/mp3/SoundHelix-Song-15.mp3");
bgMusic.loop = true;
bgMusic.volume = 0.04; 

function safeTimeout(fn, t) {
    const id = setTimeout(() => { engine.timers.delete(id); fn(); }, t);
    engine.timers.add(id);
}

function resetEngine() {
    engine.abort = true;
    window.speechSynthesis.cancel();
    engine.timers.forEach(t => clearTimeout(t));
    engine.timers.clear();
}

function speak(text) {
    return new Promise(resolve => {
        window.speechSynthesis.cancel();
        const utter = new SpeechSynthesisUtterance(text.replace(/<[^>]*>/g, ""));
        utter.lang = "es-ES";
        utter.rate = 0.88; 
        utter.onend = resolve;
        utter.onerror = resolve;
        window.speechSynthesis.speak(utter);
    });
}

function startBreathing(seconds = null, hold = false) {
    clearInterval(engine.breathLoop);
    const cycle = 3400; 
    const start = Date.now();
    const duration = seconds ? seconds * 1000 : Infinity;

    function loop() {
        if (engine.abort || (Date.now() - start >= duration)) return;
        circle.className = "inhale"; circle.textContent = "Inhala";
        safeTimeout(() => {
            if (hold) { circle.className = "hold"; circle.textContent = "Retén"; }
            safeTimeout(() => {
                circle.className = "exhale"; circle.textContent = "Exhala";
                safeTimeout(loop, cycle * 0.4);
            }, hold ? cycle * 0.2 : 0);
        }, cycle * 0.4);
    }
    loop();
}

async function typeText(text) {
    block.innerHTML = "";
    for (let char of text) {
        if (engine.abort) return;
        block.innerHTML += char;
        await new Promise(r => safeTimeout(r, 15));
    }
}

async function loadSession() {
    try {
        const res = await fetch("/tvid_ejercicio.json");
        const data = await res.json();
        engine.session = data.sesiones[0];
    } catch (e) { console.error(e); }
}

async function runStep() {
    if (engine.locked) return;
    engine.locked = true;
    resetEngine();
    engine.abort = false;

    const step = engine.session?.bloques?.[userData.step];
    if (!step) { 
        block.innerHTML = "Has completado la sesión de hoy.";
        userData.step = 0; return; 
    }

    if (step.textos) {
        for (const t of step.textos) {
            await speak(t); await typeText(t);
            if (/respira|inhala|exhala/i.test(t)) startBreathing(10, t.includes("retén"));
            await new Promise(r => safeTimeout(r, 500));
        }
    }
    engine.locked = false;
}

function initGallery() {
    gallery.innerHTML = "";
    for (let i = 0; i < 15; i++) {
        const div = document.createElement("div");
        div.className = "slide";
        div.style.backgroundImage = `url(https://picsum.photos/1920/1080?random=${i})`;
        gallery.appendChild(div);
    }
    const slides = document.querySelectorAll(".slide");
    if (slides[0]) slides[0].classList.add("active");
    setInterval(() => {
        const all = document.querySelectorAll(".slide");
        all.forEach(s => s.classList.remove("active"));
        slideIndex = (slideIndex + 1) % all.length;
        all[slideIndex].classList.add("active");
    }, 8000);
}

/* ================= EVENTOS ================= */

startBtn.onclick = async () => {
    startBtn.style.display = "none";
    bgMusic.play();
    initGallery();
    await loadSession();
    runStep();
};

nextBtn.onclick = () => { userData.step++; runStep(); };
backBtn.onclick = () => { if (userData.step > 0) userData.step--; runStep(); };
restartBtn.onclick = () => { userData.step = 0; runStep(); };

// Inicio de ciclo
checkAccess();
setInterval(checkAccess, 60000);
