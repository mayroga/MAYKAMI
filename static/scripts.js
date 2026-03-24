* ========================= */
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
/* CONTROL DE GLOBO Y ESTADOS */
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
    const inhala = ["inhala", "aspira", "llena", "aire", "dentro", "oxígeno"];
    const exhala = ["exhala", "suelta", "expulsa", "fuera", "vacía"];
    const retiene = ["retén", "retiene", "pausa", "fija", "aguanta"];
    const general = ["respira", "respiración", "pulmones", "diafragma"];

    if (inhala.some(p => t.includes(p))) { circle.className = "inhale"; circle.innerText = "Inhala"; }
    else if (exhala.some(p => t.includes(p))) { circle.className = "exhale"; circle.innerText = "Exhala"; }
    else if (retiene.some(p => t.includes(p))) { circle.className = "hold"; circle.innerText = "Retén"; }
    else if (general.some(p => t.includes(p))) { circle.className = "inhale"; circle.innerText = "Respira"; }
}

/* ========================= */
/* NÚCLEO DE VOZ Y ACCIÓN */
/* ========================= */
async function procesarTexto(texto, localAbort, duracion = 0, esQuiz = false) {
    if (localAbort.abort) return;

    detectarRespiracion(texto);
    block.innerHTML = "";

    // Escritura mecánica
    for (let char of texto) {
        if (localAbort.abort) return;
        block.innerHTML += char;
        await new Promise(r => setTimeout(r, 25));
    }

    // Voz
    const mensaje = new SpeechSynthesisUtterance(texto);
    mensaje.lang = "es-ES";
    mensaje.rate = 0.9;
   
    // Esperar a que la voz termine antes de seguir
    await new Promise(resolve => {
        mensaje.onend = resolve;
        speechSynthesis.speak(mensaje);
    });

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

    // Pausa de asimilación para evitar solapamientos
    if (!esQuiz) await new Promise(r => setTimeout(r, 1500));
}

/* ========================= */
/* LÓGICA DE QUIZ INTERACTIVO */
/* ========================= */
async function ejecutarQuiz(bloque, localAbort) {
    // 1. Crear contenedor visual (Estilo Kamizen)
    const container = document.createElement("div");
    container.style.cssText = `
        max-width: 700px;
        margin: 20px auto;
        padding: 25px;
        background-color: ${bloque.color || "#1e293b"};
        border-radius: 12px;
        box-shadow: 0 0 20px rgba(0,0,0,0.5);
        color: #ffffff;
        text-align: center;
    `;
    block.appendChild(container);

    // 2. Leer pregunta y mostrarla en el cuadro
    await procesarTexto(bloque.pregunta, localAbort, 0, true);

    const feedbackArea = document.createElement("div");
    feedbackArea.style.cssText = "margin-top:15px; font-weight:bold; color:#00d2ff; min-height:1.5em;";
    feedbackArea.innerText = "Selecciona una opción:";
    container.appendChild(feedbackArea);

    const btnContainer = document.createElement("div");
    btnContainer.style.marginTop = "15px";
    container.appendChild(btnContainer);

    // Bloqueamos botón Siguiente hasta responder
    nextBtn.disabled = true;
    nextBtn.style.opacity = "0.5";

    // 3. Crear botones de opciones
    return new Promise(resolve => {
        bloque.opciones.forEach((opcion, index) => {
            const btn = document.createElement("button");
            btn.innerText = opcion;
            btn.style.cssText = "display:block; width:85%; margin:10px auto; padding:12px; border-radius:8px; cursor:pointer; background:#334155; color:white; border:1px solid #475569; font-size:1.1em;";
           
            btn.onclick = async () => {
                // Deshabilitar botones para evitar múltiples clics
                const btns = btnContainer.querySelectorAll("button");
                btns.forEach(b => b.disabled = true);

                const esCorrecto = (index === bloque.correcta);
                const feedback = esCorrecto
                    ? `¡Correcto! ${bloque.explicacion}`
                    : `Incorrecto. ${bloque.explicacion}`;
               
                // Mostrar y Hablar la explicación siempre
                feedbackArea.innerHTML = `<strong>${esCorrecto ? "✅" : "❌"}</strong> ${feedback}`;
                await procesarTexto(feedback, localAbort);
               
                // Habilitar avance
                nextBtn.disabled = false;
                nextBtn.style.opacity = "1";
                resolve();
            };
            btnContainer.appendChild(btn);
        });
    });
}

/* ========================= */
/* CARGA Y NAVEGACIÓN */
/* ========================= */
async function cargarSesiones() {
    try {
        const res = await fetch("/tvid_ejercicio.json");
        const data = await res.json();
        sesiones = data.sesiones || [];
    } catch (e) { console.error("Error de carga de base de datos."); }
}

async function mostrarBloque() {
    limpiarEstado();
    const localAbort = abortController;
    nextBtn.disabled = false;
    nextBtn.style.opacity = "1";

    if (!sesiones[currentSesion]) return;
    const bloques = sesiones[currentSesion].bloques;
    const bloque = bloques[currentBloque];

    // Lógica de visibilidad final
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
    } catch (e) { console.log("Error en el flujo de bloques."); }
}

/* ========================= */
/* EVENTOS DE CONTROL */
/* ========================= */
startBtn.onclick = async () => {
    startBtn.style.display = "none";
    audio.volume = 0.15;
    audio.play();
    initGallery(30);
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
