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

// Barras de progreso
const discBar = document.getElementById("disciplina-bar");
const clarBar = document.getElementById("claridad-bar");
const calmaBar = document.getElementById("calma-bar");

let sesiones = [];
let currentSesion = 0;
let currentBloque = 0;
let abortController = { abort: false };
let userData = JSON.parse(localStorage.getItem("maykamiData")) || { disciplina: 40, claridad: 50, calma: 30 };

function updatePanel() {
    if (discBar) discBar.style.width = userData.disciplina + "%";
    if (clarBar) clarBar.style.width = userData.claridad + "%";
    if (calmaBar) calmaBar.style.width = userData.calma + "%";
    localStorage.setItem("maykamiData", JSON.stringify(userData));
}

/* ========================= */
/* NÚCLEO DE VOZ Y ACCIÓN    */
/* ========================= */
async function procesarTexto(texto, localAbort, duracion = 0, esQuiz = false) {
    if (localAbort.abort) return;
    window.speechSynthesis.cancel(); 
    
    // Detectar respiración para mover el globo
    const t = texto.toLowerCase();
    if (["inhala", "aire", "llena"].some(p => t.includes(p))) circle.className = "inhale";
    else if (["exhala", "suelta", "fuera"].some(p => t.includes(p))) circle.className = "exhale";
    else if (["retén", "pausa"].some(p => t.includes(p))) circle.className = "hold";
    else circle.className = "";

    block.innerHTML = "";
    for (let char of texto.split("")) {
        if (localAbort.abort) return;
        block.insertAdjacentHTML('beforeend', char);
        await new Promise(r => setTimeout(r, 20));
    }

    const mensaje = new SpeechSynthesisUtterance(texto);
    mensaje.lang = "es-ES";
    mensaje.rate = 0.9;
    await new Promise(resolve => {
        mensaje.onend = resolve;
        window.speechSynthesis.speak(mensaje);
    });

    if (duracion > 0) await iniciarContador(duracion, texto, localAbort);
}

async function iniciarContador(segundos, texto, localAbort) {
    return new Promise(r => {
        let t = segundos;
        const timer = setInterval(() => {
            if (localAbort.abort) { clearInterval(timer); return; }
            block.innerHTML = `${texto}<br><span style="font-size:50px; color:#60a5fa;">${t}s</span>`;
            if (t <= 0) { clearInterval(timer); r(); }
            t--;
        }, 1000);
    });
}

/* ========================= */
/* BOTONES DE RESPUESTA      */
/* ========================= */
async function ejecutarQuiz(bloque, localAbort) {
    // 1. Decir la pregunta
    await procesarTexto(bloque.pregunta, localAbort, 0, true);

    // 2. Crear contenedor de opciones
    const container = document.createElement("div");
    container.style.marginTop = "20px";
    block.appendChild(container);

    // Ocultar botón "Siguiente" para obligar a elegir
    nextBtn.style.display = "none";

    return new Promise(resolve => {
        bloque.opciones.forEach((opcion, index) => {
            const btn = document.createElement("button");
            btn.innerText = opcion;
            btn.style.cssText = "display:block; width:100%; margin:10px 0; padding:15px; border-radius:10px; background:#1e293b; color:white; border:1px solid #3b82f6; cursor:pointer; font-size:1.1rem;";
            
            btn.onclick = async () => {
                const esCorrecto = (index === bloque.correcta);
                const feedback = esCorrecto ? `Correcto. ${bloque.explicacion}` : `Incorrecto. ${bloque.explicacion}`;
                
                // Actualizar progreso
                if (esCorrecto) userData.disciplina += 5; else userData.calma += 2;
                updatePanel();

                container.innerHTML = `<p style="color:${esCorrecto ? '#4ade80' : '#f87171'}">${feedback}</p>`;
                await procesarTexto(feedback, localAbort);
                
                nextBtn.style.display = "inline-block"; // Mostrar siguiente tras responder
                resolve();
            };
            container.appendChild(btn);
        });
    });
}

/* ========================= */
/* NAVEGACIÓN                */
/* ========================= */
async function mostrarBloque() {
    abortController.abort = true;
    abortController = { abort: false };
    const localAbort = abortController;

    const sesion = sesiones[currentSesion];
    if (!sesion) return;
    const bloque = sesion.bloques[currentBloque];

    // Control de botones de navegación
    backBtn.style.display = (currentBloque > 0) ? "inline-block" : "none";
    restartBtn.style.display = (currentBloque === sesion.bloques.length - 1) ? "inline-block" : "none";
    nextBtn.style.display = (currentBloque < sesion.bloques.length - 1) ? "inline-block" : "none";

    if (bloque.tipo === "decision") {
        await ejecutarQuiz(bloque, localAbort);
    } else if (bloque.tipo === "respiracion") {
        await procesarTexto(bloque.texto, localAbort, bloque.duracion || 10);
    } else {
        await procesarTexto(bloque.texto, localAbort);
    }
}

startBtn.onclick = async () => {
    startBtn.style.display = "none";
    if (audio) { audio.volume = 0.08; audio.play(); }
    const res = await fetch("/tvid_ejercicio.json");
    const data = await res.json();
    sesiones = data.sesiones;
    mostrarBloque();
};

nextBtn.onclick = () => { currentBloque++; mostrarBloque(); };
backBtn.onclick = () => { userData.disciplina -= 10; updatePanel(); currentBloque--; mostrarBloque(); };
restartBtn.onclick = () => { currentBloque = 0; mostrarBloque(); };

updatePanel();
