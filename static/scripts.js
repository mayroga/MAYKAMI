/* ============================================================
   MAYKAMI NEUROGAME ENGINE - ACTUALIZADO: REGLAS 9AM/9PM
============================================================ */

const gallery = document.getElementById("visual-gallery");
const circle = document.getElementById("visual-circle");
const block = document.getElementById("block");

const startBtn = document.getElementById("start-btn");
const nextBtn = document.getElementById("next-btn");
const backBtn = document.getElementById("back-btn");
const restartBtn = document.getElementById("restart-btn");
const payBtn = document.getElementById("pay-btn");

const urlParams = new URLSearchParams(window.location.search);
const isAdmin = urlParams.get('admin') === 'true';
const pagoExitoso = urlParams.get('pago') === 'exitoso';

/* ================= VALIDACIÓN DE ACCESO ================= */

function verificarHorario() {
    if (isAdmin) return true; // El admin salta las reglas de tiempo

    const ahora = new Date();
    const h = ahora.getHours();
    const m = ahora.getMinutes();

    const esVentanaAM = (h === 9 && m <= 15);
    const esVentanaPM = (h === 21 && m <= 15);

    if (!esVentanaAM && !esVentanaPM && !pagoExitoso) {
        block.innerHTML = "SISTEMA CERRADO<br><small>Próxima sesión: 9:00 AM y 9:00 PM (Ventana de 15 min)</small>";
        startBtn.style.display = "none";
        payBtn.style.display = "inline-block";
        return false;
    }
    
    if (pagoExitoso || isAdmin) {
        payBtn.style.display = "none";
        startBtn.style.display = "inline-block";
    }
    return true;
}

/* ================= SISTEMA DE PAGO ================= */

async function iniciarPago() {
    block.innerHTML = "Validando cupo y horario...";
    try {
        const response = await fetch("/checkout", { method: "POST" });
        const data = await response.json();
        if (data.url) {
            window.location.href = data.url;
        } else {
            alert(data.error || "Error en el servidor de pagos.");
            block.innerHTML = data.error || "Intente en el próximo turno.";
        }
    } catch (err) {
        console.error("Error Stripe:", err);
    }
}

/* ================= ENGINE CORE ================= */

let engine = { locked: false, abort: false, timers: new Set(), session: null };
let userData = JSON.parse(localStorage.getItem("maykamiData")) || { sessionId: 1, step: 0, disciplina: 40 };
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
    block.innerHTML = "";
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

function startBreathing(seconds = null, forceHold = false) {
    clearInterval(engine.breathLoop);
    const cycle = 3400; 
    const inhaleTime = cycle * 0.4;
    const holdTime = cycle * 0.2;
    const exhaleTime = cycle * 0.4;
    const start = Date.now();
    const duration = seconds ? seconds * 1000 : Infinity;

    function loop() {
        if (engine.abort || (Date.now() - start >= duration)) return;
        circle.className = "inhale";
        circle.textContent = "Inhala";
        safeTimeout(() => {
            if (forceHold) { circle.className = "hold"; circle.textContent = "Retén"; }
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

async function loadSession() {
    try {
        const res = await fetch("/tvid_ejercicio.json");
        const data = await res.json();
        // El servidor ya devuelve la sesión única del día
        engine.session = data.sesiones[0];
    } catch (e) { console.error("Error:", e); }
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

    if (step.textos) {
        for (const t of step.textos) {
            await speak(t); await typeText(t);
            if (/respira|inhala|exhala/i.test(t)) startBreathing(10, t.includes("retén"));
            await new Promise(r => safeTimeout(r, 400));
        }
    } else if (step.texto) {
        await speak(step.texto); await typeText(step.texto);
    }
    engine.locked = false;
}

function finish() {
    block.innerHTML = "Sesión diaria completada. Te esperamos mañana 9:00 AM.";
    userData.step = 0;
    save();
}

function save() { localStorage.setItem("maykamiData", JSON.stringify(userData)); }

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

/* ================= EVENTOS ================= */

startBtn.onclick = async () => {
    if (!verificarHorario()) return;
    startBtn.style.display = "none";
    bgMusic.play();
    initGallery();
    await loadSession();
    runStep();
};

nextBtn.onclick = () => { userData.step++; save(); runStep(); };
backBtn.onclick = () => { if (userData.step > 0) userData.step--; save(); runStep(); };
restartBtn.onclick = () => { userData.step = 0; save(); runStep(); };

// Verificación inicial
verificarHorario();
setInterval(verificarHorario, 30000); // Re-verificar cada 30 segundos
