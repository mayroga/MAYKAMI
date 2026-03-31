/* ============================================================
   MAYKAMI NEUROGAME ENGINE V4 - BREATH SYNC UPGRADE
============================================================ */

const gallery = document.getElementById("visual-gallery");
const circle = document.getElementById("visual-circle");
const block = document.getElementById("block");

const startBtn = document.getElementById("start-btn");
const nextBtn = document.getElementById("next-btn");
const backBtn = document.getElementById("back-btn");
const restartBtn = document.getElementById("restart-btn");

/* ================= ENGINE STATE ================= */

let engine = {
    locked: false,
    abort: false,
    speaking: false,
    timers: new Set(),
    breathing: false,
    breathLoop: null,
    session: null
};

let userData = JSON.parse(localStorage.getItem("maykamiData")) || {
    sessionId: 1,
    step: 0,
    disciplina: 40
};

let slideIndex = 0;
let galleryTimer = null;

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

    stopBreathing();

    engine.locked = false;
    engine.speaking = false;

    block.innerHTML = "";
}

/* ================= VOZ ================= */

function speak(text) {

    return new Promise(resolve => {

        if (engine.abort) return resolve();

        engine.speaking = true;

        const utter = new SpeechSynthesisUtterance(
            text.replace(/<[^>]*>/g, "")
        );

        utter.lang = "es-ES";
        utter.rate = 0.95;

        utter.onend = () => {
            engine.speaking = false;
            resolve();
        };

        utter.onerror = () => {
            engine.speaking = false;
            resolve();
        };

        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utter);
    });
}

/* ================= BREATH ENGINE (CORE FIX) ================= */

function startBreathing(mode = "normal") {

    engine.breathing = true;

    let states = ["inhale", "hold", "exhale"];
    let index = 0;

    clearInterval(engine.breathLoop);

    engine.breathLoop = setInterval(() => {

        if (!engine.breathing) return;

        circle.className = "";

        const state = states[index];

        if (state === "inhale") {
            circle.classList.add("inhale");
            circle.textContent = "Inhala";
        }

        if (state === "hold") {
            circle.classList.add("hold");
            circle.textContent = "Retén";
        }

        if (state === "exhale") {
            circle.classList.add("exhale");
            circle.textContent = "Exhala";
        }

        index = (index + 1) % states.length;

    }, mode === "slow" ? 2500 : 1800);
}

function stopBreathing() {
    engine.breathing = false;
    clearInterval(engine.breathLoop);
    engine.breathLoop = null;
    circle.textContent = "MAYKAMI";
    circle.className = "";
}

/* ================= BREATH DETECTOR ================= */

function breathSync(text) {

    const t = text.toLowerCase();

    if (
        t.includes("respir") ||
        t.includes("inhala") ||
        t.includes("exhala") ||
        t.includes("retén")
    ) {
        startBreathing("slow");
    } else {
        startBreathing("normal");
    }
}

/* ================= TYPE ================= */

async function typeText(text) {

    block.textContent = "";

    for (let i = 0; i < text.length; i++) {

        if (engine.abort) return;

        block.textContent += text[i];

        await new Promise(r => safeTimeout(r, 12));
    }
}

/* ================= LOAD SESSION ================= */

async function loadSession() {

    const res = await fetch("/tvid_ejercicio.json");
    const data = await res.json();

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

    nextBtn.style.display = "none";
    restartBtn.style.display = "none";
    backBtn.style.display = userData.step > 0 ? "inline-block" : "none";

    /* MULTI TEXT */
    if (step.textos?.length) {

        for (const t of step.textos) {

            if (engine.abort) return;

            breathSync(t);

            await speak(t);
            await typeText(t);

            await new Promise(r => safeTimeout(r, 400));
        }

        nextBtn.style.display = "inline-block";
    }

    /* DECISION */
    else if (step.tipo === "decision") {

        stopBreathing();

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

                breathSync(msg);

                await speak(msg);
                await typeText(msg);

                if (ok) userData.disciplina += 5;

                save();

                nextBtn.style.display = "inline-block";
            };

            box.appendChild(btn);
        });

        block.appendChild(box);
    }

    /* SIMPLE */
    else if (step.texto) {

        breathSync(step.texto);

        await speak(step.texto);
        await typeText(step.texto);

        nextBtn.style.display = "inline-block";
    }

    engine.locked = false;
}

/* ================= FIN ================= */

function finish() {

    stopBreathing();

    block.innerHTML = "Sesión completada";

    userData.sessionId =
        userData.sessionId < 21 ? userData.sessionId + 1 : 1;

    userData.step = 0;

    save();

    nextBtn.style.display = "inline-block";
    restartBtn.style.display = "inline-block";
    backBtn.style.display = "inline-block";

    engine.locked = false;
}

/* ================= SAVE ================= */

function save() {
    localStorage.setItem("maykamiData", JSON.stringify(userData));
}

/* ================= GALLERY ================= */

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

    slides[0].classList.add("active");

    galleryTimer = setInterval(() => {

        const all = document.querySelectorAll(".slide");

        all.forEach(s => s.classList.remove("active"));

        slideIndex = (slideIndex + 1) % all.length;

        all[slideIndex].classList.add("active");

    }, 7000);
}

/* ================= BUTTONS ================= */

startBtn.onclick = async () => {

    startBtn.style.display = "none";

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
