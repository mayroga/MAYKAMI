/* ============================================================ */
/* MAYKAMI NEUROGAME ENGINE V4 - STABLE STATE MACHINE CORE      */
/* BY MAY ROGA LLC                                              */
/* ============================================================ */

/* ===================== ELEMENTOS ===================== */

const gallery = document.getElementById("visual-gallery");
const circle = document.getElementById("visual-circle");
const block = document.getElementById("block");

const startBtn = document.getElementById("start-btn");
const nextBtn = document.getElementById("next-btn");
const backBtn = document.getElementById("back-btn");
const restartBtn = document.getElementById("restart-btn");

const audio = document.getElementById("nature-audio");

/* ===================== STATE MACHINE ===================== */

let state = {
    running: false,
    locked: false,
    session: null,
    step: 0,
    abort: false
};

let userData = JSON.parse(localStorage.getItem("maykamiData")) || {
    sessionId: 1,
    step: 0,
    disciplina: 40,
    claridad: 50,
    calma: 30
};

/* ===================== CLEAN ENGINE CONTROL ===================== */

let timers = [];
let slideIndex = 0;
let galleryTimer = null;

/* ===================== SAFE TIMER ===================== */

function setSafeTimeout(fn, time) {
    const t = setTimeout(fn, time);
    timers.push(t);
    return t;
}

/* ===================== SAFE CLEAR ===================== */

function clearEngine() {
    state.abort = true;

    window.speechSynthesis.cancel();

    timers.forEach(t => clearTimeout(t));
    timers = [];

    if (galleryTimer) {
        clearInterval(galleryTimer);
        galleryTimer = null;
    }

    state.locked = false;
}

/* ===================== VOZ ESTABLE ===================== */

function speak(text) {
    return new Promise(resolve => {

        if (state.abort) return resolve();

        const utter = new SpeechSynthesisUtterance(
            text.replace(/<[^>]*>/g, "")
        );

        utter.lang = "es-ES";
        utter.rate = 0.95;

        utter.onend = resolve;
        utter.onerror = resolve;

        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utter);
    });
}

/* ===================== RESPIRACIÓN ===================== */

function setBreath(text) {
    const t = text.toLowerCase();

    circle.className = "";

    if (t.includes("inhala") || t.includes("aire")) {
        circle.classList.add("inhale");
        circle.innerText = "Inhala";
    }
    else if (t.includes("exhala") || t.includes("suelta")) {
        circle.classList.add("exhale");
        circle.innerText = "Exhala";
    }
    else if (t.includes("retén") || t.includes("pausa")) {
        circle.classList.add("hold");
        circle.innerText = "Retén";
    }
    else {
        circle.innerText = "MAYKAMI";
    }
}

/* ===================== TYPE + SPEAK ===================== */

async function sayAndWrite(text) {

    if (state.abort) return;

    block.innerHTML = "";

    setBreath(text);

    await speak(text);

    if (state.abort) return;

    for (let i = 0; i < text.length; i++) {

        if (state.abort) return;

        block.innerHTML += text[i];

        await new Promise(r => setTimeout(r, 15));
    }
}

/* ===================== SESSION LOADER ===================== */

async function loadSession() {
    try {
        const res = await fetch("/tvid_ejercicio.json");
        const data = await res.json();

        state.session =
            data.sesiones.find(s => s.id === userData.sessionId)
            || data.sesiones[0];

    } catch (e) {
        block.innerText = "Error cargando sesión MAYKAMI";
    }
}

/* ===================== ENGINE CORE ===================== */

