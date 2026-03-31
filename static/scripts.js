/* ============================================================
   MAYKAMI NEUROGAME ENGINE - STABLE FINAL FIX
============================================================ */

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

/* ================= STATE ================= */

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

/* ================= RESPIRACIÓN ================= */

function startBreathing(seconds = null) {

    const cycle = 3400;
    const inhaleTime = cycle * 0.4;
    const exhaleTime = cycle * 0.4;

    const start = Date.now();
    const duration = seconds ? seconds * 1000 : Infinity;

    function loop() {

        if (engine.abort) return;
        if (Date.now() - start >= duration) return;

        circle.className = "inhale";
        circle.textContent = "Inhala";

        safeTimeout(() => {

            circle.className = "exhale";
            circle.textContent = "Exhala";

            safeTimeout(loop, exhaleTime);

        }, inhaleTime);
    }

    loop();
}

/* ================= TYPE TEXT ================= */

async function typeText(text) {

    block.innerHTML = "";

    for (let i = 0; i < text.length; i++) {

        if (engine.abort) return;

        block.innerHTML += text[i];

        await new Promise(r => safeTimeout(r, 10));
    }
}

/* ================= LOAD JSON ================= */

async function loadSession() {

    const res = await fetch("/tvid_ejercicio.json");
    const data = await res.json();

    if (userData.sessionId > 21) userData.sessionId = 1;

    engine.session =
        data.sesiones.find(s => s.id === userData.sessionId)
        || data.sesiones[0];
}

/* ================= CORE ================= */

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

    nextBtn.style.display = "inline-block";
    restartBtn.style.display = "inline-block";
    backBtn.style.display = "inline-block";

    if (step.textos?.length) {

        for (const t of step.textos) {

            const seconds = (t.match(/(\d{1,3})\s*(seg|segundos|s)/i) || [])[1];

            await speak(t);
            await typeText(t);

            if (t.toLowerCase().includes("respira") ||
                t.toLowerCase().includes("inhala") ||
                t.toLowerCase().includes("exhala")) {
                startBreathing(seconds ? parseInt(seconds) : null);
            }

            await new Promise(r => safeTimeout(r, 300));
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

    else if (step.texto) {

        await speak(step.texto);
        await typeText(step.texto);

        const seconds = (step.texto.match(/(\d{1,3})\s*(seg|segundos|s)/i) || [])[1];

        if (step.texto.toLowerCase().includes("respira") ||
            step.texto.toLowerCase().includes("inhala") ||
            step.texto.toLowerCase().includes("exhala")) {
            startBreathing(seconds ? parseInt(seconds) : null);
        }
    }

    engine.locked = false;
}

/* ================= FIN ================= */

async function finish() {

    block.innerHTML = "Sesión completada";

    userData.sessionId++;
    if (userData.sessionId > 21) userData.sessionId = 1;

    userData.step = 0;

    save();

    await loadSession();

    engine.locked = false;
}

/* ================= SAVE ================= */

function save() {
    localStorage.setItem("maykamiData", JSON.stringify(userData));
}

/* ================= GALERÍA ================= */

function initGallery() {

    gallery.innerHTML = "";

    for (let i = 0; i < 10; i++) {

        const div = document.createElement("div");
        div.className = "slide";

        div.style.backgroundImage =
            `url(https://picsum.photos/1920/1080?random=${i})`;

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

/* ================= BUTTONS ================= */

startBtn.onclick = async () => {

    startBtn.style.display = "none";

    bgMusic.play().catch(() => {
        document.body.addEventListener("click", () => bgMusic.play(), { once: true });
    });

    userData.step = 0;

    initGallery();

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

save();
