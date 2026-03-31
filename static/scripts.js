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

/* ================= RESPIRACIÓN REAL HUMANA ================= */
/* 16–22 ciclos/min => 2.7s a 3.7s por ciclo */

function startBreathing(seconds = null, forceHold = false) {

    clearInterval(engine.breathLoop);

    const cycle = 3400; // 🔥 promedio fisiológico humano
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

/* ================= TEXTO ================= */

async function typeText(text) {

    block.innerHTML = "";

    for (let i = 0; i < text.length; i++) {

        if (engine.abort) return;

        block.innerHTML += text[i];

        await new Promise(r => safeTimeout(r, 12));
    }
}

/* ================= LOAD SESSION ================= */

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

    /* MULTI TEXTO */
    if (step.textos?.length) {

        for (const t of step.textos) {

            const seconds = extractSeconds(t);
            const hold = hasHold(t);

            await speak(t);
            await typeText(t);

            if (
                t.toLowerCase().includes("respira") ||
                t.toLowerCase().includes("inhala") ||
                t.toLowerCase().includes("exhala")
            ) {
                startBreathing(seconds, hold);
            }

            await new Promise(r => safeTimeout(r, 400));
        }
    }

    /* DECISION */
    else if (step.tipo === "decision") {

        await speak(step.pregunta);
        await typeText(step.pregunta);

        const box = document.createElement("div");

        step.opciones.forEach((opt, i) => {

            const btn = document.createElement("button");
            btn.textContent = opt;

            btn.style.display = "block";
            btn.style.width = "100%";
            btn.style.margin = "10px 0";

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

    /* SIMPLE */
    else if (step.texto) {

        const seconds = extractSeconds(step.texto);
        const hold = hasHold(step.texto);

        await speak(step.texto);
        await typeText(step.texto);

        if (
            step.texto.toLowerCase().includes("respira") ||
            step.texto.toLowerCase().includes("inhala") ||
            step.texto.toLowerCase().includes("exhala")
        ) {
            startBreathing(seconds, hold);
        }
    }

    engine.locked = false;
}

/* ================= FIN FIX ================= */

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

    for (let i = 0; i < 20; i++) {

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

/* ================= BOTONES ================= */

startBtn.onclick = async () => {

    startBtn.style.display = "none";

    playMusic();

    userData.step = 0;

    initGallery();

    startBreathing();

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
