/* ==================== ELEMENTOS Y ESTADO ==================== */
const gallery = document.getElementById("visual-gallery");
const audio = document.getElementById("nature-audio");
const startBtn = document.getElementById("start-btn");
const nextBtn = document.getElementById("next-btn");
const backBtn = document.getElementById("back-btn");
const restartBtn = document.getElementById("restart-btn");
const block = document.getElementById("block");

const discBar = document.getElementById("disciplina-bar");
const clarBar = document.getElementById("claridad-bar");
const calmaBar = document.getElementById("calma-bar");

let sesiones = [], currentBloque = 0, currentSesion = 0;
let slideIndex = 0, galleryInterval = null, breathingInterval = null;

let userData = JSON.parse(localStorage.getItem("maykamiData")) || {
    disciplina: 40, claridad: 50, calma: 30
};

/* ==================== MOTOR VISUAL (GALERÍA) ==================== */
function initGallery(total = 30) {
    gallery.innerHTML = "";
    const seed = Math.floor(Math.random() * 1000);
    for (let i = 0; i < total; i++) {
        const div = document.createElement("div");
        div.className = "slide";
        div.style.backgroundImage = `url(https://picsum.photos/1920/1080?nature&sig=${seed + i})`;
        gallery.appendChild(div);
    }
    const slides = document.querySelectorAll(".slide");
    if (slides.length > 0) slides[0].classList.add("active");

    if (galleryInterval) clearInterval(galleryInterval);
    galleryInterval = setInterval(() => {
        const currentSlides = document.querySelectorAll(".slide");
        if (!currentSlides.length) return;
        currentSlides[slideIndex].classList.remove("active");
        slideIndex = (slideIndex + 1) % currentSlides.length;
        currentSlides[slideIndex].classList.add("active");
    }, 7000);
}

/* ==================== GLOBO Y VOZ ==================== */
const breathCircle = document.createElement("div");
breathCircle.id = "visual-circle"; // Reutiliza el ID del script visual
breathCircle.style.display = "none";
block.appendChild(breathCircle);

const breathText = document.createElement("div");
breathText.style.cssText = "font-size:24px; color:white; text-align:center; margin-top:20px; font-weight:bold;";
block.appendChild(breathText);

function hablar(texto) {
    return new Promise(resolve => {
        speechSynthesis.cancel();
        const utter = new SpeechSynthesisUtterance(texto.replace(/<[^>]*>/g, ""));
        utter.lang = "es-ES";
        utter.rate = 0.9;
        utter.onend = resolve;
        speechSynthesis.speak(utter);
    });
}

/* ==================== LÓGICA DE PROGRESO ==================== */
function updatePanel() {
    discBar.style.width = userData.disciplina + "%";
    clarBar.style.width = userData.claridad + "%";
    calmaBar.style.width = userData.calma + "%";
    localStorage.setItem("maykamiData", JSON.stringify(userData));
}

async function mostrarBloque() {
    speechSynthesis.cancel();
    if (breathingInterval) clearInterval(breathingInterval);
    
    const bloque = sesiones[currentSesion].bloques[currentBloque];
    block.innerHTML = ""; // Limpiar
    block.appendChild(breathCircle);
    block.appendChild(breathText);
    breathText.innerText = "";
    
    // Configurar botones
    backBtn.style.display = (currentBloque === 0 && currentSesion === 0) ? "none" : "inline-block";
    const esUltimo = (currentSesion === sesiones.length - 1 && currentBloque === sesiones[currentSesion].bloques.length - 1);
    nextBtn.style.display = esUltimo ? "none" : "inline-block";
    restartBtn.style.display = esUltimo ? "inline-block" : "none";

    // Tipo Respiración
    if (bloque.tipo === "respiracion" || (bloque.texto && bloque.texto.toLowerCase().includes("respira"))) {
        breathCircle.style.display = "block";
        breathCircle.className = "inhale"; 
        let growing = true;
        breathingInterval = setInterval(() => {
            breathCircle.className = growing ? "exhale" : "inhale";
            growing = !growing;
        }, 3000);
    } else {
        breathCircle.style.display = "none";
    }

    // Procesar texto y voz
    const texto = bloque.texto || bloque.pregunta || "Continúa tu camino";
    await hablar(texto);
    for (let char of texto) {
        breathText.innerHTML += char;
        await new Promise(r => setTimeout(r, 25));
    }

    // Si es Quiz/Decisión
    if (bloque.tipo === "decision") {
        const container = document.createElement("div");
        container.style.marginTop = "20px";
        bloque.opciones.forEach((opt, i) => {
            const btn = document.createElement("button");
            btn.innerText = opt;
            btn.className = "quiz-btn"; // Asume que tienes este estilo en CSS
            btn.onclick = async () => {
                if (i === bloque.correcta) {
                    userData.disciplina += 5;
                    await hablar("Correcto. " + (bloque.explicacion || ""));
                    currentBloque++;
                    mostrarBloque();
                } else {
                    userData.calma += 2;
                    hablar("Inténtalo de nuevo.");
                }
                updatePanel();
            };
            container.appendChild(btn);
        });
        block.appendChild(container);
    }
}

/* ==================== EVENTOS ==================== */
startBtn.onclick = async () => {
    startBtn.style.display = "none";
    initGallery();
    audio.volume = 0.15;
    audio.play();
    const res = await fetch("/tvid_ejercicio.json");
    const data = await res.json();
    sesiones = data.sesiones;
    updatePanel();
    mostrarBloque();
};

nextBtn.onclick = () => {
    if (currentBloque < sesiones[currentSesion].bloques.length - 1) {
        currentBloque++;
    } else if (currentSesion < sesiones.length - 1) {
        currentSesion++;
        currentBloque = 0;
    }
    mostrarBloque();
};

backBtn.onclick = () => {
    userData.disciplina *= 0.8; // Penalización suave
    updatePanel();
    if (currentBloque > 0) currentBloque--;
    mostrarBloque();
};
