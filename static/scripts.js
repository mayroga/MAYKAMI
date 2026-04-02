/* ============================================================
   MAYKAMI NEUROGAME ENGINE V8.5 - FULL RESTORED
   URL: https://maykami.onrender.com
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

/* ================= ACCESO Y SEGURIDAD ================= */

circle.onclick = () => {
    if (confirm("¿Ingresar como Administrador?")) {
        window.location.href = "/admin";
    }
};

function checkAccess() {
    if (isAdmin || isPagoOk) {
        if (isAdmin) block.innerHTML = "SISTEMA DESBLOQUEADO (ADMIN)";
        startBtn.style.display = "inline-block";
        if (payBtn) payBtn.style.display = "none";
        return true;
    }

    const ahora = new Date();
    const h = ahora.getHours();
    const m = ahora.getMinutes();
    const esVentana = (h === 8 && m >= 50) || (h === 9 && m <= 15) || (h === 20 && m >= 50) || (h === 21 && m <= 15);

    if (!esVentana) {
        block.innerHTML = "SISTEMA CERRADO.<br><small>Apertura: 9:00 AM/PM (Cobro 10 min antes).</small>";
        startBtn.style.display = "none";
        if (payBtn) payBtn.style.display = "none";
        return false;
    }

    block.innerHTML = "TAQUILLA ABIERTA.<br><small>Adquiera su acceso para comenzar.</small>";
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
            alert(data.error || "Error en el pago.");
        }
    } catch (err) { console.error("Error Stripe:", err); }
}

/* ================= AUDIO ANTI-STRESS ================= */

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

function startBreathing(seconds = null, forceHold = false) {
    clearInterval(engine.breathLoop);
    const cycle = 3400;
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

/* ================= DATA EXECUTION ================= */

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

    if (step.textos?.length) {
        for (const t of step.textos) {
            if (engine.abort) break;

            const sec = extractSeconds(t);
            const hold = t.toLowerCase().includes("retén") || t.toLowerCase().includes("retiene");

            await speak(t);
            await typeText(t);

            if (/respira|inhala|exhala/i.test(t)) startBreathing(sec || 8, hold);

            await new Promise(r => safeTimeout(r, 600));
        }
    } else if (step.tipo === "decision") {
        await speak(step.pregunta);
        await typeText(step.pregunta);

        const box = document.createElement("div");
        box.className = "decision-box";

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
        const sec = extractSeconds(step.texto);
        const hold = step.texto.toLowerCase().includes("retén") || step.texto.toLowerCase().includes("retiene");

        await speak(step.texto);
        await typeText(step.texto);

        if (/respira|inhala|exhala/i.test(step.texto)) startBreathing(sec || 8, hold);
    }

    engine.locked = false;
}

function finish() {
    block.innerHTML = "Sesión completada exitosamente. Hasta mañana.";
    userData.step = 0;
    save();
    engine.locked = false;
}

function save() {
    localStorage.setItem("maykamiData", JSON.stringify(userData));
}

/* ================= UI & GALERÍA VISUAL ================= */

function initGallery() {
    gallery.innerHTML = "";

    for (let i = 0; i < 20; i++) {
        const div = document.createElement("div");
        div.className = "slide";

        // 🔥 IMAGEN MÁS CLARA Y SUAVE
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

/* ================= EVENTOS ================= */

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

checkAccess();
setInterval(checkAccess, 60000);
save();
