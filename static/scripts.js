/* ============================================================
   MAYKAMI NEUROGAME ENGINE V9 - NEURO SYNC BREATHING CORE
============================================================ */

const circle = document.getElementById("visual-circle");
const block = document.getElementById("block");

/* ================= ENGINE ================= */

let engine = {
    locked: false,
    abort: false,
    timers: new Set()
};

/* ================= SAFE TIMER ================= */

function safeTimeout(fn, t) {
    const id = setTimeout(() => {
        engine.timers.delete(id);
        fn();
    }, t);
    engine.timers.add(id);
}

/* ================= CLEAN TEXT ================= */

function cleanUI() {
    block.innerHTML = "";
}

/* ================= VOZ SIN DESFASE ================= */

function speak(text) {
    return new Promise(resolve => {

        window.speechSynthesis.cancel(); // 🔥 elimina voz anterior

        const utter = new SpeechSynthesisUtterance(text);
        utter.lang = "es-ES";
        utter.rate = 0.92;

        utter.onend = resolve;
        utter.onerror = resolve;

        window.speechSynthesis.speak(utter);
    });
}

/* ================= DETECTAR TIEMPO REAL ================= */

function extractSeconds(text) {

    const match = text.match(/(\d{1,3})\s*(segundos|seg|s)/i);

    if (match) return parseInt(match[1]);

    return null;
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

/* ================= RESPIRACIÓN FISIOLÓGICA REAL ================= */

function startBreathing(seconds = null, forceHold = false) {

    engine.abort = false;

    cleanUI();

    const cycleTime = 3000; // 🔥 base fisiológica ~20 ciclos/min

    let inhaleTime = cycleTime * 0.4;
    let holdTime   = cycleTime * 0.2;
    let exhaleTime = cycleTime * 0.4;

    let start = Date.now();
    let duration = seconds ? seconds * 1000 : Infinity;

    function cycle() {

        if (engine.abort) return;

        let elapsed = Date.now() - start;
        if (elapsed >= duration) return;

        /* INHALE */
        circle.className = "inhale";
        circle.textContent = "Inhala";

        safeTimeout(() => {

            /* HOLD SOLO SI EXISTE */
            if (forceHold) {
                circle.className = "hold";
                circle.textContent = "Retén";
            }

            safeTimeout(() => {

                /* EXHALE */
                circle.className = "exhale";
                circle.textContent = "Exhala";

                safeTimeout(cycle, exhaleTime);

            }, forceHold ? holdTime : 0);

        }, inhaleTime);
    }

    cycle();
}

/* ================= PROCESAR TEXTO ================= */

async function processStep(text) {

    cleanUI();

    /* 🔥 1. DETECTAR TIEMPO REAL */
    const seconds = extractSeconds(text);

    /* 🔥 2. DETECTAR RETÉN */
    const hold = hasHold(text);

    /* 🔥 3. VOZ SIEMPRE PRIMERO */
    await speak(text);

    /* 🔥 4. TEXTO SIN DESFASE */
    block.innerHTML = text;

    /* 🔥 5. RESPIRACIÓN SOLO SI APLICA */
    if (text.toLowerCase().includes("respira") ||
        text.toLowerCase().includes("inhala") ||
        text.toLowerCase().includes("exhala")) {

        startBreathing(seconds, hold);
    }
}

/* ================= EJEMPLO DE USO ================= */

async function runDemo() {

    await processStep("Respira durante 17 segundos, inhala profundo y exhala suave.");

    await processStep("Ahora relájate y escucha sin respiración guiada.");

    await processStep("Respira 12 segundos y mantén el control de tu aire.");
}

runDemo();
