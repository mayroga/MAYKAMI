/* ==================== ELEMENTOS ==================== */
const startBtn = document.getElementById("start-btn");
const nextBtn = document.getElementById("next-btn");
const backBtn = document.getElementById("back-btn");
const restartBtn = document.getElementById("restart-btn");
const block = document.getElementById("block");

const discBar = document.getElementById("disciplina-bar");
const clarBar = document.getElementById("claridad-bar");
const calmaBar = document.getElementById("calma-bar");

const logo = document.getElementById("logo");
const subtitle = document.getElementById("subtitle");
const mentalPanel = document.getElementById("mental-panel");
const footer = document.getElementById("footer");

/* ===== GALERIA VISUAL PROFUNDA ===== */
const gallery = document.getElementById("visual-gallery");
const circle = document.getElementById("visual-circle");
const audio = document.getElementById("nature-audio");

let slides = [];
let slideIndex = 0;
let slideInterval = null;

/* crear paisajes */
for (let i = 0; i < 20; i++) {
    const div = document.createElement("div");
    div.className = "slide";
    div.style.backgroundImage = `url(https://picsum.photos/1920/1080?nature&sig=${i})`;
    gallery.appendChild(div);
}
slides = document.querySelectorAll(".slide");

function cambiarSlide() {
    slides.forEach(s => s.classList.remove("active"));
    slideIndex = (slideIndex + 1) % slides.length;
    slides[slideIndex].classList.add("active");
}

/* ===== ACTIVAR VISUAL ===== */
function activarVisual(tipo = "inhala") {
    circle.style.display = "flex";
    circle.classList.remove("inhale", "exhale", "hold");

    if (tipo === "inhala") { circle.innerText = "Inhala"; circle.classList.add("inhale"); }
    if (tipo === "exhala") { circle.innerText = "Exhala"; circle.classList.add("exhale"); }
    if (tipo === "hold") { circle.innerText = "Retén"; circle.classList.add("hold"); }

    slides[slideIndex].classList.add("active");

    if (!slideInterval) slideInterval = setInterval(cambiarSlide, 6000);

    audio.volume = 0.25;
    audio.play();
}

function pararVisual() {
    circle.style.display = "none";
    audio.pause();
    if (slideInterval) { clearInterval(slideInterval); slideInterval = null; }
}

/* ==================== VARIABLES ==================== */
let sesiones = [];
let currentBloque = 0;
let currentSesion = 0;

/* ==================== DATOS INICIALES ==================== */
let userData = {
    claridad: 80,
    disciplina: 80,
    calma: 40,
    streak: 0,
    nivel: 1
};

/* ==================== PANEL ==================== */
function updatePanel() {
    discBar.style.width = userData.disciplina + "%";
    clarBar.style.width = userData.claridad + "%";
    calmaBar.style.width = userData.calma + "%";
}

/* ==================== VOZ ==================== */
function obtenerVoz() {
    return speechSynthesis.getVoices().find(v => v.lang.startsWith("es")) || speechSynthesis.getVoices()[0];
}

function hablar(texto, lento = false) {
    return new Promise(resolve => {
        speechSynthesis.cancel();
        const utter = new SpeechSynthesisUtterance(texto);
        utter.lang = "es-ES";
        utter.voice = obtenerVoz();
        utter.rate = lento ? 0.8 : 0.9;
        utter.onend = resolve;
        speechSynthesis.speak(utter);
    });
}

/* ==================== DETECTOR DE RESPIRACION ==================== */
function detectarRespiracion(texto) {
    const t = texto.toLowerCase();
    return ["respira", "inhala", "exhala", "retén", "calma", "silencio", "concéntrate", "observa", "siente", "mantente"].some(palabra => t.includes(palabra));
}

/* ==================== ESCRIBIR TEXTO ==================== */
async function escribir(texto, color = "#fff", forzarVisual = false) {
    const div = document.createElement("div");
    div.style.fontSize = "26px";
    div.style.color = color;
    block.innerHTML = "";
    block.appendChild(div);

    if (detectarRespiracion(texto) || forzarVisual) activarVisual("inhala");

    await hablar(texto, true);

    for (let i = 0; i < texto.length; i++) {
        div.innerHTML += texto[i];
        await new Promise(r => setTimeout(r, 20));
    }

    // Permitir que el texto permanezca unos segundos más para lectura
    await new Promise(r => setTimeout(r, 1500));
}

/* ==================== RESPIRACION ==================== */
async function respirar(texto, duracion) {
    activarVisual("inhala");
    await hablar(texto, true);

    for (let i = duracion; i > 0; i--) {
        block.innerHTML = `${texto}<br>Tiempo restante: ${i}s`;
        await new Promise(r => setTimeout(r, 1000));
    }

    pararVisual();
}

/* ==================== MOSTRAR BLOQUE ==================== */
async function mostrarBloque(b) {
    // Al avanzar, ocultar pantalla principal para liberar el centro
    if (currentBloque > 0) {
        logo.style.display = "none";
        subtitle.style.display = "none";
        mentalPanel.style.opacity = "0.5";
        footer.style.opacity = "0.5";
        nextBtn.style.opacity = "0.7";
        backBtn.style.opacity = "0.7";
    }

    switch (b.tipo) {
        case "voz":
        case "tvid":
        case "historia":
            await escribir(b.texto, "#fff");
            break;

        case "respiracion":
            await respirar(b.texto, b.duracion);
            break;

        case "tvid_ejercicio_largo":
            for (let t of b.textos) await escribir(t, "#fff", true);
            if (b.duracion) await respirar("Respira y asimila lo aprendido", b.duracion);
            break;

        case "cierre":
            await escribir(b.texto, "#fff");
            restartBtn.style.display = "block";
            logo.style.display = "block";
            subtitle.style.display = "block";
            mentalPanel.style.opacity = "1";
            footer.style.opacity = "1";
            break;
    }
}

/* ==================== CARGAR SESIONES ==================== */
async function cargarSesiones() {
    try {
        const res = await fetch("/tvid_ejercicio.json");
        const data = await res.json();
        sesiones = data.sesiones;
        currentSesion = Math.floor(Math.random() * sesiones.length);
    } catch (e) {
        block.innerText = "Error cargando sesiones";
        sesiones = [{ tipo: "voz", texto: "Iniciando MayKaMi..." }];
    }
}

/* ==================== BOTONES ==================== */
startBtn.onclick = async () => {
    await cargarSesiones();
    startBtn.style.display = "none";
    currentBloque = 0;
    mostrarActual();
};

nextBtn.onclick = () => {
    if (currentBloque < sesiones[currentSesion].bloques.length - 1) {
        currentBloque++;
        mostrarActual();
    }
};

backBtn.onclick = async () => {
    if (currentBloque > 0) {
        // Penalidad al regresar
        userData.claridad = Math.max(0, userData.claridad * 0.8);
        userData.disciplina = Math.max(0, userData.disciplina * 0.8);
        userData.calma = Math.max(0, userData.calma * 0.4);
        updatePanel();
        alert("⚠ Penalidad aplicada al retroceder.");
        currentBloque--;
        mostrarActual();
    }
};

restartBtn.onclick = () => {
    currentBloque = 0;
    logo.style.display = "block";
    subtitle.style.display = "block";
    mentalPanel.style.opacity = "1";
    footer.style.opacity = "1";
    restartBtn.style.display = "none";
    mostrarActual();
};

/* ==================== MOSTRAR ACTUAL ==================== */
async function mostrarActual() {
    await mostrarBloque(sesiones[currentSesion].bloques[currentBloque]);
}

/* ==================== INICIALIZACION ==================== */
updatePanel();
