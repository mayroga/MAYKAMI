/* ============================================================ */
/* MAYKAMI NEUROGAME ENGINE - FIX REAL FINAL                    */
/* ============================================================ */

const gallery = document.getElementById("visual-gallery");
const circle = document.getElementById("visual-circle");
const block = document.getElementById("block");

const startBtn = document.getElementById("start-btn");
const nextBtn = document.getElementById("next-btn");
const backBtn = document.getElementById("back-btn");
const restartBtn = document.getElementById("restart-btn");

const audio = document.getElementById("nature-audio");

/* ==================== ESTADO ==================== */

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

/* ==================== RESPIRACIÓN GLOBAL ==================== */

let breathingActive = false;
let forcedMode = false;

function startBreathing() {
    if (breathingActive) return;

    breathingActive = true;

    const cycle = [
        { cls: "inhale", text: "Inhala", time: 4000 },
        { cls: "hold", text: "Retén", time: 2000 },
        { cls: "exhale", text: "Exhala", time: 4000 },
        { cls: "hold", text: "Retén", time: 2000 }
    ];

    let i = 0;

    function loop() {
        if (!breathingActive) return;

        if (!forcedMode) {
            const step = cycle[i];
            circle.className = step.cls;
            circle.innerText = step.text;

            setTimeout(() => {
                i = (i + 1) % cycle.length;
                loop();
            }, step.time);
        } else {
            setTimeout(loop, 300);
        }
    }

    loop();
}

/* ==================== VOZ ==================== */

function hablar(texto) {
    return new Promise(resolve => {
        window.speechSynthesis.cancel();

        const utter = new SpeechSynthesisUtterance(texto.replace(/<[^>]*>/g, ""));
        utter.lang = "es-ES";
        utter.rate = 0.95;

        const t = texto.toLowerCase();
        forcedMode = false;

        if (["inhala","aspira","llena","aire"].some(p => t.includes(p))) {
            circle.className = "inhale";
            circle.innerText = "Inhala";
            forcedMode = true;
        } 
        else if (["exhala","suelta","expulsa","fuera"].some(p => t.includes(p))) {
            circle.className = "exhale";
            circle.innerText = "Exhala";
            forcedMode = true;
        } 
        else if (["retén","retiene","pausa","aguanta"].some(p => t.includes(p))) {
            circle.className = "hold";
            circle.innerText = "Retén";
            forcedMode = true;
        }

        utter.onend = () => {
            forcedMode = false;
            resolve();
        };

        utter.onerror = () => {
            forcedMode = false;
            resolve();
        };

        window.speechSynthesis.speak(utter);
    });
}

/* ==================== TEXTO ==================== */

async function escribirTextoYHablar(texto, localAbort) {
    if (localAbort.abort) return;

    block.innerHTML = "";

    await hablar(texto);

    let i = 0;

    return new Promise(resolve => {
        const interval = setInterval(() => {
            if (localAbort.abort || i >= texto.length) {
                clearInterval(interval);
                resolve();
            } else {
                block.insertAdjacentHTML('beforeend', texto[i]);
                i++;
            }
        }, 20);
    });
}

/* ==================== CONTADOR ==================== */

async function iniciarContador(segundos, texto, localAbort) {
    return new Promise(resolve => {
        let t = segundos;

        const timer = setInterval(() => {
            if (localAbort.abort) {
                clearInterval(timer);
                return;
            }

            block.innerHTML = `
                ${texto}<br>
                <span style="font-size:55px; color:#60a5fa; font-weight:bold;">
                    ${t}s
                </span>
            `;

            if (t <= 0) {
                clearInterval(timer);
                resolve();
            }

            t--;
        }, 1000);
    });
}

/* ==================== SESIONES ==================== */

