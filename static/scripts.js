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

let abortController = { abort: false }; // Control global anti-freeze
let sesiones = [];
let currentSesion = 0;
let currentBloque = 0;

/* ========================= */
/* GALERÍA DE PAISAJES */
/* ========================= */
let slideIndex = 0;
for (let i = 0; i < 20; i++) {
    const div = document.createElement("div");
    div.className = "slide";
    div.style.backgroundImage = `url(https://picsum.photos/1920/1080?nature&sig=${i})`;
    gallery.appendChild(div);
}
const slides = document.querySelectorAll(".slide");
if(slides.length > 0) slides[0].classList.add("active");
setInterval(() => {
    slides[slideIndex].classList.remove("active");
    slideIndex = (slideIndex + 1) % slides.length;
    slides[slideIndex].classList.add("active");
}, 7000);

/* ========================= */
/* CÍRCULO DE RESPIRACIÓN AUTOMÁTICO */
/* ========================= */
function setInhala() { circle.className = "inhale"; circle.innerText = "Inhala"; }
function setExhala() { circle.className = "exhale"; circle.innerText = "Exhala"; }
function setHold() { circle.className = "hold"; circle.innerText = "Retén"; }
function setPausa() { circle.className = ""; circle.innerText = "Pausa"; }

async function contadorRespiracion(segundos, texto, localAbort) {
    for (let i = segundos; i > 0; i--) {
        if (localAbort.abort) return;
        block.innerHTML = `${texto}<br><span style="font-size:40px">${i}</span>`;
        await new Promise(r => setTimeout(r, 1000));
    }
}

/* ========================= */
/* FUNCIONES DE VOZ Y TEXTO */
/* ========================= */
async function hablarYMostrar(texto, localAbort) {
    block.innerHTML = "";
    if(localAbort.abort) return;

    const utter = new SpeechSynthesisUtterance(texto);
    utter.lang = "es-ES";
    utter.rate = 0.9;

    const vozPromise = new Promise(res => { utter.onend = res; });
    speechSynthesis.speak(utter);

    // Máquina de escribir
    for (let char of texto) {
        if(localAbort.abort) return;
        block.innerHTML += char;
        await new Promise(r => setTimeout(r, 25));
    }

    await vozPromise;
}

/* ========================= */
/* PROCESAR TEXTO DE RESPIRACIÓN */
/* ========================= */
async function procesarRespiracion(texto, localAbort) {
    if(localAbort.abort) return;
    const regex = /Respira|Inhala:? (\d+)?|Exhala:? (\d+)?|Retiene:? (\d+)?/g;
    let match;
    while ((match = regex.exec(texto)) !== null) {
        if(localAbort.abort) return;
        if(match[0].startsWith("Inhala")) {
            const sec = match[1] ? parseInt(match[1]) : 4;
            setInhala();
            await contadorRespiracion(sec, "Inhala", localAbort);
        } else if(match[0].startsWith("Exhala")) {
            const sec = match[2] ? parseInt(match[2]) : 6;
            setExhala();
            await contadorRespiracion(sec, "Exhala", localAbort);
        } else if(match[0].startsWith("Retiene")) {
            const sec = match[3] ? parseInt(match[3]) : 4;
            setHold();
            await contadorRespiracion(sec, "Retén", localAbort);
        } else if(match[0].startsWith("Respira")) {
            block.innerHTML = "Respira profundo...";
            await new Promise(r => setTimeout(r, 2000));
        }
    }
    setPausa();
}

/* ========================= */
/* LIMPIAR ESTADO PARA EVITAR FREEZE */
/* ========================= */
function limpiarEstado() {
    abortController.abort = true;
    abortController = { abort: false };
    speechSynthesis.cancel();
    setPausa();
}

/* ========================= */
/* CARGAR SESIONES JSON */
/* ========================= */
async function cargarSesiones() {
    try {
        const res = await fetch("/tvid_ejercicio.json");
        const data = await res.json();
        sesiones = data.sesiones || [];
        if(sesiones.length === 0) sesiones = [{ bloques:[{ texto:"No hay sesiones disponibles." }] }];
    } catch(e) {
        sesiones = [{ bloques:[{ texto:"Error cargando JSON." }] }];
    }
}

/* ========================= */
/* MOSTRAR BLOQUE ACTUAL */
/* ========================= */
async function mostrarBloque() {
    limpiarEstado();
    const localAbort = abortController;
    const bloque = sesiones[currentSesion].bloques[currentBloque];

    // Botones inteligentes
    nextBtn.style.display = (currentBloque < sesiones[currentSesion].bloques.length - 1) ? "inline-block" : "none";
    backBtn.style.display = (currentBloque > 0) ? "inline-block" : "none";
    restartBtn.style.display = (currentBloque === sesiones[currentSesion].bloques.length -1) ? "inline-block" : "none";

    // Detectar si el bloque tiene respiración
    if(bloque.texto.includes("Respira") || bloque.ciclos) {
        await procesarRespiracion(bloque.texto, localAbort);
    } else {
        await hablarYMostrar(bloque.texto, localAbort);
    }
}

/* ========================= */
/* EVENTOS BOTONES */
/* ========================= */
startBtn.onclick = async () => {
    startBtn.style.display = "none";
    try { audio.volume = 0.2; audio.play(); } catch(e){}
    await cargarSesiones();
    currentBloque = 0;
    mostrarBloque();
};

nextBtn.onclick = () => {
    if(currentBloque < sesiones[currentSesion].bloques.length - 1) {
        currentBloque++;
        mostrarBloque();
    }
};
backBtn.onclick = () => {
    if(currentBloque > 0) {
        currentBloque--;
        mostrarBloque();
    }
};
restartBtn.onclick = () => {
    currentBloque = 0;
    mostrarBloque();
};
