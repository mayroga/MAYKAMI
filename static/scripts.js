/* ============================================================
   MAYKAMI NEUROGAME ENGINE - STABLE FULL VERSION
   FIXED: freeze, audio, breathing, flow, buttons, gallery
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
   ESTADO
========================= */

let sesiones = [];
let current = 0;
let running = false;

let breathTimer = null;
let autoTimer = null;
let galleryTimer = null;

/* =========================
   GALERÍA DINÁMICA (RESTORED)
========================= */

const backgrounds = [
    "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee",
    "https://images.unsplash.com/photo-1441974231531-c6227db76b6e",
    "https://images.unsplash.com/photo-1501785888041-af3ef285b470",
    "https://images.unsplash.com/photo-1507525428034-b723cf961d3e"
];

function initGallery() {
    gallery.innerHTML = "";

    backgrounds.forEach((img, i) => {
        const div = document.createElement("div");
        div.className = "slide" + (i === 0 ? " active" : "");
        div.style.backgroundImage = `url('${img}')`;
        gallery.appendChild(div);
    });

    let index = 0;

    galleryTimer = setInterval(() => {
        const slides = document.querySelectorAll(".slide");
        slides.forEach(s => s.classList.remove("active"));

        index = (index + 1) % slides.length;
        slides[index].classList.add("active");
    }, 6000);
}

/* =========================
   SESIONES BASE (NO ROMPER)
========================= */

sesiones = [
    {
        texto: "Bienvenido a MAYKAMI NeuroGame. Iniciando sincronización.",
        respiracion: false,
        tiempo: 4000
    },
    {
        texto: "Inhala profundamente...",
        respiracion: true,
        fase: "inhale",
        tiempo: 4000
    },
    {
        texto: "Mantén el aire...",
        respiracion: true,
        fase: "hold",
        tiempo: 3000
    },
    {
        texto: "Exhala lentamente...",
        respiracion: true,
        fase: "exhale",
        tiempo: 5000
    },
    {
        texto: "Relaja tu mente. Estás en control.",
        respiracion: false,
        tiempo: 5000
    }
];

/* =========================
   INICIO
========================= */

startBtn.addEventListener("click", () => {
    running = true;
    current = 0;

    startBtn.style.display = "none";
    nextBtn.style.display = "inline-block";
    backBtn.style.display = "inline-block";
    restartBtn.style.display = "inline-block";

    initGallery();

    startAudio();

    render();
});

/* =========================
   AUDIO (FIX REAL)
========================= */

function startAudio() {
    if (!audio) return;

    audio.volume = 0.2;

    const playPromise = audio.play();

    if (playPromise !== undefined) {
        playPromise.catch(() => {
            console.log("Audio bloqueado por navegador hasta interacción");
        });
    }
}

/* =========================
   BOTONES
========================= */

nextBtn.onclick = () => {
    if (current < sesiones.length - 1) {
        current++;
        render();
    }
};

backBtn.onclick = () => {
    if (current > 0) {
        current--;
        render();
    }
};

restartBtn.onclick = () => reset();

/* =========================
   RENDER PRINCIPAL
========================= */

function render() {
    clearAll();

    const data = sesiones[current];
    if (!data) return;

    block.innerText = data.texto;

    if (data.respiracion) {
        runBreathing(data.fase, data.tiempo);
    }

    autoAdvance(data.tiempo);
}

/* =========================
   RESPIRACIÓN REAL (FIXED)
========================= */

function runBreathing(fase, tiempo) {
    applyBreath(fase);

    breathTimer = setInterval(() => {
        applyBreath(fase);
    }, tiempo);
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
   AUTO AVANCE (FIX DE FREEZE)
========================= */

function autoAdvance(time) {
    if (!running) return;

    clearTimeout(autoTimer);

    autoTimer = setTimeout(() => {
        if (current < sesiones.length - 1) {
            current++;
            render();
        }
    }, time);
}

/* =========================
   LIMPIEZA TOTAL (CRÍTICO)
========================= */

function clearAll() {
    if (breathTimer) clearInterval(breathTimer);
    if (autoTimer) clearTimeout(autoTimer);

    breathTimer = null;
    autoTimer = null;
}

/* =========================
   RESET COMPLETO
========================= */

function reset() {
    running = false;
    current = 0;

    clearAll();

    block.innerText = "Bienvenido a la Asesoría NeuroGame";

    circle.className = "";
    circle.innerText = "MAYKAMI";

    startBtn.style.display = "inline-block";
    nextBtn.style.display = "none";
    backBtn.style.display = "none";
    restartBtn.style.display = "none";

    if (audio) {
        audio.pause();
        audio.currentTime = 0;
    }

    if (galleryTimer) {
        clearInterval(galleryTimer);
        galleryTimer = null;
    }

    gallery.innerHTML = "";
}
