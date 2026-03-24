/* ============================================================ */
/* MAYKAMI NEUROGAME ENGINE - BY MAY ROGA LLC                   */
/* ============================================================ */

const gallery = document.getElementById("visual-gallery");
const circle = document.getElementById("visual-circle");
const block = document.getElementById("block");
const startBtn = document.getElementById("start-btn");
const nextBtn = document.getElementById("next-btn");
const backBtn = document.getElementById("back-btn");
const restartBtn = document.getElementById("restart-btn");
const audio = document.getElementById("nature-audio");

// Elementos de progreso (Barras)
const discBar = document.getElementById("disciplina-bar");
const clarBar = document.getElementById("claridad-bar");
const calmaBar = document.getElementById("calma-bar");

let sesiones = [];
let currentSesion = 0;
let currentBloque = 0;
let abortController = { abort: false };
let slideIndex = 0;
let galleryInterval = null;

/* ==================== DATOS DE PROGRESO ==================== */
let userData = JSON.parse(localStorage.getItem("maykamiData")) || {
    disciplina: 40,
    claridad: 50,
    calma: 30
};

function updatePanel() {
    if (discBar) discBar.style.width = userData.disciplina + "%";
    if (clarBar) clarBar.style.width = userData.claridad + "%";
    if (calmaBar) calmaBar.style.width = userData.calma + "%";
    localStorage.setItem("maykamiData", JSON.stringify(userData));
}

function aplicarPenalizacion() {
    userData.calma = Math.max(0, userData.calma * 0.5);
    userData.disciplina = Math.max(0, userData.disciplina * 0.5);
    updatePanel();
    // No usamos 'hablar' directamente para no romper el flujo de promesas de procesarTexto
}

/* ========================= */
/* CONTROL DE ESTADOS        */
/* ========================= */
function limpiarEstado() {
    abortController.abort = true;
    abortController = { abort: false };
    window.speechSynthesis.cancel();
    circle.className = "";
    circle.innerText = "MAYKAMI";
    block.innerHTML = "";
}

function detectarRespiracion(texto) {
    const t = texto.toLowerCase();
    if (["inhala", "aspira", "llena", "aire"].some(p => t.includes(p))) { 
        circle.className = "inhale"; circle.innerText = "Inhala"; 
    }
    else if (["exhala", "suelta", "expulsa", "fuera"].some(p => t.includes(p))) { 
        circle.className = "exhale"; circle.innerText = "Exhala"; 
    }
    else if (["retén", "retiene", "pausa", "aguanta"].some(p => t.includes(p))) { 
        circle.className = "hold"; circle.innerText = "Retén"; 
    }
    else { circle.className = ""; circle.innerText = "MAYKAMI"; }
}

/* =============================== */
/* NÚCLEO DE VOZ Y ACCIÓN (AURA)   */
/* =============================== */
async function procesarTexto(texto, localAbort, duracion = 0, esQuiz = false) {
    if (localAbort.abort) return;

    window.speechSynthesis.cancel(); 
    detectarRespiracion(texto);
    block.innerHTML = "";

    const chars = texto.split("");
    for (let char of chars) {
        if (localAbort.abort) return;
        block.insertAdjacentHTML('beforeend', char);
        await new Promise(r => setTimeout(r, 20));
    }

    const mensaje = new SpeechSynthesisUtterance(texto);
    mensaje.lang = "es-ES";
    mensaje.rate = 0.9; 
   
    await new Promise(resolve => {
        mensaje.onend = resolve;
        mensaje.onerror = resolve; 
        window.speechSynthesis.speak(mensaje);
    });

    if (duracion > 0 && !localAbort.abort) {
        await iniciarContador(duracion, texto, localAbort);
    }

    if (!esQuiz && !localAbort.abort) await new Promise(r => setTimeout(r, 1200));
}

async function iniciarContador(segundos, texto, localAbort) {
    return new Promise(r => {
        let t = segundos;
        const timer = setInterval(() => {
            if (localAbort.abort) { clearInterval(timer); return; }
            block.innerHTML = `${texto}<br><span style="font-size:55px; font-weight:bold; color:#60a5fa;">${t}s</span>`;
            if (t <= 0) { clearInterval(timer); r(); }
            t--;
        }, 1000);
    });
}

