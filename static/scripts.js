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

/* ========================= */
/* GALERIA DE PAISAJES */
/* ========================= */
let slides = [];
let slideIndex = 0;
for (let i = 0; i < 20; i++) {
    const div = document.createElement("div");
    div.className = "slide";
    div.style.backgroundImage = `url(https://picsum.photos/1920/1080?nature&sig=${i})`;
    gallery.appendChild(div);
}
slides = document.querySelectorAll(".slide");
slides[0].classList.add("active");

setInterval(() => {
    slides[slideIndex].classList.remove("active");
    slideIndex = (slideIndex + 1) % slides.length;
    slides[slideIndex].classList.add("active");
}, 7000);

/* ========================= */
/* CÍRCULO DE RESPIRACIÓN */
/* ========================= */
function setInhala() {
    circle.className = "inhale";
    circle.innerText = "Inhala";
    circle.style.borderColor = "#3b82f6";
}
function setExhala() {
    circle.className = "exhale";
    circle.innerText = "Exhala";
    circle.style.borderColor = "#ffffff";
}
function setHold() {
    circle.className = "hold";
    circle.innerText = "Retén";
    circle.style.borderColor = "#34d399"; // verde menta sutil
}

/* ========================= */
/* VOZ SIEMPRE DISPONIBLE */
/* ========================= */
function getVoice() {
    const voices = speechSynthesis.getVoices();
    return voices.find(v => v.lang.startsWith("es")) || voices[0];
}

function hablar(texto) {
    return new Promise(resolve => {
        try {
            speechSynthesis.cancel();
            const u = new SpeechSynthesisUtterance(texto);
            u.lang = "es-ES";
            u.voice = getVoice();
            u.rate = 0.9;
            u.onend = resolve;
            speechSynthesis.speak(u);
        } catch {
            resolve();
        }
    });
}

/* ========================= */
/* FUNCIONES FLEXIBLES */
/* ========================= */
async function mostrarTexto(texto) {
    if (!texto) texto = "...";
    block.innerHTML = "";
    await hablar(texto);
    for (let i = 0; i < texto.length; i++) {
        block.innerHTML += texto[i];
        await new Promise(r => setTimeout(r, 15));
    }
}

async function contadorSeguro(texto, tiempo) {
    if (!tiempo) tiempo = 5;
    for (let i = tiempo; i > 0; i--) {
        block.innerHTML = texto + "<br>" + i;
        await new Promise(r => setTimeout(r, 1000));
    }
}

async function respirarSeguro(ciclos) {
    if (!ciclos) ciclos = 2;
    for (let i = 0; i < ciclos; i++) {
        setInhala();
        await contadorSeguro("Inhala", 4);
        setHold();
        await contadorSeguro("Retén", 4);
        setExhala();
        await contadorSeguro("Exhala", 6);
    }
}

/* ========================= */
/* SESIONES FLEXIBLES */
/* ========================= */
let sesiones = [];
let currentSesion = 0;
let currentBloque = 0;

async function cargarSesiones() {
    try {
        const res = await fetch("/tvid_ejercicio.json");
        const data = await res.json();
        sesiones = data.sesiones || [];
    } catch {
        sesiones = [];
    }
    if (!sesiones.length) {
        sesiones = [{ bloques: [{ texto: "Bienvenido a tu sesión MayKaMi" }] }];
    }
}

/* ========================= */
/* MOSTRAR BLOQUE ACTUAL */
/* ========================= */
async function mostrarBloque(b) {
    nextBtn.style.display = "none";
    backBtn.style.display = "none";

    if (!b) {
        await mostrarTexto("Continuar");
    } else if (b.ciclos) {
        await respirarSeguro(b.ciclos);
    } else if (b.tiempo) {
        await contadorSeguro(b.texto || "Esperando", b.tiempo);
    } else if (b.texto) {
        await mostrarTexto(b.texto);
    } else {
        await mostrarTexto("...");
    }

    if (currentBloque < sesiones[currentSesion].bloques.length - 1) nextBtn.style.display = "inline-block";
    if (currentBloque > 0) backBtn.style.display = "inline-block";
}

/* ========================= */
/* MOSTRAR SESIÓN ACTUAL */
/* ========================= */
async function mostrarActual() {
    const b = sesiones[currentSesion].bloques[currentBloque];
    await mostrarBloque(b);
}

/* ========================= */
/* BOTONES CONTROL */
/* ========================= */
startBtn.onclick = async () => {
    try { audio.volume = 0.3; await audio.play(); } catch {}
    await cargarSesiones();
    startBtn.style.display = "none";
    currentBloque = 0;
    mostrarActual();
};

nextBtn.onclick = () => { currentBloque++; mostrarActual(); };
backBtn.onclick = () => { if (currentBloque > 0) { currentBloque--; mostrarActual(); } };
restartBtn.onclick = () => { currentBloque = 0; mostrarActual(); };
