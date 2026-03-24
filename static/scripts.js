/* ========================= */
/* ELEMENTOS PRINCIPALES */
/* ========================= */
const gallery = document.getElementById("visual-gallery");
const circle = document.getElementById("visual-circle");
const block = document.getElementById("block");
const startBtn = document.getElementById("start-btn");
const nextBtn = document.getElementById("next-btn");
const backBtn = document.getElementById("back-btn");
const audio = document.getElementById("nature-audio");

let sesionActiva = false;
let abortController = { abort: false }; // Nuestro interruptor de seguridad

/* ========================= */
/* GALERIA DE PAISAJES (Optimizado) */
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
/* FUNCIONES DE ESTADO */
/* ========================= */
function limpiarEstado() {
    abortController.abort = true; // Detenemos cualquier proceso previo
    abortController = { abort: false }; // Creamos uno nuevo
    speechSynthesis.cancel();
    circle.className = ""; // Limpia animaciones previas
}

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

/* ========================= */
/* MOTOR DE TEXTO Y VOZ */
/* ========================= */
async function hablarYMostrar(texto, localAbort) {
    block.innerHTML = "";
    if (localAbort.abort) return;

    // Voz
    const u = new SpeechSynthesisUtterance(texto);
    u.lang = "es-ES";
    u.rate = 0.9;
    speechSynthesis.speak(u);

    // Efecto máquina de escribir
    for (let char of texto) {
        if (localAbort.abort) return;
        block.innerHTML += char;
        await new Promise(r => setTimeout(r, 30));
    }
}

async function contadorRespiracion(texto, segundos, localAbort) {
    for (let i = segundos; i > 0; i--) {
        if (localAbort.abort) return;
        block.innerHTML = `${texto}<br><span style="font-size:40px">${i}</span>`;
        await new Promise(r => setTimeout(r, 1000));
    }
}

/* ========================= */
/* LÓGICA DE SESIÓN */
/* ========================= */
let sesiones = [];
let currentSesion = 0;
let currentBloque = 0;

async function cargarSesiones() {
    try {
        const res = await fetch("/tvid_ejercicio.json");
        const data = await res.json();
        sesiones = data.sesiones || [];
    } catch (e) {
        sesiones = [{ bloques: [{ texto: "Error al cargar sesión. Revisa el archivo JSON." }] }];
    }
}

async function mostrarBloque() {
    limpiarEstado();
    const localAbort = abortController; // Referencia local para este hilo
    
    const bloque = sesiones[currentSesion].bloques[currentBloque];
    
    // Control de botones
    nextBtn.style.display = (currentBloque < sesiones[currentSesion].bloques.length - 1) ? "inline-block" : "none";
    backBtn.style.display = (currentBloque > 0) ? "inline-block" : "none";

    if (bloque.ciclos) {
        for (let i = 0; i < bloque.ciclos; i++) {
            if (localAbort.abort) return;
            setInhala(); await contadorRespiracion("Inhala", 4, localAbort);
            setHold();   await contadorRespiracion("Retén", 4, localAbort);
            setExhala(); await contadorRespiracion("Exhala", 6, localAbort);
        }
        circle.className = "";
        circle.innerText = "Pausa";
        block.innerHTML = "Ciclo completado";
    } else {
        await hablarYMostrar(bloque.texto || "...", localAbort);
    }
}

/* ========================= */
/* EVENTOS */
/* ========================= */
startBtn.onclick = async () => {
    startBtn.style.display = "none";
    try { audio.volume = 0.2; audio.play(); } catch(e) {}
    await cargarSesiones();
    currentBloque = 0;
    mostrarBloque();
};

nextBtn.onclick = () => { currentBloque++; mostrarBloque(); };
backBtn.onclick = () => { if (currentBloque > 0) { currentBloque--; mostrarBloque(); } };
