/* ============================================================
   MAYKAMI NEUROGAME ENGINE - V8.8 STABLE (ADMIN & TIME READY)
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

/* ================= LÓGICA DE ACCESO TEMPORAL ================= */

function checkAccess() {
    if (isAdmin) {
        block.innerHTML = "MODO ADMINISTRADOR: Acceso libre activado.";
        payBtn.style.display = "none";
        startBtn.style.display = "inline-block";
        return true;
    }

    const ahora = new Date();
    const h = ahora.getHours();
    const m = ahora.getMinutes();

    // Ventanas: 9:00-9:15 y 21:00-21:15
    const esAM = (h === 9 && m <= 15);
    const esPM = (h === 21 && m <= 15);

    if (isPagoOk) {
        payBtn.style.display = "none";
        startBtn.style.display = "inline-block";
        return true;
    }

    if (!esAM && !esPM) {
        block.innerHTML = "SISTEMA CERRADO.<br><small>Próxima apertura: 9:00 AM / 9:00 PM (Acceso limitado a 15 min).</small>";
        payBtn.style.display = "none";
        startBtn.style.display = "none";
        return false;
    }

    payBtn.style.display = "inline-block";
    startBtn.style.display = "none";
    return false;
}

/* ================= PASARELA DE PAGO ================= */

async function iniciarPago() {
    block.innerHTML = "Verificando disponibilidad de cupo...";
    try {
        const response = await fetch("/checkout", { method: "POST" });
        const data = await response.json();
        if (data.url) {
            window.location.href = data.url;
        } else {
            alert(data.error);
            block.innerHTML = data.error;
        }
    } catch (err) {
        console.error("Stripe Error:", err);
    }
}

/* ================= ENGINE CORE ================= */

let engine = { locked: false, abort: false, timers: new Set(), session: null };
let userData = JSON.parse(localStorage.getItem("maykamiData")) || { sessionId: 1, step: 0 };
let slideIndex = 0;

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
        utter.pitch = 0.95;
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
        engine.session = data.sesiones[0]; // El servidor filtra la sesión del día
    } catch (e) { console.error("Load Error:", e); }
}

async function runStep() {
    if (engine.locked) return;
    engine.locked = true;
    resetEngine();
    engine.abort = false;

    const step = engine.session?.bloques?.[userData.step];
    if (!step) { 
        block.innerHTML = "Sesión diaria finalizada. Regresa mañana para el nuevo contenido.";
        userData.step = 0; save(); return; 
    }

    nextBtn.style.display = "inline-block";
    backBtn.style.display = "inline-block";

    if (step.textos) {
        for (const t of step.textos) {
            await speak(t); await typeText(t);
            if (/respira|inhala|exhala/i.test(t)) startBreathing(12, t.includes("retén"));
            await new Promise(r => safeTimeout(r, 500));
        }
    }
    engine.locked = false;
}

function save() { localStorage.setItem("maykamiData", JSON.stringify(userData)); }

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

nextBtn.onclick = () => { userData.step++; save(); runStep(); };
backBtn.onclick = () => { if (userData.step > 0) userData.step--; save(); runStep(); };
restartBtn.onclick = () => { userData.step = 0; save(); runStep(); };

// Verificación inicial y cíclica
checkAccess();
setInterval(checkAccess, 60000);
