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

/* ==================== MOTOR DE VOZ Y GLOBO ==================== */
function hablar(texto) {
    return new Promise(resolve => {
        window.speechSynthesis.cancel();
        const utter = new SpeechSynthesisUtterance(texto.replace(/<[^>]*>/g, ""));
        utter.lang = "es-ES";
        utter.rate = 0.90; // Peso y autoridad

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

/* ==================== COMANDO DE LECTURA TOTAL ==================== */
async function escribirTextoYHablar(texto, localAbort) {
    if (localAbort.abort) return;
    block.innerHTML = "";
    
    // 1. La voz guía primero
    await hablar(texto);

    // 2. El texto refuerza después
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
        }, 25);
    });

    // PAUSA DE RESPIRACIÓN GUIADA POR VOZ (No en silencio)
    if (!localAbort.abort) {
        await iniciarContadorRespiratorio(12, "Fija esta enseñanza...", localAbort);
    }
}

/* ==================== CONTADOR CON VOZ ACTIVA (RESPIRACIÓN) ==================== */
async function iniciarContadorRespiratorio(segundos, textoBase, localAbort) {
    return new Promise(async (r) => {
        let t = segundos;
        
        const timer = setInterval(async () => {
            if (localAbort.abort) { clearInterval(timer); return; }

            // La voz guía en puntos clave del contador
            if (t === 12) hablar("Inhala profundamente el éxito");
            if (t === 8) hablar("Retén y siente tu poder");
            if (t === 4) hablar("Exhala y libera toda tensión");

            block.innerHTML = `${textoBase}<br><span style="font-size:55px; color:#60a5fa; font-weight:bold;">${t}s</span>`;
            
            if (t <= 0) {
                clearInterval(timer);
                r();
            }
            t--;
        }, 1000);
    });
}

/* ==================== LÓGICA DE SESIONES (1-21) ==================== */
async function cargarSesion() {
    try {
        const res = await fetch("/tvid_ejercicio.json");
        const data = await res.json();
        sesionActualData = data.sesiones.find(s => s.id === userData.sessionId) || data.sesiones[0];
    } catch (e) {
        block.innerText = "Error cargando la base de datos.";
    }
}

function limpiarEstado() {
    abortController.abort = true;
    abortController = { abort: false };
    window.speechSynthesis.cancel();
}

async function mostrarBloque() {
    limpiarEstado();
    const localAbort = abortController;
    const bloque = sesionActualData.bloques[userData.step];

    if (!bloque) { finalizarSesion(); return; }

    nextBtn.style.display = "none";
    backBtn.style.display = userData.step > 0 ? "inline-block" : "none";

    if (bloque.textos && Array.isArray(bloque.textos)) {
        for (const frase of bloque.textos) {
            if (localAbort.abort) return;
            await escribirTextoYHablar(frase, localAbort);
        }
        nextBtn.style.display = "inline-block";
    } 
    else if (bloque.texto) {
        await escribirTextoYHablar(bloque.texto, localAbort);
        if (bloque.duracion) await iniciarContadorRespiratorio(bloque.duracion, "Mantén el enfoque...", localAbort);
        if (bloque.tipo === "cierre") finalizarSesion();
        else nextBtn.style.display = "inline-block";
    }
}

function finalizarSesion() {
    block.innerHTML = "<h2>Sesión Completada</h2><p>Tu disciplina es tu mayor activo. El progreso ha sido guardado.</p>";
    userData.sessionId = userData.sessionId < 21 ? userData.sessionId + 1 : 1;
    userData.step = 0;
    guardarProgreso();
    nextBtn.style.display = "inline-block";
    restartBtn.style.display = "inline-block";
}

function guardarProgreso() {
    localStorage.setItem("maykamiData", JSON.stringify(userData));
}

/* ==================== INTERFAZ VISUAL ==================== */
function initGallery() {
    gallery.innerHTML = "";
    for (let i = 0; i < 30; i++) {
        const div = document.createElement("div");
        div.className = "slide";
        div.style.backgroundImage = `url(https://picsum.photos/1920/1080?nature&sig=${i + (userData.sessionId * 10)})`;
        gallery.appendChild(div);
    }
    const slides = document.querySelectorAll(".slide");
    if (slides.length > 0) slides[0].classList.add("active");
    setInterval(() => {
        slides[slideIndex].classList.remove("active");
        slideIndex = (slideIndex + 1) % slides.length;
        slides[slideIndex].classList.add("active");
    }, 9000);
}

/* ==================== BOTONES ==================== */
startBtn.onclick = async () => {
    startBtn.style.display = "none";
    if (audio) { 
        audio.src = "assets/waterfall.mp3"; // Cambiar a sonido de agua/cascada
        audio.volume = 0.01; // Casi inaudible
        audio.play(); 
    }
    initGallery();
    await cargarSesion();
    
    // Bienvenida Motivadora de Peso
    await escribirTextoYHablar(`Bienvenido a la sesión ${userData.sessionId}. Hoy fortalecerás tu mente.`, abortController);
    
    mostrarBloque();
};

nextBtn.onclick = () => {
    userData.step++;
    guardarProgreso();
    mostrarBloque();
};

guardarProgreso();
