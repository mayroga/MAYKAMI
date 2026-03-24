/* ========================= */
/* ELEMENTOS PRINCIPALES */
/* ========================= */
const gallery = document.getElementById("gallery");
const holdCircle = document.getElementById("hold-circle"); // Para Retén
const exhaleCircle = document.getElementById("exhale-circle"); // Para Exhala/Inhala
const block = document.getElementById("block");
const startBtn = document.getElementById("btn-start");
const audio = document.getElementById("nature-sound");

let abortController = { abort: false };
let sesiones = [];
let currentSesion = 0;
let currentBloque = 0;

/* ========================= */
/* GALERÍA DE IMÁGENES */
/* ========================= */
function crearSlides(tipo) {
    gallery.innerHTML = "";
    const totalImages = 30;
    for (let i = 0; i < totalImages; i++) {
        const div = document.createElement('div');
        div.className = 'slide';
        if (tipo === "inhala") div.style.backgroundImage = `url('https://picsum.photos/1920/1080?nature,forest&sig=inhala${i}')`;
        if (tipo === "exhala") div.style.backgroundImage = `url('https://picsum.photos/1920/1080?nature,sunset,river&sig=exhala${i}')`;
        if (tipo === "reten") div.style.backgroundImage = `url('https://picsum.photos/1920/1080?nature,lake&sig=hold${i}')`;
        gallery.appendChild(div);
    }
}

function animarSlides() {
    const slides = document.querySelectorAll('.slide');
    let current = 0;
    slides[0].classList.add('active');
    return setInterval(() => {
        slides[current].classList.remove('active');
        current = (current + 1) % slides.length;
        slides[current].classList.add('active');
    }, 7000);
}

/* ========================= */
/* CÍRCULO DE RESPIRACIÓN */
/* ========================= */
function mostrarCirculo(tipo) {
    holdCircle && (holdCircle.style.display = "none");
    exhaleCircle && (exhaleCircle.style.display = "none");

    if (tipo === "reten") holdCircle && (holdCircle.style.display = "flex");
    else exhaleCircle && (exhaleCircle.style.display = "flex");
}

function animacionRespiracion(tipo) {
    if(tipo === "inhala") exhaleCircle.className = "exhaling"; // Reutilizamos exhaleCircle para Inhala
    if(tipo === "exhala") exhaleCircle.className = "exhaling";
    if(tipo === "reten") holdCircle.className = "holding";
}

async function contadorRespiracion(segundos, texto, localAbort) {
    for (let i = segundos; i > 0; i--) {
        if (localAbort.abort) return;
        if(block) block.innerHTML = `${texto}<br><span style="font-size:40px">${i}</span>`;
        await new Promise(r => setTimeout(r, 1000));
    }
}

/* ========================= */
/* VOZ Y MÁQUINA DE ESCRIBIR */
/* ========================= */
async function hablarYMostrar(texto, localAbort) {
    if(localAbort.abort) return;
    block && (block.innerHTML = "");
    const u = new SpeechSynthesisUtterance(texto);
    u.lang = "es-ES"; u.rate = 0.9;
    speechSynthesis.speak(u);
    for(let char of texto){
        if(localAbort.abort) return;
        block && (block.innerHTML += char);
        await new Promise(r=>setTimeout(r,25));
    }
}

/* ========================= */
/* CARGAR JSON COMPLETO */
/* ========================= */
async function cargarSesiones() {
    try {
        const res = await fetch("/static/tvid_ejercicio.json");
        const data = await res.json();
        sesiones = data.sesiones || [];
    } catch(e){
        sesiones = [{bloques:[{texto:"Error cargando JSON"}]}];
    }
}

/* ========================= */
/* PROCESAR BLOQUES DE RESPIRACIÓN AUTOMÁTICA */
/* ========================= */
async function procesarBloque(bloque, localAbort) {
    if(localAbort.abort) return;

    switch(bloque.tipo){
        case "voz":
            await hablarYMostrar(bloque.texto, localAbort);
            break;
        case "respiracion":
            // Detectar si es Inhala/Exhala/Retén
            let tipo = "exhala";
            if(bloque.texto.toLowerCase().includes("inhala")) tipo = "inhala";
            else if(bloque.texto.toLowerCase().includes("retiene")) tipo = "reten";
            mostrarCirculo(tipo);
            animacionRespiracion(tipo);
            await contadorRespiracion(bloque.duracion || 4, bloque.texto, localAbort);
            break;
        case "tvid_ejercicio_largo":
            mostrarCirculo("inhala");
            animacionRespiracion("inhala");
            crearSlides("inhala");
            const slideInterval = animarSlides();
            for(let texto of bloque.textos){
                if(localAbort.abort) break;
                await hablarYMostrar(texto, localAbort);
            }
            clearInterval(slideInterval);
            setTimeout(()=>mostrarCirculo("reten"),0);
            break;
        default:
            await hablarYMostrar(bloque.texto || "...", localAbort);
            break;
    }
}

/* ========================= */
/* MOSTRAR SESIÓN COMPLETA */
/* ========================= */
async function mostrarSesion() {
    abortController.abort = true;
    abortController = { abort: false };
    const localAbort = abortController;
    if(!sesiones.length) return;

    for(currentBloque = 0; currentBloque < sesiones[currentSesion].bloques.length; currentBloque++){
        if(localAbort.abort) break;
        const bloque = sesiones[currentSesion].bloques[currentBloque];
        await procesarBloque(bloque, localAbort);
    }
}

/* ========================= */
/* INICIAR SESIÓN */
/* ========================= */
startBtn.onclick = async () => {
    startBtn.style.display = "none";
    try{ audio.volume = 0.25; audio.play(); }catch(e){}
    await cargarSesiones();
    mostrarSesion();
};
