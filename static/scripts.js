/* ============================================================ */
/* MAYKAMI NEUROGAME ENGINE BY MAY ROGA LLC         */
/* ============================================================ */

const gallery = document.getElementById("visual-gallery");
const circle = document.getElementById("visual-circle");
const block = document.getElementById("block");
const startBtn = document.getElementById("start-btn");
const nextBtn = document.getElementById("next-btn");
const backBtn = document.getElementById("back-btn");
const restartBtn = document.getElementById("restart-btn");
const audio = document.getElementById("nature-audio");

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

/* ==================== VOZ Y GLOBO ==================== */
function hablar(texto) {
    return new Promise(resolve => {
        window.speechSynthesis.cancel();
        const utter = new SpeechSynthesisUtterance(texto.replace(/<[^>]*>/g, ""));
        utter.lang = "es-ES";
        utter.rate = 0.95;

        // Globo automático según palabras clave
        const t = texto.toLowerCase();
        if (["inhala", "aspira", "llena", "aire"].some(p => t.includes(p))) {
            circle.className = "inhale"; circle.innerText = "Inhala";
        } else if (["exhala", "suelta", "expulsa", "fuera"].some(p => t.includes(p))) {
            circle.className = "exhale"; circle.innerText = "Exhala";
        } else if (["retén", "retiene", "pausa", "aguanta"].some(p => t.includes(p))) {
            circle.className = "hold"; circle.innerText = "Retén";
        } else {
            circle.className = ""; circle.innerText = "MAYKAMI";
        }

        utter.onend = resolve;
        utter.onerror = resolve;
        window.speechSynthesis.speak(utter);
    });
}

/* ==================== ESCRITURA CARÁCTER POR CARÁCTER ==================== */
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
    return new Promise(r => {
        let t = segundos;
        const timer = setInterval(() => {
            if (localAbort.abort) { clearInterval(timer); return; }
            block.innerHTML = `${texto}<br><span style="font-size:55px; color:#60a5fa; font-weight:bold;">${t}s</span>`;
            if (t <= 0) { clearInterval(timer); r(); }
            t--;
        }, 1000);
    });
}

/* ==================== CARGA SESIÓN ==================== */
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

/* ==================== MOSTRAR BLOQUE ==================== */
async function mostrarBloque() {
    limpiarEstado();
    const localAbort = abortController;
    const bloque = sesionActualData.bloques[userData.step];

    if (!bloque) { finalizarSesion(); return; }

    // Navegación inicial
    nextBtn.style.display = "none";
    restartBtn.style.display = "none";
    backBtn.style.display = userData.step > 0 ? "inline-block" : "none";

    // 1. tvid_ejercicio_largo
    if (bloque.textos && Array.isArray(bloque.textos)) {
        for (const item of bloque.textos) {
            if (localAbort.abort) return;

            // Si es objeto con texto y duración
            if (typeof item === "object" && item.texto) {
                await escribirTextoYHablar(item.texto, localAbort);
                if (item.duracion) await iniciarContador(item.duracion, "Asimila la técnica...", localAbort);
            } else {
                await escribirTextoYHablar(item, localAbort);
            }
            await new Promise(r => setTimeout(r, 1200));
        }
        if (bloque.duracion) {
            await iniciarContador(bloque.duracion, "Asimila la técnica...", localAbort);
        }
        nextBtn.style.display = "inline-block";
    }

    // 2. Bloques de Decisión (Quiz)
    else if (bloque.tipo === "decision") {
        await escribirTextoYHablar(bloque.pregunta, localAbort);
        const btnCont = document.createElement("div");
        btnCont.style.marginTop = "20px";

        bloque.opciones.forEach((opt, idx) => {
            const btn = document.createElement("button");
            btn.innerText = opt;
            btn.style.cssText = "display:block; width:100%; margin:10px 0; padding:15px; border-radius:10px; background:#1e293b; color:white; border:1px solid #3b82f6; cursor:pointer;";

            btn.onclick = async () => {
                const esCorrecto = (idx === bloque.correcta);
                const feedback = esCorrecto ? `Correcto. ${bloque.explicacion}` : `Incorrecto. ${bloque.explicacion}`;
                await escribirTextoYHablar(feedback, localAbort);
                if (esCorrecto) userData.disciplina += bloque.recompensa || 5;
                guardarProgreso();
                nextBtn.style.display = "inline-block";
            };
            btnCont.appendChild(btn);
        });
        block.appendChild(btnCont);
    }

    // 3. tvid simple o texto
    else if (bloque.texto) {
        if (bloque.titulo) {
            await escribirTextoYHablar(`--- ${bloque.titulo} ---`, localAbort);
        }
        await escribirTextoYHablar(bloque.texto, localAbort);

        if (bloque.duracion) await iniciarContador(bloque.duracion, bloque.texto, localAbort);

        if (bloque.tipo === "cierre") finalizarSesion();
        else nextBtn.style.display = "inline-block";
    }
}

/* ==================== FINALIZAR SESIÓN ==================== */
function finalizarSesion() {
    block.innerHTML = "<h2>Sesión Completada</h2><p>Has fortalecido tu disciplina hoy. El progreso ha sido guardado.</p>";
    userData.sessionId = userData.sessionId < 21 ? userData.sessionId + 1 : 1;
    userData.step = 0;
    guardarProgreso();
    nextBtn.style.display = "inline-block";
    restartBtn.style.display = "inline-block";
    backBtn.style.display = "inline-block";
}

/* ==================== GUARDAR PROGRESO ==================== */
function guardarProgreso() {
    localStorage.setItem("maykamiData", JSON.stringify(userData));
    const dBar = document.getElementById("disciplina-bar");
    if (dBar) dBar.style.width = userData.disciplina + "%";
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
        const currentSlides = document.querySelectorAll(".slide");
        if (currentSlides.length === 0) return;
        currentSlides[slideIndex].classList.remove("active");
        slideIndex = (slideIndex + 1) % currentSlides.length;
        currentSlides[slideIndex].classList.add("active");
    }, 7000);
}

/* ==================== EVENTOS ==================== */
startBtn.onclick = async () => {
    startBtn.style.display = "none";
    if (audio) { audio.volume = 0.05; audio.play(); }
    initGallery();
    await cargarSesion();
    mostrarBloque();
};

nextBtn.onclick = () => {
    if (sesionActualData.bloques[userData.step]?.tipo === "cierre" || !sesionActualData.bloques[userData.step]) {
        cargarSesion().then(() => mostrarBloque());
    } else {
        userData.step++;
        guardarProgreso();
        mostrarBloque();
    }
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

/* ==================== INICIALIZACIÓN ==================== */
guardarProgreso();
