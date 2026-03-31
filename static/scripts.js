"use strict";

/* =========================
   MAYKAMI V8 + PRO SECURITY PATCH
========================= */

const gallery = document.getElementById("visual-gallery");
const circle = document.getElementById("visual-circle");
const block = document.getElementById("block");

const startBtn = document.getElementById("start-btn");
const nextBtn = document.getElementById("next-btn");
const backBtn = document.getElementById("back-btn");
const restartBtn = document.getElementById("restart-btn");

const bgMusic = new Audio("https://cdn.pixabay.com/download/audio/2022/03/15/audio_c8c8a73467.mp3");
bgMusic.loop = true;
bgMusic.volume = 0.06;

function playMusic() {
    bgMusic.play().catch(() => {
        document.body.addEventListener("click", () => bgMusic.play(), { once: true });
    });
}

/* =========================
   ENGINE ORIGINAL
========================= */

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

let userEmail = localStorage.getItem("maykami_email");
let accessGranted = false;

/* =========================
   SAFE TIMER
========================= */

function safeTimeout(fn, t) {
    const id = setTimeout(() => {
        engine.timers.delete(id);
        fn();
    }, t);
    engine.timers.add(id);
}

/* =========================
   RESET
========================= */

function resetEngine() {
    engine.abort = true;
    window.speechSynthesis.cancel();

    engine.timers.forEach(t => clearTimeout(t));
    engine.timers.clear();

    block.innerHTML = "";
}

/* =========================
   SPEAK
========================= */

function speak(text) {
    return new Promise(resolve => {
        window.speechSynthesis.cancel();

        const utter = new SpeechSynthesisUtterance(text.replace(/<[^>]*>/g, ""));
        utter.lang = "es-ES";
        utter.rate = 0.92;

        utter.onend = resolve;
        utter.onerror = resolve;

        window.speechSynthesis.speak(utter);
    });
}

/* =========================
   BREATH
========================= */

function startBreathing() {
    clearInterval(engine.breathLoop);

    const cycle = 3400;
    const inhale = cycle * 0.4;
    const hold = cycle * 0.2;
    const exhale = cycle * 0.4;

    function loop() {
        if (engine.abort) return;

        circle.className = "inhale";
        circle.textContent = "Inhala";

        safeTimeout(() => {
            circle.className = "exhale";
            circle.textContent = "Exhala";
            safeTimeout(loop, exhale);
        }, inhale + hold);
    }

    loop();
}

/* =========================
   TYPE TEXT
========================= */

async function typeText(text) {
    block.innerHTML = "";

    for (let i = 0; i < text.length; i++) {
        if (engine.abort) return;
        block.innerHTML += text[i];
        await new Promise(r => safeTimeout(r, 12));
    }
}

/* =========================
   LOAD SESSION
========================= */

async function loadSession() {
    const res = await fetch("/tvid_ejercicio.json");
    const data = await res.json();

    engine.session =
        data.sesiones.find(s => s.id === userData.sessionId)
        || data.sesiones[0];
}

/* =========================
   VERIFY ACCESS (PRO PATCH)
========================= */

async function verifyAccess() {
    if (!userEmail) return;

    const res = await fetch(`/verify-access?email=${encodeURIComponent(userEmail)}`);
    const data = await res.json();

    accessGranted = data.paid === true;
}

/* =========================
   CORE
========================= */

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

    if (step.textos?.length) {
        for (const t of step.textos) {
            await speak(t);
            await typeText(t);

            if (t.includes("respira") || t.includes("inhala") || t.includes("exhala")) {
                startBreathing();
            }
        }
    }

    else if (step.texto) {
        await speak(step.texto);
        await typeText(step.texto);

        if (step.texto.includes("respira")) {
            startBreathing();
        }
    }

    else if (step.tipo === "decision") {

        await speak(step.pregunta);
        await typeText(step.pregunta);

        const box = document.createElement("div");

        step.opciones.forEach((opt, i) => {
            const btn = document.createElement("button");
            btn.textContent = opt;

            btn.onclick = async () => {
                const ok = i === step.correcta;

                const msg = ok
                    ? "Correcto. " + step.explicacion
                    : "Incorrecto. " + step.explicacion;

                await speak(msg);
                await typeText(msg);

                if (ok) userData.disciplina += 5;

                save();
            };

            box.appendChild(btn);
        });

        block.appendChild(box);
    }

    engine.locked = false;
}

/* =========================
   FIN
========================= */

async function finish() {
    block.innerHTML = "Sesión completada";

    userData.sessionId++;
    userData.step = 0;

    save();
    await loadSession();
}

/* =========================
   SAVE
========================= */

function save() {
    localStorage.setItem("maykamiData", JSON.stringify(userData));
}

/* =========================
   BUTTONS + PRO SECURITY
========================= */

startBtn.onclick = async () => {

    await verifyAccess();

    if (!accessGranted) {
        alert("Acceso bloqueado");
        return;
    }

    startBtn.style.display = "none";

    playMusic();

    userData.step = 0;

    await loadSession();

    runStep();
};

nextBtn.onclick = () => {
    userData.step++;
    save();
    runStep();
};

backBtn.onclick = () => {
    if (userData.step > 0) userData.step--;
    save();
    runStep();
};

restartBtn.onclick = () => {
    userData.step = 0;
    save();
    runStep();
};
