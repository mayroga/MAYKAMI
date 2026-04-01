/* ============================================================
   MAYKAMI NEUROGAME ENGINE V8.5 - RESTAURADO Y COMPLETO
   URL: https://maykami.onrender.com
============================================================ */

const gallery = document.getElementById("visual-gallery");
const circle = document.getElementById("visual-circle");
const block = document.getElementById("block");

const startBtn = document.getElementById("start-btn");
const nextBtn = document.getElementById("next-btn");
const backBtn = document.getElementById("back-btn");
const restartBtn = document.getElementById("restart-btn");
const payBtn = document.getElementById("pay-btn"); // Asegúrate de tener este botón en tu HTML

const urlParams = new URLSearchParams(window.location.search);
const isAdmin = urlParams.get('auth') === 'admin';
const isPagoOk = urlParams.get('pago') === 'exitoso';

/* ================= CONTROL DE ACCESO (ADMIN & TIEMPO) ================= */

// Clic en el círculo central permite al Admin loguearse
circle.onclick = () => {
    if (confirm("¿Ingresar como Administrador?")) {
        window.location.href = "/admin";
    }
};

function checkAccess() {
    if (isAdmin || isPagoOk) {
        if (isAdmin) block.innerHTML = "MODO ADMINISTRADOR ACTIVADO";
        startBtn.style.display = "inline-block";
        if (payBtn) payBtn.style.display = "none";
        return true;
    }

    const ahora = new Date();
    const h = ahora.getHours();
    const m = ahora.getMinutes();

    // Ventana 8:50-9:15 y 20:50-21:15
    const esAM = (h === 8 && m >= 50) || (h === 9 && m <= 15);
    const esPM = (h === 20 && m >= 50) || (h === 21 && m <= 15);

    if (!esAM && !esPM) {
        block.innerHTML = "SISTEMA CERRADO.<br><small>Apertura: 9:00 AM/PM (Cobro inicia 10 min antes).</small>";
        startBtn.style.display = "none";
        if (payBtn) payBtn.style.display = "none";
        return false;
    }

    block.innerHTML = "TAQUILLA ABIERTA.<br><small>Inicie su pago para acceder.</small>";
    startBtn.style.display = "none";
    if (payBtn) payBtn.style.display = "inline-block";
    return false;
}

/* ================= SISTEMA DE PAGO (STRIPE) ================= */

async function iniciarPago() {
    block.innerHTML = "Conectando con la pasarela de pago segura...";
    try {
        const response = await fetch("/checkout", { method: "POST" });
        const data = await response.json();
        if (data.url) {
            window.location.href = data.url;
        } else {
            alert(data.error || "Error en el servidor de pagos.");
            block.innerHTML = data.error;
        }
    } catch (err) {
        console.error("Error Stripe:", err);
    }
}

/* ================= AUDIO ANTI-STRESS (FIX MÓVIL) ================= */

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

/* ================= ENGINE CORE ================= */

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

/* ================= UTILS & SAFE TIMERS ================= */

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
    block.innerHTML = "";
    startBreathing(null, false);
}

/* ================= VOZ PROFESIONAL CALMADA ================= */

function speak(text) {
    return new Promise(resolve => {
        window.speechSynthesis.cancel();
        const utter = new SpeechSynthesisUtterance(text.replace(/<[^>]*>/g, ""));
        utter.lang = "es-ES";
        utter.rate = 0.88; 
        utter.pitch = 0.95;
        utter.onend = resolve;
        utter.onerror = resolve;
        window.speechSynthesis.speak(utter);
    });
}

function extractSeconds(text) {
    const match = text.match(/(\d{1,3})\s*(segundos|seg|s)/i);
    return match ? parseInt(match[1]) : null;
}

function hasHold(text) {
    const t = text.toLowerCase();
    return t.includes("reten") || t.includes("retener") || t.includes("pausa") || t.includes("hold");
}

/* ================= RESPIRACIÓN FISIOLÓGICA ================= */

function startBreathing(seconds = null, forceHold = false) {
    clearInterval(engine.breathLoop);
    const cycle = 3400; 
    const inhaleTime = cycle * 0.4;
    const holdTime   = cycle * 0.2;
    const exhaleTime = cycle * 0.4;

    const start = Date.now();
    const duration = seconds ? seconds * 1000 : Infinity;

    function loop() {
        if (engine.abort || (Date.now() - start >= duration)) return;

        circle.className = "inhale";
        circle.textContent = "Inhala";

        safeTimeout(() => {
            if (forceHold) {
                circle.className = "hold";
                circle.textContent = "Retén";
            }
            safeTimeout(() => {
                circle.className = "exhale";
                circle.textContent = "Exhala";
                safeTimeout(loop, exhaleTime);
            }, forceHold ? holdTime : 0);
        }, inhaleTime);
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

/* ================= DATA & EXECUTION ================= */

async function loadSession() {
    try {
        const res = await fetch("/tvid_ejercicio.json");
        const data = await res.json();
        // Calculamos el ID según el día para rotación automática
        const diaDelAño = Math.floor((new Date() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
        const idHoy = (diaDelAño % 21) + 1;
        
        engine.session = data.sesiones.find(s => s.id === idHoy) || data.sesiones[0];
    } catch (e) {
        console.error("Error cargando sesiones:", e);
    }
}

async function runStep() {
    if (engine.locked) return;
    engine.locked = true;

    resetEngine();
    engine.abort = false;

    const step = engine.session?.bloques?.[userData.step];

    if (!step) {
        finish();
        return;
    }

    nextBtn.style.display = "inline-block";
    restartBtn.style.display = "inline-block";
    backBtn.style.display = "inline-block";

    if (step.textos?.length) {
        for (const t of step.textos) {
            const seconds = extractSeconds(t);
            const hold = hasHold(t);
            await speak(t);
            await typeText(t);
            if (/respira|inhala|exhala/i.test(t)) startBreathing(seconds, hold);
            await new Promise(r => safeTimeout(r, 400));
        }
    } else if (step.tipo === "decision") {
        await speak(step.pregunta);
        await typeText(step.pregunta);
        const box = document.createElement("div");
        step.opciones.forEach((opt, i) => {
            const btn = document.createElement("button");
            btn.className = "opt-btn";
            btn.textContent = opt;
            btn.onclick = async () => {
                const ok = i === step.correcta;
                const msg = (ok ? "Correcto. " : "Incorrecto. ") + step.explicacion;
                await speak(msg);
                await typeText(msg);
                if (ok) userData.disciplina += 5;
                save();
            };
            box.appendChild(btn);
        });
        block.appendChild(box);
    } else if (step.texto) {
        const seconds = extractSeconds(step.texto);
        const hold = hasHold(step.texto);
        await speak(step.texto);
        await typeText(step.texto);
        if (/respira|inhala|exhala/i.test(step.texto)) startBreathing(seconds, hold);
    }
    engine.locked = false;
}

async function finish() {
    block.innerHTML = "Sesión completada exitosamente. Te esperamos mañana.";
    userData.step = 0;
    save();
    engine.locked = false;
}

function save() {
    localStorage.setItem("maykamiData", JSON.stringify(userData));
}

/* ================= UI & GALERÍA ================= */

function initGallery() {
    gallery.innerHTML = "";
    for (let i = 0; i < 20; i++) {
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
    }, 7000);
}

/* ================= EVENTOS DE BOTONES ================= */

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

// Inicio de ciclo
checkAccess();
setInterval(checkAccess, 60000); 
save();
