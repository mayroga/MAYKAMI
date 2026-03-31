/* ============================================================
   MAYKAMI NEUROGAME ENGINE BY MAY ROGA LLC
============================================================ */

/* =========================
   ELEMENTOS
========================= */

const gallery = document.getElementById("visual-gallery");
const circle = document.getElementById("visual-circle");
const block = document.getElementById("block");

const startBtn = document.getElementById("start-btn");
const nextBtn = document.getElementById("next-btn");
const backBtn = document.getElementById("back-btn");
const restartBtn = document.getElementById("restart-btn");

const audio = document.getElementById("nature-audio");

/* =========================
   ESTADO GLOBAL
========================= */

let sesiones = [];
let current = 0;
let isRunning = false;
let breathingInterval = null;

/* =========================
   SESIÓN DEMO (PUEDES REEMPLAZAR POR JSON REAL)
========================= */

sesiones = [
    {
        tipo: "intro",
        texto: "Bienvenido a la sesión NeuroGame. Vamos a sincronizar mente y respiración.",
        respiracion: false,
        duracion: 4000
    },
    {
        tipo: "respiracion",
        texto: "Inhala lentamente...",
        respiracion: true,
        fase: "inhale",
        duracion: 4000
    },
    {
        tipo: "respiracion",
        texto: "Mantén el aire...",
        respiracion: true,
        fase: "hold",
        duracion: 3000
    },
    {
        tipo: "respiracion",
        texto: "Exhala suavemente...",
        respiracion: true,
        fase: "exhale",
        duracion: 5000
    },
    {
        tipo: "reflexion",
        texto: "Observa cómo tu mente se vuelve más clara.",
        respiracion: false,
        duracion: 5000
    }
];

/* =========================
   INICIO
========================= */

startBtn.addEventListener("click", () => {
    isRunning = true;

    startBtn.style.display = "none";
    nextBtn.style.display = "inline-block";
    backBtn.style.display = "inline-block";
    restartBtn.style.display = "inline-block";

    if (audio) {
        audio.volume = 0.25;
        audio.play().catch(() => {});
    }

    current = 0;
    renderBlock();
});

/* =========================
   BOTONES
========================= */

nextBtn.addEventListener("click", () => {
    if (current < sesiones.length - 1) {
        current++;
        renderBlock();
    }
});

backBtn.addEventListener("click", () => {
    if (current > 0) {
        current--;
        renderBlock();
    }
});

restartBtn.addEventListener("click", () => {
    resetSession();
});

/* =========================
   RESET
========================= */

function resetSession() {
    current = 0;
    isRunning = false;

    clearBreathing();

    circle.className = "";
    block.innerText = "Bienvenido a la Asesoría NeuroGame";

    startBtn.style.display = "inline-block";
    nextBtn.style.display = "none";
    backBtn.style.display = "none";
    restartBtn.style.display = "none";

    if (audio) {
        audio.pause();
        audio.currentTime = 0;
    }
}

/* =========================
   RENDER BLOQUE
========================= */

function renderBlock() {
    clearBreathing();

    const data = sesiones[current];

    if (!data) return;

    block.innerText = data.texto;

    if (data.respiracion) {
        startBreathing(data.fase, data.duracion);
    }
}

/* =========================
   RESPIRACIÓN CONTROLADA
========================= */

function startBreathing(fase, duration) {
    circle.className = "";

    applyBreath(fase);

    breathingInterval = setInterval(() => {
        applyBreath(fase);
    }, duration);
}

function applyBreath(fase) {
    circle.classList.remove("inhale", "exhale", "hold");

    if (fase === "inhale") {
        circle.classList.add("inhale");
        circle.innerText = "INHALA";
    }

    if (fase === "hold") {
        circle.classList.add("hold");
        circle.innerText = "RETÉN";
    }

    if (fase === "exhale") {
        circle.classList.add("exhale");
        circle.innerText = "EXHALA";
    }
}

/* =========================
   LIMPIAR RESPIRACIÓN
========================= */

function clearBreathing() {
    if (breathingInterval) {
        clearInterval(breathingInterval);
        breathingInterval = null;
    }
}

/* =========================
   AUTO AVANCE (OPCIONAL FUTURO)
========================= */

function autoAdvance() {
    if (!isRunning) return;

    setTimeout(() => {
        if (current < sesiones.length - 1) {
            current++;
            renderBlock();
        }
    }, sesiones[current].duracion);
}

/* =========================
   SEGURIDAD BOTONES
========================= */

function lockButtons(state) {
    nextBtn.disabled = state;
    backBtn.disabled = state;
}
