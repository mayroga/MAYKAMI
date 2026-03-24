/* ============================================================ */
/* MAYKAMI NEUROGAME ENGINE - AURA BY MAY ROGA LLC              */
/* ============================================================ */

const gallery = document.getElementById("visual-gallery");
const circle = document.getElementById("visual-circle");
const block = document.getElementById("block");
const startBtn = document.getElementById("start-btn");
const nextBtn = document.getElementById("next-btn");
const backBtn = document.getElementById("back-btn");
const restartBtn = document.getElementById("restart-btn");
const audio = document.getElementById("nature-audio");

// Estado de progreso: Una sesión por día (Ciclo 1 a 21)
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

/* ==================== MOTOR DE VOZ Y GLOBO DINÁMICO ==================== */
function hablar(texto) {
    return new Promise(resolve => {
        window.speechSynthesis.cancel();
        const utter = new SpeechSynthesisUtterance(texto.replace(/<[^>]*>/g, ""));
        utter.lang = "es-ES";
        utter.rate = 0.90; // Velocidad con peso y autoridad

        // Sincronización del globo con la instrucción
        const t = texto.toLowerCase();
        if (["inhala", "aspira", "aire"].some(p => t.includes(p))) {
            circle.className = "inhale"; circle.innerText = "Inhala";
        } else if (["exhala", "suelta", "fuera"].some(p => t.includes(p))) {
            circle.className = "exhale"; circle.innerText = "Exhala";
        } else if (["retén", "pausa", "aguanta"].some(p => t.includes(p))) {
            circle.className = "hold"; circle.innerText = "Retén";
        } else {
            circle.className = ""; circle.innerText = "MAYKAMI";
        }

        utter.onend = resolve;
        utter.onerror = resolve;
        window.speechSynthesis.speak(utter);
    });
}

/* ==================== LECTURA Y CONSOLIDACIÓN ACTIVA ==================== */
async function escribirTextoYHablar(texto, localAbort) {
    if (localAbort.abort) return;
    block.innerHTML = "";
    
    // 1. Escuchar instrucción
    await hablar(texto);

    // 2. Escritura carácter por carácter
    let i = 0;
    await new Promise(resolve => {
        const interval = setInterval(() => {
            if (localAbort.abort || i >= texto.length) {
                clearInterval(interval);
                resolve();
            } else {
                block.insertAdjacentHTML('beforeend', texto[i]);
                i++;
            }
        }, 30);
    });

    // PAUSA DE CONSOLIDACIÓN (12s) - Ocupa al cliente con respiración
    if (!localAbort.abort) {
        await iniciarContador(12, "Fija esta enseñanza con tu respiración...", localAbort, true);
    }
}

/* ==================== CONTADOR Y ASISTENCIA FÍSICA ==================== */
async function iniciarContador(segundos, texto, localAbort, esConsolidacion = false) {
    return new Promise(r => {
        let t = segundos;
        const timer = setInterval(() => {
            if (localAbort.abort) { clearInterval(timer); return; }
            
            // Guía de respiración durante la consolidación (4s c/u)
            if (esConsolidacion) {
                if (t > 8) { circle.className = "inhale"; circle.innerText = "Inhala"; }
                else if (t > 4) { circle.className = "hold"; circle.innerText = "Retén"; }
                else { circle.className = "exhale"; circle.innerText = "Exhala"; }
            }

            block.innerHTML = `<span style="color:#94a3b8; font-size:18px;">${texto}</span><br>
                               <span style="font-size:55px; color:#60a5fa; font-weight:bold;">${t}s</span>`;
            
            if (t <= 0) {
                clearInterval(timer);
                circle.className = ""; circle.innerText = "MAYKAMI";
                r();
            }
            t--;
        }, 1000);
    });
}

/* ==================== LÓGICA DE SESIONES (LOOP 1-21) ==================== */
async function cargarSesion() {
    try {
        const res = await fetch("/tvid_ejercicio.json");
        const data = await res.json();
        sesionActualData = data.sesiones.find(s => s.id === userData.sessionId) || data.sesiones[0];
    } catch (e) {
        block.innerText = "Error cargando la base de datos MAYKAMI.";
    }
}

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
        }
        nextBtn.style.display = "inline-block";
    } 
    else if (bloque.tipo === "decision") {
        await escribirTextoYHablar(bloque.pregunta, localAbort);
        const btnCont = document.createElement("div");
        btnCont.style.marginTop = "20px";
        bloque.opciones.forEach((opt, idx) => {
            const btn = document.createElement("button");
            btn.innerText = opt;
            btn.style.cssText = "display:block; width:100%; margin:10px 0; padding:15px; border-radius:10px; background:#1e293b; color:white; border:1px solid #3b82f6; cursor:pointer;";
            btn.onclick = async () => {
                const feedback = (idx === bloque.correcta) ? `Correcto. ${bloque.explicacion}` : `Incorrecto. ${bloque.explicacion}`;
                await escribirTextoYHablar(feedback, localAbort);
                if (idx === bloque.correcta) userData.disciplina += 5;
                guardarProgreso();
                nextBtn.style.display = "inline-block";
            };
            btnCont.appendChild(btn);
        });
        block.appendChild(btnCont);
    }
    else if (bloque.texto) {
        await escribirTextoYHablar(bloque.texto, localAbort);
        if (bloque.duracion) await iniciarContador(bloque.duracion, "Realiza el ejercicio...", localAbort);
        if (bloque.tipo === "cierre") finalizarSesion();
        else nextBtn.style.display = "inline-block";
    }
}

function finalizarSesion() {
    block.innerHTML = "<h2>Sesión Completada</h2><p>Has fortalecido tu disciplina. Tu camino al éxito continúa mañana.</p>";
    userData.sessionId = userData.sessionId < 21 ? userData.sessionId + 1 : 1;
    userData.step = 0;
    guardarProgreso();
    nextBtn.style.display = "inline-block";
    restartBtn.style.display = "inline-block";
}

function guardarProgreso() {
    localStorage.setItem("maykamiData", JSON.stringify(userData));
    const dBar = document.getElementById("disciplina-bar");
    if (dBar) dBar.style.width = userData.disciplina + "%";
}

function limpiarEstado() {
    abortController.abort = true;
    abortController = { abort: false };
    window.speechSynthesis.cancel();
}

/* ==================== AMBIENTE VISUAL (30 PAISAJES) ==================== */
function initGallery() {
    gallery.innerHTML = "";
    for (let i = 0; i < 30; i++) {
        const div = document.createElement("div");
        div.className = "slide";
        div.style.backgroundImage = `url(https://picsum.photos/1920/1080?nature&sig=${i + (userData.sessionId * 30)})`;
        gallery.appendChild(div);
    }
    const slides = document.querySelectorAll(".slide");
    if (slides.length > 0) slides[0].classList.add("active");
    setInterval(() => {
        slides[slideIndex].classList.remove("active");
        slideIndex = (slideIndex + 1) % slides.length;
        slides[slideIndex].classList.add("active");
    }, 8000);
}

/* ==================== EVENTOS ==================== */
startBtn.onclick = async () => {
    startBtn.style.display = "none";
    if (audio) { 
        audio.volume = 0.01; // Casi inaudible, solo para ambiente natural suave
        audio.play(); 
    }
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

guardarProgreso();
