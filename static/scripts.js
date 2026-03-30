/* ============================================================
   MAYKAMI NEUROGAME ENGINE - FINAL VERSION
   FULL FIXED + STABLE TIMING ENGINE
   ============================================================ */

/* =========================
   ELEMENTOS UI
========================= */
const startBtn = document.getElementById("start-btn");
const nextBtn = document.getElementById("next-btn");
const backBtn = document.getElementById("back-btn");
const restartBtn = document.getElementById("restart-btn");

const block = document.getElementById("block");
const circle = document.getElementById("visual-circle"); // respiración (opcional)

let sesiones = [];
let bloques = [];
let currentSession = 0;
let currentBlock = 0;

let timer = null;
let isRunning = false;

/* =========================
   VOZ
========================= */
const speech = window.speechSynthesis;

/* =========================
   CARGAR SESIONES
========================= */
async function loadSessions() {
    try {
        const res = await fetch("/static/session.html");
        const text = await res.text();

        const jsonStart = text.indexOf("{");
        const json = JSON.parse(text.substring(jsonStart));

        sesiones = json.sesiones || [];
    } catch (err) {
        console.error("Error cargando sesiones:", err);
    }
}

/* =========================
   START
========================= */
startBtn?.addEventListener("click", async () => {
    await loadSessions();

    currentSession = 0;
    currentBlock = 0;
    isRunning = true;

    playBlock();
});

/* =========================
   CONTROLES
========================= */
nextBtn?.addEventListener("click", () => {
    nextBlock();
});

backBtn?.addEventListener("click", () => {
    if (currentBlock > 0) {
        currentBlock--;
        playBlock(false);
    }
});

restartBtn?.addEventListener("click", () => {
    currentBlock = 0;
    playBlock(false);
});

/* =========================
   MOTOR PRINCIPAL
========================= */
function playBlock(auto = true) {
    if (!isRunning) return;

    const session = sesiones[currentSession];
    if (!session) return;

    bloques = session.bloques || [];

    if (currentBlock >= bloques.length) {
        block.innerHTML = "✔ Sesión completada";
        stopBreathing();
        return;
    }

    const b = bloques[currentBlock];

    renderBlock(b);
    speak(b.texto || "");

    clearTimeout(timer);

    startBreathing(b);

    const duration = getDuration(b);

    if (auto && duration > 0) {
        timer = setTimeout(() => {
            currentBlock++;
            playBlock(true);
        }, duration * 1000);
    }
}

/* =========================
   RENDER
========================= */
function renderBlock(b) {
    if (!block) return;

    block.innerHTML = "";
    block.style.background = b.color || "#111";

    const container = document.createElement("div");
    container.className = "block-content";

    if (b.titulo) {
        const h = document.createElement("h2");
        h.innerText = b.titulo;
        container.appendChild(h);
    }

    if (b.pregunta) {
        const p = document.createElement("p");
        p.innerText = b.pregunta;
        container.appendChild(p);
    }

    if (b.texto) {
        const t = document.createElement("p");
        t.innerText = b.texto;
        container.appendChild(t);
    }

    /* =========================
       TVID EJERCICIO LARGO
    ========================= */
    if (b.tipo === "tvid_ejercicio_largo" && Array.isArray(b.textos)) {
        const box = document.createElement("div");

        b.textos.forEach((txt, i) => {
            const item = document.createElement("p");
            item.innerText = `${i + 1}. ${txt}`;
            box.appendChild(item);
        });

        container.appendChild(box);
    }

    /* =========================
       OPCIONES (QUIZ)
    ========================= */
    if (b.opciones) {
        const box = document.createElement("div");

        b.opciones.forEach((op, i) => {
            const btn = document.createElement("button");
            btn.innerText = op;

            btn.onclick = () => {
                if (i === b.correcta) {
                    alert("✔ Correcto: " + (b.explicacion || ""));
                } else {
                    alert("✖ Incorrecto: " + (b.explicacion || ""));
                }
            };

            box.appendChild(btn);
        });

        container.appendChild(box);
    }

    block.appendChild(container);
}

/* =========================
   VOZ
========================= */
function speak(text) {
    if (!text) return;

    speech.cancel();

    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = "es-ES";
    utter.rate = 1;

    speech.speak(utter);
}

/* =========================
   TIEMPOS INTELIGENTES
========================= */
function getDuration(b) {
    if (b.duracion && !isNaN(b.duracion)) return b.duracion;

    switch (b.tipo) {
        case "voz":
            return 8;
        case "respiracion":
            return 8;
        case "tvid":
            return 10;
        case "decision":
            return 12;
        case "tvid_ejercicio_largo":
            return 60;
        case "cierre":
            return 15;
        default:
            return 6;
    }
}

/* =========================
   RESPIRACIÓN ANIMADA
========================= */
function startBreathing(b) {
    if (!circle) return;

    if (b.tipo === "respiracion") {
        circle.style.transition = "all 4s ease-in-out";
        circle.style.transform = "scale(1.4)";

        setTimeout(() => {
            circle.style.transform = "scale(1)";
        }, 2000);
    } else {
        stopBreathing();
    }
}

function stopBreathing() {
    if (!circle) return;
    circle.style.transform = "scale(1)";
}

/* =========================
   SIGUIENTE
========================= */
function nextBlock() {
    clearTimeout(timer);
    currentBlock++;
    playBlock(true);
}
