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

let sesiones = [];
let currentSesion = 0;
let currentBloque = 0;
let abortController = { abort: false };
let slideIndex = 0;
let galleryInterval = null;

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
    if (["inhala", "aspira", "llena"].some(p => t.includes(p))) { circle.className = "inhale"; circle.innerText = "Inhala"; }
    else if (["exhala", "suelta", "expulsa"].some(p => t.includes(p))) { circle.className = "exhale"; circle.innerText = "Exhala"; }
    else if (["retén", "retiene", "pausa"].some(p => t.includes(p))) { circle.className = "hold"; circle.innerText = "Retén"; }
    else { circle.className = ""; circle.innerText = "MAYKAMI"; }
}

async function procesarTexto(texto, localAbort, duracion = 0, esQuiz = false) {
    if (localAbort.abort) return;
    window.speechSynthesis.cancel();
    detectarRespiracion(texto);
    block.innerHTML = "";

    for (let char of texto.split("")) {
        if (localAbort.abort) return;
        block.insertAdjacentHTML('beforeend', char);
        await new Promise(r => setTimeout(r, 20));
    }

    const mensaje = new SpeechSynthesisUtterance(texto);
    mensaje.lang = "es-ES";
    mensaje.rate = 0.95;
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
            block.innerHTML = `${texto}<br><span style="font-size:55px; color:#60a5fa;">${t}s</span>`;
            if (t <= 0) { clearInterval(timer); r(); }
            t--;
        }, 1000);
    });
}

async function cargarSesiones() {
    try {
        const res = await fetch("/tvid_ejercicio.json");
        const data = await res.json();
        sesiones = data.sesiones || [];
    } catch (e) { block.innerText = "Error cargando MAYKAMI DB"; }
}

async function mostrarBloque() {
    limpiarEstado();
    const localAbort = abortController;
    if (!sesiones[currentSesion]) return;
    const bloques = sesiones[currentSesion].bloques;
    const bloque = bloques[currentBloque];

    backBtn.style.display = (currentSesion === 0 && currentBloque === 0) ? "none" : "inline-block";
    nextBtn.style.display = (currentSesion === sesiones.length - 1 && currentBloque === bloques.length - 1) ? "none" : "inline-block";
    restartBtn.style.display = (currentSesion === sesiones.length - 1 && currentBloque === bloques.length - 1) ? "inline-block" : "none";
    
    nextBtn.style.display = "inline-block"; // Asegurar que sea visible para navegar

    if (bloque.texto) {
        const dur = (bloque.tipo === "respiracion") ? (bloque.duracion || 10) : 0;
        await procesarTexto(bloque.texto, localAbort, dur);
    }
}

startBtn.onclick = async () => {
    startBtn.style.display = "none";
    nextBtn.style.display = "inline-block";
    audio.play();
    initGallery();
    await cargarSesiones();
    mostrarBloque();
};

nextBtn.onclick = () => {
    if (currentBloque < sesiones[currentSesion].bloques.length - 1) currentBloque++;
    else if (currentSesion < sesiones.length - 1) { currentSesion++; currentBloque = 0; }
    mostrarBloque();
};
