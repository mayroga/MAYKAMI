/* ============================================================
   MAYKAMI NEUROGAME ENGINE V8 FIX STABLE FINAL
============================================================ */

const gallery = document.getElementById("visual-gallery");
const circle = document.getElementById("visual-circle");
const block = document.getElementById("block");

const startBtn = document.getElementById("start-btn");
const nextBtn = document.getElementById("next-btn");
const backBtn = document.getElementById("back-btn");
const restartBtn = document.getElementById("restart-btn");

/* ================= AUDIO (FIX MÓVIL) ================= */

const bgMusic = new Audio("https://cdn.pixabay.com/download/audio/2022/03/15/audio_c8c8a73467.mp3");
bgMusic.loop = true;
bgMusic.volume = 0.06;

function playMusic() {
    bgMusic.play().catch(() => {
        document.body.addEventListener("click", () => {
            bgMusic.play();
        }, { once: true });
    });
}

/* ================= ENGINE ================= */

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

/* ================= SAFE TIMER ================= */

function safeTimeout(fn, t) {
    const id = setTimeout(() => {
        engine.timers.delete(id);
        fn();
    }, t);
    engine.timers.add(id);
}

/* ================= RESET ================= */

function resetEngine() {

    engine.abort = true;

    window.speechSynthesis.cancel();

    engine.timers.forEach(t => clearTimeout(t));
    engine.timers.clear();

    block.innerHTML = "";

    startBreathing(null, false);
}

/* ================= VOZ ================= */

function speak(text) {
    return new Promise(resolve => {

        window.speechSynthesis.cancel();

        const utter = new SpeechSynthesisUtterance(
            text.replace(/<[^>]*>/g, "")
        );

        utter.lang = "es-ES";
        utter.rate = 0.92;

        utter.onend = resolve;
        utter.onerror = resolve;

        window.speechSynthesis.speak(utter);
    });
}

/* ================= TIMER EXACTO DESDE TEXTO ================= */

function extractSeconds(text) {
    const match = text.match(/(\d{1,3})\s*(segundos|seg|s)/i);
    return match ? parseInt(match[1]) : null;
}

/* ================= DETECTAR RETÉN ================= */

function hasHold(text) {
    const t = text.toLowerCase();
    return (
        t.includes("reten") ||
        t.includes("retener") ||
        t.includes("pausa") ||
        t.includes("hold")
    );
}

/* ================= RESPIRACIÓN ================= */

function startBreathing(seconds = null, forceHold = false) {

    clearInterval(engine.breathLoop);

    const cycle = 3400;
    const inhaleTime = cycle * 0.4;
    const holdTime   = cycle * 0.2;
    const exhaleTime = cycle * 0.4;

    const start = Date.now();
    const duration = seconds ? seconds * 1000 : Infinity;

    function loop() {

        if (engine.abort) return;
        if (Date.now() - start >= duration) return;

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

/* ================= RESTO DE TU ENGINE (NO TOCADO) ================= */

/* ... TODO TU CÓDIGO SIGUE IGUAL ... */

/* ================= STRIPE PAGO (AGREGADO) ================= */

async function pagar() {
    try {
        const res = await fetch("/create-checkout-session", {
            method: "POST"
        });

        const data = await res.json();

        if (data.url) {
            window.location.href = data.url;
        } else {
            alert("Error creando pago");
        }

    } catch (err) {
        console.error(err);
        alert("Error con Stripe");
    }
}
