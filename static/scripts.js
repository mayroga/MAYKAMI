/* ========================= */
/* ELEMENTOS PRINCIPALES */
/* ========================= */
const gallery = document.getElementById("visual-gallery");
const circle = document.getElementById("visual-circle");
const block = document.getElementById("block");
const startBtn = document.getElementById("start-btn");
const nextBtn = document.getElementById("next-btn");
const backBtn = document.getElementById("back-btn");
const restartBtn = document.getElementById("restart-btn");
const audio = document.getElementById("nature-audio");

let sesiones = [];
let currentSesion = 0;
let currentBloque = 0;
let abortController = { abort: false }; 
let slideIndex = 0;
let galleryInterval = null;

/* ========================= */
/* GALERÍA DINÁMICA */
/* ========================= */
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

    if (galleryInterval) clearInterval(galleryInterval);
    galleryInterval = setInterval(() => {
        const currentSlides = document.querySelectorAll(".slide");
        if (currentSlides.length === 0) return;
        currentSlides[slideIndex].classList.remove("active");
        slideIndex = (slideIndex + 1) % currentSlides.length;
        currentSlides[slideIndex].classList.add("active");
    }, 7000);
}

/* ========================= */
/* CONTROL DE ESTADOS Y GLOBO */
/* ========================= */
function limpiarEstado() {
    abortController.abort = true; 
    abortController = { abort: false }; 
    speechSynthesis.cancel();
    circle.className = "";
    circle.innerText = "Respira";
    block.innerHTML = "";
}

function detectarRespiracion(texto) {
    const t = texto.toLowerCase();
    // Diccionario de disparadores para el globo
    const inhala = ["inhala", "aspira", "llena", "aire", "dentro", "oxígeno"];
    const exhala = ["exhala", "suelta", "expulsa", "fuera", "vacía"];
    const retiene = ["retén", "retiene", "pausa", "fija", "aguanta"];
    const general = ["respira", "respiración", "pulmones", "diafragma"];

    if (inhala.some(palabra => t.includes(palabra))) {
        circle.className = "inhale";
        circle.innerText = "Inhala";
    } else if (exhala.some(palabra => t.includes(palabra))) {
        circle.className = "exhale";
        circle.innerText = "Exhala";
    } else if (retiene.some(palabra => t.includes(palabra))) {
        circle.className = "hold";
        circle.innerText = "Retén";
    } else if (general.some(palabra => t.includes(palabra))) {
        circle.className = "inhale"; // Animación estándar
        circle.innerText = "Respira";
    }
}

/* ========================= */
/* SISTEMA DE VOZ Y CRONÓMETRO */
/* ========================= */
async function procesarTexto(texto, localAbort, duracion = 0) {
    if (localAbort.abort) return;

    detectarRespiracion(texto);

    // Escritura mecánica
    block.innerHTML = "";
    for (let char of texto) {
        if (localAbort.abort) return;
        block.innerHTML += char;
        await new Promise(r => setTimeout(r, 20));
    }

    // Voz profesional
    const mensaje = new SpeechSynthesisUtterance(texto);
    mensaje.lang = "es-ES";
    mensaje.rate = 0.9;
    speechSynthesis.speak(mensaje);

    // Cronómetro visual si hay duración
    if (duracion > 0) {
        await new Promise(r => {
            let t = duracion;
            const timer = setInterval(() => {
                if (localAbort.abort) { clearInterval(timer); return; }
                block.innerHTML = `${texto}<br><span style="font-size:50px; font-weight:bold; color:#3b82f6;">${t}s</span>`;
                t--;
                if (t < 0) { clearInterval(timer); r(); }
            }, 1000);
        });
    }
}

/* ========================= */
/* CARGA Y NAVEGACIÓN */
/* ========================= */
async function cargarSesiones() {
    try {
        const res = await fetch("/tvid_ejercicio.json");
        const data = await res.json();
        sesiones = data.sesiones || [];
    } catch (e) {
        console.error("Error crítico de carga.");
    }
}

async function mostrarBloque() {
    limpiarEstado();
    const localAbort = abortController;

    if (!sesiones[currentSesion]) return;
    const bloques = sesiones[currentSesion].bloques;
    const bloque = bloques[currentBloque];

    // LÓGICA DE BOTONES FINAL
    const esUltimaSesion = (currentSesion === sesiones.length - 1);
    const esUltimoBloque = (currentBloque === bloques.length - 1);

    // Botón Atrás: Siempre visible excepto en el inicio absoluto
    backBtn.style.display = (currentSesion === 0 && currentBloque === 0) ? "none" : "inline-block";
    
    // Botón Siguiente: Desaparece SOLO al final de la sesión 21
    nextBtn.style.display = (esUltimaSesion && esUltimoBloque) ? "none" : "inline-block";
    
    // Botón Reiniciar: Solo aparece cuando el viaje termina
    restartBtn.style.display = (esUltimaSesion && esUltimoBloque) ? "inline-block" : "none";

    try {
        if (bloque.tipo === "decision") {
            // Lee la pregunta y las opciones para reflexión
            const opcionesTxt = bloque.opciones.join(", ");
            await procesarTexto(`${bloque.pregunta}. Considera estas opciones: ${opcionesTxt}`, localAbort);
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
    } catch (e) {
        console.log("Flujo continuo.");
    }
}

/* ========================= */
/* ACCIONES */
/* ========================= */
startBtn.onclick = async () => {
    startBtn.style.display = "none";
    audio.volume = 0.2;
    audio.play();
    initGallery(30);
    await cargarSesiones();
    currentSesion = 0;
    currentBloque = 0;
    mostrarBloque();
};

nextBtn.onclick = () => {
    if (currentBloque < sesiones[currentSesion].bloques.length - 1) {
        currentBloque++;
    } else if (currentSesion < sesiones.length - 1) {
        currentSesion++;
        currentBloque = 0;
    }
    mostrarBloque();
};

backBtn.onclick = () => {
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
