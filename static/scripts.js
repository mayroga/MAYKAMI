/* ==================== ELEMENTOS ==================== */
const startBtn = document.getElementById("start-btn");
const nextBtn = document.getElementById("next-btn");
const backBtn = document.getElementById("back-btn");
const restartBtn = document.getElementById("restart-btn");
const block = document.getElementById("block");

const discBar = document.getElementById("disciplina-bar");
const clarBar = document.getElementById("claridad-bar");
const calmaBar = document.getElementById("calma-bar");

/* ===== VISUAL PROFUNDO ===== */
const gallery = document.getElementById("visual-gallery");
const circle = document.getElementById("visual-circle");
const audio = document.getElementById("nature-audio");

let slides = [];
let slideIndex = 0;
let slideInterval = null;

/* Crear paisajes */
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

    if (tipo === "inhala") {
        circle.innerText = "Inhala";
        circle.classList.add("inhale");
    }
    if (tipo === "exhala") {
        circle.innerText = "Exhala";
        circle.classList.add("exhale");
    }
    if (tipo === "hold") {
        circle.innerText = "Retén";
        circle.classList.add("hold");
    }

    slides[0].classList.add("active");
    if (!slideInterval) slideInterval = setInterval(cambiarSlide, 6000);

    audio.volume = 0.25;
    audio.play();
}

function pararVisual() {
    circle.style.display = "none";
    audio.pause();
    if (slideInterval) {
        clearInterval(slideInterval);
        slideInterval = null;
    }
}

/* ==================== VARIABLES ==================== */
let sesiones = [];
let currentBloque = 0;
let currentSesion = 0;

/* ==================== PANEL ==================== */
function updatePanel() {
    discBar.style.width = "80%";
    clarBar.style.width = "80%";
    calmaBar.style.width = "40%";
}

/* ==================== VOZ ==================== */
function voz() {
    return speechSynthesis.getVoices().find(v => v.lang.startsWith("es")) || null;
}

function hablar(texto, lento = false) {
    return new Promise(r => {
        speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(texto);
        u.lang = "es-ES";
        u.voice = voz();
        u.rate = lento ? 0.8 : 0.9;
        u.onend = r;
        speechSynthesis.speak(u);
    });
}

/* ==================== DETECTOR RESPIRACION ==================== */
function detectarRespiracion(texto) {
    texto = texto.toLowerCase();
    const palabras = ["respira","inhala","exhala","lento","calma","silencio","concéntrate","observa","siente","mantente"];
    return palabras.some(p => texto.includes(p));
}

/* ==================== TEXTO ==================== */
async function escribir(texto, color = "#fff", forzarVisual = false, mostrarExtra = 1200) {
    block.innerHTML = "";
    const div = document.createElement("div");
    div.style.fontSize = "26px";
    div.style.color = color;
    block.appendChild(div);

    if (detectarRespiracion(texto) || forzarVisual) activarVisual("inhala");
    else pararVisual();

    // Mostrar texto y voz simultáneamente sin bloquear
    hablar(texto, true);
    for (let i = 0; i < texto.length; i++) {
        div.innerHTML += texto[i];
        await new Promise(r => setTimeout(r, 20));
    }

    // Mantener texto visible extra tiempo
    await new Promise(r => setTimeout(r, mostrarExtra));
}

/* ==================== RESPIRACION ==================== */
async function respirar(texto, duracion) {
    activarVisual("inhala");
    hablar(texto, true);
    for (let i = duracion; i > 0; i--) {
        block.innerHTML = `${texto}<br>${i}`;
        await new Promise(r => setTimeout(r, 1000));
    }
    pararVisual();
}

/* ==================== MOSTRAR BLOQUE ==================== */
async function mostrarBloque(b) {
    if (!b) return;

    // Nota previa
    if (b.nota) {
        const notaDiv = document.createElement("div");
        notaDiv.style.fontSize = "18px";
        notaDiv.style.color = "#ccc";
        notaDiv.style.marginBottom = "10px";
        notaDiv.innerText = `Info: ${b.nota}`;
        block.appendChild(notaDiv);
    }

    switch (b.tipo) {
        case "voz":
        case "tvid":
        case "historia":
            await escribir(b.texto, b.color);
            break;

        case "respiracion":
            await respirar(b.texto, b.duracion);
            break;

        case "tvid_ejercicio_largo":
            activarVisual("inhala");
            for (let t of b.textos) {
                await escribir(t, b.color, true);
            }
            if (b.duracion) await respirar("Respira", b.duracion);
            pararVisual();
            break;

        case "cierre":
            await escribir(b.texto);
            restartBtn.style.display = "block";
            break;
    }
}

/* ==================== SESIONES ==================== */
async function cargarSesiones() {
    const r = await fetch("/tvid_ejercicio.json");
    const d = await r.json();
    sesiones = d.sesiones;
    currentSesion = Math.floor(Math.random() * sesiones.length);
}

/* ==================== CONTROL ==================== */
async function mostrarActual() {
    if (!sesiones[currentSesion]) return;
    await mostrarBloque(sesiones[currentSesion].bloques[currentBloque]);
}

/* ==================== BOTONES ==================== */
startBtn.onclick = async () => {
    await cargarSesiones();
    startBtn.style.display = "none";
    nextBtn.style.display = "block";
    backBtn.style.display = "block";
    currentBloque = 0;
    mostrarActual();
};

nextBtn.onclick = () => {
    if (currentBloque < sesiones[currentSesion].bloques.length - 1) {
        currentBloque++;
        mostrarActual();
    }
};

backBtn.onclick = () => {
    if (currentBloque > 0) {
        currentBloque--;
        alert("⚠️ Retroceder penaliza tu racha y disciplina");
        mostrarActual();
    }
};

restartBtn.onclick = () => {
    currentBloque = 0;
    mostrarActual();
};

/* ==================== INICIALIZAR ==================== */
updatePanel();
nextBtn.style.opacity = 0.7;
backBtn.style.opacity = 0.7;
nextBtn.style.position = "absolute";
backBtn.style.position = "absolute";
nextBtn.style.bottom = "20px";
nextBtn.style.left = "50%";
nextBtn.style.transform = "translateX(-50%)";
backBtn.style.bottom = "60px";
backBtn.style.left = "50%";
backBtn.style.transform = "translateX(-50%)";
restartBtn.style.position = "absolute";
restartBtn.style.bottom = "100px";
restartBtn.style.left = "50%";
restartBtn.style.transform = "translateX(-50%)";
restartBtn.style.opacity = 0.7;
