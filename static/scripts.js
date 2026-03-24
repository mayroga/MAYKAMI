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

let abortController = { abort: false }; // Interruptor global anti-freeze
let sesiones = [];
let currentSesion = 0;
let currentBloque = 0;

/* ========================= */
/* GALERÍA DE PAISAJES (Optimizada) */
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

// Cambio de paisaje cada 7 segundos
setInterval(() => {
    slides[slideIndex].classList.remove("active");
    slideIndex = (slideIndex + 1) % slides.length;
    slides[slideIndex].classList.add("active");
}, 7000);

/* ========================= */
/* FUNCIONES DE CÍRCULO DE RESPIRACIÓN */
/* ========================= */
function setInhala() {
    circle.className = "inhale";
    circle.innerText = "Inhala";
}
function setExhala() {
    circle.className = "exhale";
    circle.innerText = "Exhala";
}
function setHold() {
    circle.className = "hold";
    circle.innerText = "Retén";
}
function limpiarEstado() {
    abortController.abort = true; // Detener procesos previos
    abortController = { abort: false }; // Nuevo controlador
    speechSynthesis.cancel();       // Detener voz
    circle.className = "";          // Limpiar animación
}

/* ========================= */
/* FUNCIONES DE TEXTO Y VOZ */
/* ========================= */
async function hablarYMostrar(texto, localAbort) {
    block.innerHTML = "";
    if(localAbort.abort) return;

    // Voz
    const utter = new SpeechSynthesisUtterance(texto);
    utter.lang = "es-ES";
    utter.rate = 0.9;

    // Esperar a que termine la voz antes de continuar con el texto
    const vozPromise = new Promise(res => {
        utter.onend = res;
    });
    speechSynthesis.speak(utter);

    // Efecto máquina de escribir mientras habla
    for (let char of texto) {
        if(localAbort.abort) return;
        block.innerHTML += char;
        await new Promise(r => setTimeout(r, 25));
    }

    await vozPromise;
}

async function contadorRespiracion(texto, segundos, localAbort) {
    for (let i = segundos; i > 0; i--) {
        if(localAbort.abort) return;
        block.innerHTML = `${texto}<br><span style="font-size:40px">${i}</span>`;
        await new Promise(r => setTimeout(r, 1000));
    }
}

/* ========================= */
/* CARGA DE SESIONES JSON */
/* ========================= */
async function cargarSesiones() {
    try {
        const res = await fetch("/tvid_ejercicio.json");
        const data = await res.json();
        sesiones = data.sesiones || [];
        if(sesiones.length === 0) sesiones = [{ bloques:[{ texto: "No hay sesiones disponibles." }] }];
    } catch(e) {
        sesiones = [{ bloques:[{ texto: "Error cargando JSON. Comprueba el archivo." }] }];
    }
}

/* ========================= */
/* MOSTRAR BLOQUE ACTUAL */
/* ========================= */
async function mostrarBloque() {
    limpiarEstado();
    const localAbort = abortController;

    const bloque = sesiones[currentSesion].bloques[currentBloque];

    // Botones visibles según contexto
    nextBtn.style.display = (currentBloque < sesiones[currentSesion].bloques.length - 1) ? "inline-block" : "none";
    backBtn.style.display = (currentBloque > 0) ? "inline-block" : "none";
    restartBtn.style.display = (currentBloque === sesiones[currentSesion].bloques.length - 1) ? "inline-block" : "none";

    // Ciclos de respiración
    if(bloque.ciclos) {
        for (let i = 0; i < bloque.ciclos; i++) {
            if(localAbort.abort) return;
            setInhala(); await contadorRespiracion("Inhala", bloque.inhala || 4, localAbort);
            setHold();   await contadorRespiracion("Retén", bloque.hold || 4, localAbort);
            setExhala(); await contadorRespiracion("Exhala", bloque.exhala || 6, localAbort);
        }
        circle.className = "";
        circle.innerText = "Pausa";
        block.innerHTML = "Ciclo completado";
    } else {
        await hablarYMostrar(bloque.texto || "...", localAbort);
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
