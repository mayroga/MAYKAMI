// ===================================
// STATIC/SCRIPTS.JS COMPLETO MAYKAMI
// ===================================

const startBtn = document.getElementById("start-btn");
const nextBtn = document.getElementById("next-btn");
const backBtn = document.getElementById("back-btn");
const restartBtn = document.getElementById("restart-btn");
const block = document.getElementById("block");
const visualCircle = document.getElementById("visual-circle");
const gallery = document.getElementById("visual-gallery");
const natureAudio = document.getElementById("nature-audio");

let sesiones = []; // Cargar tu JSON de sesiones aquí
let currentSesion = 0;
let currentBloque = 0;
let abortController = null;

// ========================
// INICIAR SESIÓN
// ========================
startBtn.addEventListener("click", () => {
    startBtn.style.display = "none";
    nextBtn.style.display = "inline-block";
    backBtn.style.display = "inline-block";
    natureAudio.volume = 0.15;
    natureAudio.play();
    mostrarBloque();
});

// ========================
// BOTONES
// ========================
nextBtn.addEventListener("click", () => {
    if (currentBloque < sesiones[currentSesion].bloques.length - 1) {
        currentBloque++;
        mostrarBloque();
    }
});

backBtn.addEventListener("click", () => {
    if (currentBloque > 0) {
        currentBloque--;
        mostrarBloque();
    }
});

restartBtn.addEventListener("click", () => {
    currentBloque = 0;
    mostrarBloque();
});

// ========================
// LIMPIAR ESTADO
// ========================
function limpiarEstado() {
    if (abortController) abortController.abort();
    abortController = new AbortController();
    visualCircle.className = "";
    block.innerHTML = "";
    gallery.innerHTML = "";
}

// ========================
// FUNCIONES VOZ
// ========================
function hablarTexto(texto, signal) {
    return new Promise((resolve) => {
        const utterance = new SpeechSynthesisUtterance(texto);
        utterance.lang = "es-ES";
        utterance.rate = 1;
        utterance.pitch = 1;

        utterance.onend = () => resolve();
        utterance.onerror = () => resolve();

        if (signal) {
            signal.addEventListener("abort", () => {
                window.speechSynthesis.cancel();
                resolve();
            });
        }

        window.speechSynthesis.speak(utterance);
    });
}

// ========================
// FUNCIONES RESPIRACIÓN
// ========================
async function ejecutarRespiracion(pasos, signal) {
    for (let paso of pasos) {
        if (signal && signal.aborted) return;
        block.innerHTML = paso.texto;
        // Detectar tipo de respiración
        if (/Inhala/i.test(paso.texto)) {
            visualCircle.className = "inhale";
        } else if (/Retiene/i.test(paso.texto)) {
            visualCircle.className = "hold";
        } else if (/Exhala/i.test(paso.texto)) {
            visualCircle.className = "exhale";
        } else {
            visualCircle.className = "";
        }
        // Tiempo de respiración
        await new Promise(r => setTimeout(r, (paso.duracion || 6) * 1000));
    }
    visualCircle.className = "";
}

// ========================
// FUNCION MOSTRAR BLOQUE
// ========================
async function mostrarBloque() {
    limpiarEstado();
    const localAbort = abortController;
    const bloque = sesiones[currentSesion].bloques[currentBloque];

    // Botones visibles
    nextBtn.style.display = currentBloque < sesiones[currentSesion].bloques.length - 1 ? "inline-block" : "none";
    backBtn.style.display = currentBloque > 0 ? "inline-block" : "none";

    try {
        switch (bloque.tipo) {
            case "voz":
            case "tvid":
            case "inteligencia_social":
            case "estrategia":
            case "historia":
            case "visualizacion":
            case "recompensa":
            case "decision":
            case "cierre":
                block.innerHTML = bloque.texto;
                await hablarTexto(bloque.texto, localAbort);
                break;

            case "respiracion":
                await ejecutarRespiracion([bloque], localAbort);
                await hablarTexto(`Finalizado: ${bloque.texto}`, localAbort);
                break;

            case "tvid_ejercicio_largo":
                const pasos = bloque.textos.map(txt => ({ texto: txt, duracion: 8 }));
                await ejecutarRespiracion(pasos, localAbort);
                await hablarTexto(`Ejercicio completado: ${bloque.titulo}`, localAbort);
                break;

            default:
                await hablarTexto("Bloque desconocido. Mantente presente y continúa con energía positiva.", localAbort);
                await ejecutarRespiracion([{ texto: "Respira profundo", duracion: 6 }], localAbort);
        }
    } catch (e) {
        await hablarTexto("Ocurrió un error inesperado. Mantente presente y continúa.", localAbort);
        await ejecutarRespiracion([{ texto: "Respira y siente calma", duracion: 6 }], localAbort);
    }

    // Último bloque de la sesión
    if (currentBloque >= sesiones[currentSesion].bloques.length - 1) {
        block.innerHTML += "<br><i>¡Has completado la sesión! Respira profundo y prepárate para mañana.</i>";
        restartBtn.style.display = "inline-block";
    }
}

// ========================
// CARGA DE SESIONES (Ejemplo JSON)
// ========================
fetch("/static/tvid_ejercicio.json")
    .then(res => res.json())
    .then(data => {
        sesiones = data;
        console.log("Sesiones cargadas:", sesiones.length);
    })
    .catch(err => console.error("Error cargando sesiones:", err));
