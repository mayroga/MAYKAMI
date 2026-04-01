/* ============================================================
   MAYKAMI NEUROGAME ENGINE V9.5 - COMPLETO Y CORREGIDO
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
const isAdmin = urlParams.get('auth') === 'admin';
const isPagoOk = urlParams.get('pago') === 'exitoso';

/* ================= ACCESO ================= */

circle.onclick = () => {
    if (confirm("¿Ingresar como Administrador?")) window.location.href = "/admin";
};

function checkAccess() {
    if (isAdmin || isPagoOk) {
        if (isAdmin) block.innerHTML = "ACCESO ADMIN CONCEDIDO";
        startBtn.style.display = "inline-block";
        if (payBtn) payBtn.style.display = "none";
        return true;
    }

    const ahora = new Date();
    const h = ahora.getHours();
    const m = ahora.getMinutes();
    const esVentana = (h === 8 && m >= 50) || (h === 9 && m <= 15) || (h === 20 && m >= 50) || (h === 21 && m <= 15);

    if (!esVentana) {
        block.innerHTML = "SISTEMA CERRADO.<br><small>Apertura: 9:00 AM/PM.</small>";
        startBtn.style.display = "none";
        if (payBtn) payBtn.style.display = "none";
        return false;
    }

    block.innerHTML = "TAQUILLA ABIERTA.";
    startBtn.style.display = "none";
    if (payBtn) payBtn.style.display = "inline-block";
    return false;
}

/* ================= AUDIO & VOZ ================= */

const bgMusic = new Audio("https://www.soundhelix.com/examples/mp3/SoundHelix-Song-15.mp3");
bgMusic.loop = true;
bgMusic.volume = 0.04; 

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

/* ================= ENGINE CORE ================= */

let engine = { locked: false, abort: false, timers: new Set(), session: null };
let userData = JSON.parse(localStorage.getItem("maykamiData")) || { step: 0, disciplina: 40 };

function safeTimeout(fn, t) {
    const id = setTimeout(() => { engine.timers.delete(id); fn(); }, t);
    engine.timers.add(id);
}

function resetEngine() {
    engine.abort = true;
    window.speechSynthesis.cancel();
    engine.timers.forEach(t => clearTimeout(t));
    engine.timers.clear();
    startBreathing(null, false);
}

function extractSeconds(text) {
    const match = text.match(/(\d{1,3})\s*(segundos|seg|s)/i);
    return match ? parseInt(match[1]) : null;
}

function startBreathing(seconds = null, forceHold = false) {
    clearInterval(engine.breathLoop);
    const cycle = 3400; 
    const start = Date.now();
    const duration = seconds ? seconds * 1000 : Infinity;

    function loop() {
        if (engine.abort || (Date.now() - start >= duration)) return;
        circle.className = "inhale"; circle.textContent = "Inhala";
        safeTimeout(() => {
            if (forceHold) { circle.className = "hold"; circle.textContent = "Retén"; }
            safeTimeout(() => {
                circle.className = "exhale"; circle.textContent = "Exhala";
                safeTimeout(loop, cycle * 0.4);
            }, forceHold ? cycle * 0.2 : 0);
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
        const diaAnio = Math.floor((new Date() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
        const idHoy = (diaAnio % 21) + 1;
        engine.session = data.sesiones.find(s => s.id === idHoy) || data.sesiones[0];
        console.log("Sesión cargada ID:", engine.session.id);
    } catch (e) { console.error("Error JSON:", e); }
}

async function runStep() {
    if (engine.locked) return;
    engine.locked = true;
    resetEngine();
    engine.abort = false;

    const step = engine.session?.bloques?.[userData.step];
    if (!step) { finish(); return; }

    nextBtn.style.display = "inline-block";
    backBtn.style.display = "inline-block";

    // Lógica para bloques con array de textos (como tvid_ejercicio_largo)
    if (step.textos && step.textos.length > 0) {
        for (const t of step.textos) {
            if (engine.abort) break;
            const sec = extractSeconds(t);
            const hold = t.toLowerCase().includes("retén") || t.toLowerCase().includes("retiene");
            await speak(t);
            await typeText(t);
            if (/respira|inhala|exhala/i.test(t)) startBreathing(sec || 8, hold);
            await new Promise(r => safeTimeout(r, 800));
        }
    } 
    // Lógica para bloques con un solo texto (voz, tvid, respiracion)
    else if (step.texto) {
        const sec = extractSeconds(step.texto);
        const hold = step.texto.toLowerCase().includes("retén") || step.texto.toLowerCase().includes("retiene");
        await speak(step.texto);
        await typeText(step.texto);
        if (/respira|inhala|exhala/i.test(step.texto)) startBreathing(sec || step.duracion || 8, hold);
    }
    // Lógica para decisiones
    else if (step.tipo === "decision") {
        await speak(step.pregunta);
        await typeText(step.pregunta);
        const box = document.createElement("div");
        box.className = "decision-box";
        step.opciones.forEach((opt, i) => {
            const btn = document.createElement("button");
            btn.className = "opt-btn";
            btn.textContent = opt;
            btn.onclick = async () => {
                const isOk = i === step.correcta;
                const feedback = (isOk ? "Correcto. " : "Incorrecto. ") + step.explicacion;
                await speak(feedback);
                await typeText(feedback);
                if (isOk) userData.disciplina += 5;
                save();
            };
            box.appendChild(btn);
        });
        block.appendChild(box);
    }
    
    engine.locked = false;
}

function finish() {
    block.innerHTML = "Sesión diaria completada exitosamente.";
    userData.step = 0; save();
    engine.locked = false;
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
        if(all[slideIndex]) all[slideIndex].classList.add("active");
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
if (payBtn) payBtn.onclick = async () => {
    block.innerHTML = "Iniciando pago...";
    const res = await fetch("/checkout", { method: "POST" });
    const data = await res.json();
    if (data.url) window.location.href = data.url; else alert(data.error);
};

checkAccess();
setInterval(checkAccess, 60000);
