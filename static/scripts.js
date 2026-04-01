/* ============================================================
   MAYKAMI NEUROGAME ENGINE - V10.0 (FULL ACCESS RESTORED)
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

let engine = { locked: false, abort: false, timers: new Set(), session: null };
let userData = { step: 0 };
let slideIndex = 0;

const bgMusic = new Audio("https://www.soundhelix.com/examples/mp3/SoundHelix-Song-15.mp3");
bgMusic.loop = true;
bgMusic.volume = 0.05;

/* ================= CONTROL DE INTERFAZ ================= */

function checkAccess() {
    if (isAdmin) {
        block.innerHTML = "ADMINISTRADOR RECONOCIDO.<br><small>Pulse INICIAR para probar el sistema.</small>";
        payBtn.style.display = "none";
        startBtn.style.display = "inline-block";
        return true;
    }

    if (isPagoOk) {
        payBtn.style.display = "none";
        startBtn.style.display = "inline-block";
        block.innerHTML = "Acceso Premium Concedido.";
        return true;
    }

    const h = new Date().getHours();
    const m = new Date().getMinutes();
    const esAM = (h === 8 && m >= 50) || (h === 9 && m <= 15);
    const esPM = (h === 20 && m >= 50) || (h === 21 && m <= 15);

    if (!esAM && !esPM) {
        block.innerHTML = "SISTEMA CERRADO.<br><small>9:00 AM/PM (Cobro 10 min antes).</small>";
        payBtn.style.display = "none";
        startBtn.style.display = "none";
        return false;
    }

    block.innerHTML = "SISTEMA ABIERTO.<br><small>Adquiera su acceso para participar.</small>";
    payBtn.style.display = "inline-block";
    startBtn.style.display = "none";
    return false;
}

circle.onclick = () => { if(!isAdmin) window.location.href = "/admin"; };

/* ================= FUNCIONES DEL MOTOR ================= */

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
        utter.rate = 0.9;
        utter.onend = resolve;
        utter.onerror = resolve;
        window.speechSynthesis.speak(utter);
    });
}

function startBreathing(seconds = null, hold = false) {
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

async function runStep() {
    if (engine.locked) return;
    engine.locked = true;
    resetEngine();
    engine.abort = false;

    const step = engine.session?.bloques?.[userData.step];
    if (!step) { 
        block.innerHTML = "Sesión finalizada."; 
        userData.step = 0; 
        engine.locked = false;
        return; 
    }

    nextBtn.style.display = "inline-block";
    backBtn.style.display = "inline-block";

    if (step.textos) {
        for (const t of step.textos) {
            await speak(t); await typeText(t);
            if (/respira|inhala|exhala/i.test(t)) startBreathing(10, t.includes("retén"));
            await new Promise(r => safeTimeout(r, 600));
        }
    }
    engine.locked = false;
}

function initGallery() {
    gallery.innerHTML = "";
    for (let i = 0; i < 10; i++) {
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

/* ================= EVENTOS PRINCIPALES ================= */

startBtn.onclick = async () => {
    startBtn.style.display = "none";
    bgMusic.play().catch(() => {});
    initGallery();
    const res = await fetch("/tvid_ejercicio.json");
    const data = await res.json();
    engine.session = data.sesiones[0];
    runStep();
};

nextBtn.onclick = () => { userData.step++; runStep(); };
backBtn.onclick = () => { if (userData.step > 0) userData.step--; runStep(); };
restartBtn.onclick = () => { userData.step = 0; runStep(); };

payBtn.onclick = () => iniciarPago();

async function iniciarPago() {
    block.innerHTML = "Cargando Stripe...";
    const res = await fetch("/checkout", { method: "POST" });
    const data = await res.json();
    if (data.url) window.location.href = data.url; else alert(data.error);
}

checkAccess();
