/* ============================================================ */
/* MAYKAMI NEUROGAME ENGINE - AURA BY MAY ROGA LLC              */
/* FIX STABLE VERSION - NO BREAK LOGIC                          */
/* ============================================================ */

const gallery = document.getElementById("visual-gallery");
const circle = document.getElementById("visual-circle");
const block = document.getElementById("block");

const startBtn = document.getElementById("start-btn");
const nextBtn = document.getElementById("next-btn");
const backBtn = document.getElementById("back-btn");
const restartBtn = document.getElementById("restart-btn");
const audio = document.getElementById("nature-audio");

/* ================= STATE ================= */

let userData = JSON.parse(localStorage.getItem("maykamiData")) || {
    sessionId: 1,
    step: 0,
    disciplina: 40,
    claridad: 50,
    calma: 30
};

let sesionActualData = null;
let abortController = { abort: false };
let slideIndex = 0;

/* ================= FIX: CLEAN TIMERS ================= */

let voiceQueue = Promise.resolve();
let galleryTimer = null;

/* ================= VOZ ESTABLE ================= */

function hablar(texto) {
    return new Promise(resolve => {

        if (abortController.abort) return resolve();

        window.speechSynthesis.cancel();

        const utter = new SpeechSynthesisUtterance(
            texto.replace(/<[^>]*>/g, "")
        );

        utter.lang = "es-ES";
        utter.rate = 0.95;

        const t = texto.toLowerCase();

        circle.className = "";

        if (t.includes("inhala") || t.includes("aspira") || t.includes("aire")) {
            circle.classList.add("inhale");
            circle.innerText = "Inhala";
        } else if (t.includes("exhala") || t.includes("suelta")) {
            circle.classList.add("exhale");
            circle.innerText = "Exhala";
        } else if (t.includes("retén") || t.includes("pausa")) {
            circle.classList.add("hold");
            circle.innerText = "Retén";
        } else {
            circle.innerText = "MAYKAMI";
        }

        utter.onend = resolve;
        utter.onerror = resolve;

        window.speechSynthesis.speak(utter);
    });
}

/* ================= FIX: SECUENCIA SEGURA ================= */

async function escribirTextoYHablar(texto, localAbort) {
    if (localAbort.abort) return;

    block.innerHTML = "";

    await hablar(texto);

    if (localAbort.abort) return;

    let i = 0;

    return new Promise(resolve => {
        const interval = setInterval(() => {

            if (localAbort.abort) {
                clearInterval(interval);
                resolve();
                return;
            }

            if (i >= texto.length) {
                clearInterval(interval);
                resolve();
                return;
            }

            block.innerHTML += texto[i];
            i++;

        }, 18);
    });
}

/* ================= CONTADOR ================= */

async function iniciarContador(segundos, texto, localAbort) {
    return new Promise(r => {
        let t = segundos;

        const timer = setInterval(() => {

            if (localAbort.abort) {
                clearInterval(timer);
                return;
            }

            block.innerHTML =
                `${texto}<br><span style="font-size:55px;color:#60a5fa;">${t}s</span>`;

            if (t <= 0) {
                clearInterval(timer);
                r();
            }

            t--;

        }, 1000);
    });
}

/* ================= SESIÓN ================= */

async function cargarSesion() {
    try {
        const res = await fetch("/tvid_ejercicio.json");
        const data = await res.json();
        sesionActualData =
            data.sesiones.find(s => s.id === userData.sessionId)
            || data.sesiones[0];
    } catch (e) {
        block.innerText = "Error cargando base MAYKAMI.";
    }
}

/* ================= CLEAN ================= */

function limpiarEstado() {
    abortController.abort = true;
    abortController = { abort: false };

    window.speechSynthesis.cancel();

    if (galleryTimer) {
        clearInterval(galleryTimer);
        galleryTimer = null;
    }
}

/* ================= CORE ================= */