async function runStep() {

    if (state.locked) return;
    state.locked = true;

    clearEngine();
    state.abort = false;

    const stepData = state.session?.bloques?.[userData.step];

    if (!stepData) {
        finishSession();
        return;
    }

    nextBtn.style.display = "none";
    restartBtn.style.display = "none";
    backBtn.style.display = userData.step > 0 ? "inline-block" : "none";

    /* ================= MULTI TEXT ================= */

    if (stepData.textos?.length) {

        for (const t of stepData.textos) {
            if (state.abort) return;
            await sayAndWrite(t);
            await new Promise(r => setSafeTimeout(r, 600));
        }

        if (stepData.duracion) {
            await countdown(stepData.duracion);
        }

        nextBtn.style.display = "inline-block";
    }

    /* ================= DECISION ================= */

    else if (stepData.tipo === "decision") {

        await sayAndWrite(stepData.pregunta);

        const box = document.createElement("div");
        box.style.marginTop = "20px";

        stepData.opciones.forEach((opt, i) => {

            const btn = document.createElement("button");

            btn.innerText = opt;

            btn.style.cssText =
                "display:block;width:100%;margin:10px 0;padding:15px;background:#1e293b;color:white;border-radius:10px;";

            btn.onclick = async () => {

                const ok = i === stepData.correcta;

                const msg = ok
                    ? `Correcto. ${stepData.explicacion}`
                    : `Incorrecto. ${stepData.explicacion}`;

                await sayAndWrite(msg);

                if (ok) userData.disciplina += 5;

                save();

                nextBtn.style.display = "inline-block";
            };

            box.appendChild(btn);
        });

        block.appendChild(box);
    }

    /* ================= SIMPLE ================= */

    else if (stepData.texto) {

        await sayAndWrite(stepData.texto);

        if (stepData.duracion) {
            await countdown(stepData.duracion);
        }

        nextBtn.style.display = "inline-block";
    }

    state.locked = false;
}

/* ===================== COUNTDOWN ===================== */

async function countdown(sec) {

    for (let i = sec; i >= 0; i--) {

        if (state.abort) return;

        block.innerHTML = `
        <div>${state.session?.nombre || "MAYKAMI"}</div>
        <div style="font-size:50px;color:#60a5fa">${i}s</div>
        `;

        await new Promise(r => setSafeTimeout(r, 1000));
    }
}

/* ===================== FINAL ===================== */

function finishSession() {

    block.innerHTML = `
    <h2>Sesión completada</h2>
    <p>Progreso guardado correctamente</p>
    `;

    userData.sessionId =
        userData.sessionId < 21 ? userData.sessionId + 1 : 1;

    userData.step = 0;

    save();

    nextBtn.style.display = "inline-block";
    restartBtn.style.display = "inline-block";
    backBtn.style.display = "inline-block";

    state.locked = false;
}

/* ===================== SAVE ===================== */

function save() {
    localStorage.setItem("maykamiData", JSON.stringify(userData));
}

/* ===================== GALLERY ===================== */

function initGallery() {

    gallery.innerHTML = "";

    for (let i = 0; i < 25; i++) {

        const div = document.createElement("div");

        div.className = "slide";

        div.style.backgroundImage =
            `url(https://picsum.photos/1920/1080?random=${i})`;

        gallery.appendChild(div);
    }

    const slides = document.querySelectorAll(".slide");

    if (!slides.length) return;

    slides[0].classList.add("active");

    galleryTimer = setInterval(() => {

        const all = document.querySelectorAll(".slide");

        all.forEach(s => s.classList.remove("active"));

        slideIndex = (slideIndex + 1) % all.length;

        all[slideIndex].classList.add("active");

    }, 7000);
}

/* ===================== BUTTONS ===================== */

startBtn.onclick = async () => {

    startBtn.style.display = "none";

    userData.step = 0;

    if (audio) {
        audio.volume = 0.05;
        audio.play().catch(() => {});
    }

    initGallery();

    await loadSession();

    runStep();
};

nextBtn.onclick = () => {

    const b = state.session?.bloques?.[userData.step];

    if (b?.tipo === "cierre" || !b) {
        loadSession().then(() => runStep());
        return;
    }

    userData.step++;

    save();

    runStep();
};

backBtn.onclick = () => {

    if (userData.step > 0) {
        userData.step--;
        save();
        runStep();
    }
};

restartBtn.onclick = () => {

    userData.step = 0;
    save();
    runStep();
};

/* ===================== INIT ===================== */

save();