async function cargarSesion() {
    try {
        const res = await fetch("/tvid_ejercicio.json");
        const data = await res.json();
        sesionActualData = data.sesiones.find(s => s.id === userData.sessionId) || data.sesiones[0];
    } catch (e) {
        block.innerText = "Error cargando la base de datos MAYKAMI.";
    }
}

function limpiarEstado() {
    abortController.abort = true;
    abortController = { abort: false };
    window.speechSynthesis.cancel();
    block.innerHTML = "";
}

/* ==================== BLOQUES ==================== */

async function mostrarBloque() {
    limpiarEstado();

    const localAbort = abortController;
    const bloque = sesionActualData.bloques[userData.step];

    if (!bloque) {
        finalizarSesion();
        return;
    }

    nextBtn.style.display = "none";
    restartBtn.style.display = "none";
    backBtn.style.display = userData.step > 0 ? "inline-block" : "none";

    if (bloque.textos && Array.isArray(bloque.textos)) {
        for (const frase of bloque.textos) {
            if (localAbort.abort) return;
            await escribirTextoYHablar(frase, localAbort);
            await new Promise(r => setTimeout(r, 800));
        }

        if (bloque.duracion) {
            await iniciarContador(bloque.duracion, "Asimila la técnica...", localAbort);
        }

        nextBtn.style.display = "inline-block";
    }

    else if (bloque.tipo === "decision") {
        await escribirTextoYHablar(bloque.pregunta, localAbort);

        const cont = document.createElement("div");

        bloque.opciones.forEach((opt, idx) => {
            const btn = document.createElement("button");
            btn.innerText = opt;

            btn.onclick = async () => {
                const correcto = idx === bloque.correcta;

                const msg = correcto
                    ? `Correcto. ${bloque.explicacion}`
                    : `Incorrecto. ${bloque.explicacion}`;

                await escribirTextoYHablar(msg, localAbort);

                if (correcto) userData.disciplina += 5;

                guardarProgreso();
                nextBtn.style.display = "inline-block";
            };

            cont.appendChild(btn);
        });

        block.appendChild(cont);
    }

    else if (bloque.texto) {
        await escribirTextoYHablar(bloque.texto, localAbort);

        if (bloque.duracion) {
            await iniciarContador(bloque.duracion, bloque.texto, localAbort);
        }

        if (bloque.tipo === "cierre") {
            finalizarSesion();
        } else {
            nextBtn.style.display = "inline-block";
        }
    }
}

/* ==================== FINAL ==================== */

function finalizarSesion() {
    block.innerHTML = "<h2>Sesión Completada</h2>";

    userData.sessionId = userData.sessionId < 21 ? userData.sessionId + 1 : 1;
    userData.step = 0;

    guardarProgreso();

    nextBtn.style.display = "inline-block";
    restartBtn.style.display = "inline-block";
    backBtn.style.display = "inline-block";
}

function guardarProgreso() {
    localStorage.setItem("maykamiData", JSON.stringify(userData));
}

/* ==================== GALERÍA ==================== */

function initGallery(total = 30) {
    gallery.innerHTML = "";

    for (let i = 0; i < total; i++) {
        const div = document.createElement("div");
        div.className = "slide";
        div.style.backgroundImage = `url(https://picsum.photos/1920/1080?nature&sig=${i})`;
        gallery.appendChild(div);
    }

    const slides = document.querySelectorAll(".slide");
    if (slides.length > 0) slides[0].classList.add("active");

    setInterval(() => {
        const s = document.querySelectorAll(".slide");
        s[slideIndex].classList.remove("active");
        slideIndex = (slideIndex + 1) % s.length;
        s[slideIndex].classList.add("active");
    }, 7000);
}

/* ==================== EVENTOS ==================== */

startBtn.onclick = async () => {
    startBtn.style.display = "none";

    if (audio) {
        audio.volume = 0.03;
        audio.play();
    }

    initGallery();
    startBreathing();

    await cargarSesion();
    mostrarBloque();
};

nextBtn.onclick = () => {
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