/* ========================= */
/* LÓGICA DE QUIZ INTERACTIVO*/
/* ========================= */
async function ejecutarQuiz(bloque, localAbort) {
    const container = document.createElement("div");
    container.style.cssText = `max-width: 700px; margin: 20px auto; padding: 25px; background-color: ${bloque.color || "#1e293b"}; border-radius: 12px; color: #ffffff; text-align: center;`;
    block.appendChild(container);

    await procesarTexto(bloque.pregunta, localAbort, 0, true);

    const feedbackArea = document.createElement("div");
    feedbackArea.style.cssText = "margin-top:15px; font-weight:bold; color:#00d2ff; min-height:1.5em;";
    feedbackArea.innerText = "Selecciona una opción:";
    container.appendChild(feedbackArea);

    const btnContainer = document.createElement("div");
    btnContainer.style.marginTop = "15px";
    container.appendChild(btnContainer);

    nextBtn.disabled = true;
    nextBtn.style.opacity = "0.5";

    return new Promise(resolve => {
        bloque.opciones.forEach((opcion, index) => {
            const btn = document.createElement("button");
            btn.innerText = opcion;
            btn.style.cssText = "display:block; width:85%; margin:10px auto; padding:12px; border-radius:8px; cursor:pointer; background:#334155; color:white; border:1px solid #475569;";
            
            btn.onclick = async () => {
                const btns = btnContainer.querySelectorAll("button");
                btns.forEach(b => b.disabled = true);

                const esCorrecto = (index === bloque.correcta);
                const feedback = esCorrecto 
                    ? `¡Correcto! ${bloque.explicacion}` 
                    : `Incorrecto. ${bloque.explicacion}`;
                
                // Actualizar estadísticas MAYKAMI
                if (esCorrecto) {
                    userData.disciplina = Math.min(100, userData.disciplina + (bloque.recompensa || 5));
                } else {
                    userData.calma = Math.min(100, userData.calma + 2);
                }
                updatePanel();

                feedbackArea.innerHTML = `<strong>${esCorrecto ? "✅" : "❌"}</strong> ${feedback}`;
                await procesarTexto(feedback, localAbort);
                
                nextBtn.disabled = false;
                nextBtn.style.opacity = "1";
                resolve();
            };
            btnContainer.appendChild(btn);
        });
    });
}

/* ========================= */
/* NAVEGACIÓN Y CARGA        */
/* ========================= */
async function cargarSesiones() {
    try {
        const res = await fetch("/tvid_ejercicio.json");
        const data = await res.json();
        sesiones = data.sesiones || [];
    } catch (e) { console.error("Error en DB MAYKAMI."); }
}

async function mostrarBloque() {
    limpiarEstado();
    const localAbort = abortController;
    nextBtn.disabled = false;
    nextBtn.style.opacity = "1";

    if (!sesiones[currentSesion]) return;
    const bloques = sesiones[currentSesion].bloques;
    const bloque = bloques[currentBloque];

    // Visibilidad de botones
    const esUltimaSesion = (currentSesion === sesiones.length - 1);
    const esUltimoBloque = (currentBloque === bloques.length - 1);
    backBtn.style.display = (currentSesion === 0 && currentBloque === 0) ? "none" : "inline-block";
    nextBtn.style.display = (esUltimaSesion && esUltimoBloque) ? "none" : "inline-block";
    restartBtn.style.display = (esUltimaSesion && esUltimoBloque) ? "inline-block" : "none";

    try {
        if (bloque.tipo === "decision") {
            await ejecutarQuiz(bloque, localAbort);
        }
        else if (bloque.tipo === "tvid_ejercicio_largo") {
            for (let t of bloque.textos) {
                if (localAbort.abort) break;
                await procesarTexto(t, localAbort, 8);
            }
        }
        else if (bloque.texto) {
            const dur = (bloque.tipo === "respiracion") ? (bloque.duracion || 10) : 0;
            await procesarTexto(bloque.texto, localAbort, dur);
        }
    } catch (e) { console.log("Flujo interrumpido."); }
}

/* ========================= */
/* EVENTOS                   */
/* ========================= */
startBtn.onclick = async () => {
    startBtn.style.display = "none";
    if (audio) { audio.volume = 0.15; audio.play(); }
    initGallery();
    await cargarSesiones();
    currentSesion = 0;
    currentBloque = 0;
    mostrarBloque();
};

nextBtn.onclick = () => {
    if (nextBtn.disabled) return;
    if (currentBloque < sesiones[currentSesion].bloques.length - 1) {
        currentBloque++;
    } else if (currentSesion < sesiones.length - 1) {
        currentSesion++;
        currentBloque = 0;
    }
    mostrarBloque();
};

backBtn.onclick = () => {
    aplicarPenalizacion(); // Se penaliza por retroceder pasos
    if (currentBloque > 0) {
        currentBloque--;
    } else if (currentSesion > 0) {
        currentSesion--;
        currentBloque = sesiones[currentSesion].bloques.length - 1;
    }
    mostrarBloque();
};

restartBtn.onclick = () => {
    currentSesion = 0;
    currentBloque = 0;
    mostrarBloque();
};

// Inicializar panel al cargar
updatePanel();

/* ========================= */
/* GALERÍA DINÁMICA          */
/* ========================= */
function initGallery(total = 30) {
    if (!gallery) return;
    gallery.innerHTML = "";
    for (let i = 0; i < total; i++) {
        const div = document.createElement("div");
        div.className = "slide";
        div.style.backgroundImage = `url(https://picsum.photos/1920/1080?nature&sig=${i})`;
        gallery.appendChild(div);
    }
    const slides = document.querySelectorAll(".slide");
    if (slides.length > 0) slides[0].classList.add("active");

    if (galleryInterval) clearInterval(galleryInterval);
    galleryInterval = setInterval(() => {
        const currentSlides = document.querySelectorAll(".slide");
        if (currentSlides.length === 0) return;
        currentSlides[slideIndex].classList.remove("active");
        slideIndex = (slideIndex + 1) % currentSlides.length;
        currentSlides[slideIndex].classList.add("active");
    }, 7000);
}