async function mostrarBloque() {

    limpiarEstado();
    const localAbort = abortController;

    const bloque = sesionActualData?.bloques?.[userData.step];

    if (!bloque) {
        finalizarSesion();
        return;
    }

    nextBtn.style.display = "none";
    restartBtn.style.display = "none";
    backBtn.style.display = userData.step > 0 ? "inline-block" : "none";

    /* TEXTOS MULTIPLES */
    if (bloque.textos?.length) {

        for (const frase of bloque.textos) {
            if (localAbort.abort) return;

            await escribirTextoYHablar(frase, localAbort);
            await new Promise(r => setTimeout(r, 800));
        }

        if (bloque.duracion) {
            await iniciarContador(bloque.duracion, "Asimila...", localAbort);
        }

        nextBtn.style.display = "inline-block";
    }

    /* DECISION */
    else if (bloque.tipo === "decision") {

        await escribirTextoYHablar(bloque.pregunta, localAbort);

        const cont = document.createElement("div");
        cont.style.marginTop = "20px";

        bloque.opciones.forEach((opt, idx) => {

            const btn = document.createElement("button");

            btn.innerText = opt;
            btn.style.cssText =
                "display:block;width:100%;margin:10px 0;padding:15px;background:#1e293b;color:white;border-radius:10px;";

            btn.onclick = async () => {

                const ok = idx === bloque.correcta;

                const fb = ok
                    ? `Correcto. ${bloque.explicacion}`
                    : `Incorrecto. ${bloque.explicacion}`;

                await escribirTextoYHablar(fb, localAbort);

                if (ok) userData.disciplina += 5;

                guardarProgreso();

                nextBtn.style.display = "inline-block";
            };

            cont.appendChild(btn);
        });

        block.appendChild(cont);
    }

    /* SIMPLE */
    else if (bloque.texto) {

        await escribirTextoYHablar(bloque.texto, localAbort);

        if (bloque.duracion) {
            await iniciarContador(bloque.duracion, bloque.texto, localAbort);
        }

        nextBtn.style.display = "inline-block";
    }
}

/* ================= FINAL ================= */

function finalizarSesion() {

    block.innerHTML =
        "<h2>Sesión Completada</h2><p>Progreso guardado correctamente.</p>";

    userData.sessionId =
        userData.sessionId < 21 ? userData.sessionId + 1 : 1;

    userData.step = 0;

    guardarProgreso();

    nextBtn.style.display = "inline-block";
    restartBtn.style.display = "inline-block";
    backBtn.style.display = "inline-block";
}

/* ================= PROGRESO ================= */

function guardarProgreso() {
    localStorage.setItem("maykamiData", JSON.stringify(userData));
}

/* ================= GALERÍA (FIX CRÍTICO) ================= */

function initGallery(total = 30) {

    gallery.innerHTML = "";

    for (let i = 0; i < total; i++) {
        const div = document.createElement("div");
        div.className = "slide";
        div.style.backgroundImage =
            `url(https://picsum.photos/1920/1080?nature&sig=${i})`;
        gallery.appendChild(div);
    }

    const slides = document.querySelectorAll(".slide");

    if (!slides.length) return;

    slides[0].classList.add("active");

    if (galleryTimer) clearInterval(galleryTimer);

    galleryTimer = setInterval(() => {

        const all = document.querySelectorAll(".slide");
        if (!all.length) return;

        all.forEach(s => s.classList.remove("active"));

        slideIndex = (slideIndex + 1) % all.length;

        all[slideIndex].classList.add("active");

    }, 7000);
}

/* ================= BOTONES ================= */

startBtn.onclick = async () => {

    startBtn.style.display = "none";

    if (audio) {
        audio.volume = 0.05;

        const p = audio.play();
        if (p) p.catch(() => {});
    }

    initGallery();

    await cargarSesion();

    mostrarBloque();
};

nextBtn.onclick = () => {

    const b = sesionActualData?.bloques?.[userData.step];

    if (b?.tipo === "cierre" || !b) {
        cargarSesion().then(() => mostrarBloque());
        return;
    }

    userData.step++;

    guardarProgreso();

    mostrarBloque();
};

backBtn.onclick = () => {
    if (userData.step > 0) {
        userData.step--;
        guardarProgreso();
        mostrarBloque();
    }
};

restartBtn.onclick = () => {
    userData.step = 0;
    guardarProgreso();
    mostrarBloque();
};

guardarProgreso();
