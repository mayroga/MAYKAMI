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

/* ==================== ELEMENTOS FIJOS DEL BLOQUE ==================== */
// Los creamos una sola vez fuera para que no se borren permanentemente
const breathCircle = document.createElement("div");
breathCircle.id = "visual-circle"; 
breathCircle.style.display = "none";

const breathText = document.createElement("div");
breathText.style.cssText = "font-size:24px; color:white; text-align:center; margin-top:20px; font-weight:bold; min-height: 1.2em;";

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
    if(discBar) discBar.style.width = userData.disciplina + "%";
    if(clarBar) clarBar.style.width = userData.claridad + "%";
    if(calmaBar) calmaBar.style.width = userData.calma + "%";
    localStorage.setItem("maykamiData", JSON.stringify(userData));
}

async function mostrarBloque() {
    speechSynthesis.cancel();
    if (breathingInterval) clearInterval(breathingInterval);
    
    // Validar existencia de datos
    if (!sesiones[currentSesion] || !sesiones[currentSesion].bloques[currentBloque]) return;
    
    const bloque = sesiones[currentSesion].bloques[currentBloque];
    
    // LIMPIEZA SEGURA: Solo borramos contenedores de botones previos
    block.innerHTML = ""; 
    block.appendChild(breathCircle);
    block.appendChild(breathText);
    breathText.innerText = "";
    
    // Configurar botones de navegación
    backBtn.style.display = (currentBloque === 0 && currentSesion === 0) ? "none" : "inline-block";
    const esUltimo = (currentSesion === sesiones.length - 1 && currentBloque === sesiones[currentSesion].bloques.length - 1);
    nextBtn.style.display = esUltimo ? "none" : "inline-block";
    if(restartBtn) restartBtn.style.display = esUltimo ? "inline-block" : "none";

    // Lógica de Respiración
    const necesitaRespirar = bloque.tipo === "respiracion" || (bloque.texto && bloque.texto.toLowerCase().includes("respira"));
    if (necesitaRespirar) {
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

    // Efecto de escritura y voz
    const texto = bloque.texto || bloque.pregunta || "...";
    hablar(texto); // No ponemos await aquí para que el texto salga mientras habla
    
    for (let char of texto) {
        breathText.innerHTML += char;
        await new Promise(r => setTimeout(r, 30));
    }

    // Renderizado de Opciones si es tipo decisión
    if (bloque.tipo === "decision" && bloque.opciones) {
        const container = document.createElement("div");
        container.style.marginTop = "25px";
        bloque.opciones.forEach((opt, i) => {
            const btn = document.createElement("button");
            btn.innerText = opt;
            btn.className = "quiz-btn"; // Asegúrate de tener este estilo en tu CSS
            btn.style.display = "block";
            btn.style.margin = "10px auto";
            
            btn.onclick = async () => {
                const btns = container.querySelectorAll("button");
                btns.forEach(b => b.disabled = true); // Evitar doble clic

                if (i === bloque.correcta) {
                    userData.disciplina = Math.min(100, userData.disciplina + 5);
                    await hablar("Correcto. " + (bloque.explicacion || ""));
                    if (currentBloque < sesiones[currentSesion].bloques.length - 1) {
                        currentBloque++;
                        mostrarBloque();
                    } else {
                        nextBtn.click();
                    }
                } else {
                    userData.calma = Math.max(0, userData.calma - 2);
                    hablar("Incorrecto. Inténtalo de nuevo.");
                    btns.forEach(b => b.disabled = false);
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
    try {
        startBtn.style.display = "none";
        initGallery();
        if(audio) {
            audio.volume = 0.15;
            audio.play().catch(e => console.log("Audio bloqueado por navegador"));
        }
        
        const res = await fetch("/tvid_ejercicio.json");
        const data = await res.json();
        sesiones = data.sesiones;
        
        updatePanel();
        mostrarBloque();
    } catch (error) {
        console.error("Error al iniciar:", error);
        block.innerHTML = "<p style='color:white;'>Error al cargar los ejercicios.</p>";
    }
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
    userData.disciplina = Math.max(0, userData.disciplina * 0.9); // Penalización más justa
    updatePanel();
    if (currentBloque > 0) {
        currentBloque--;
    } else if (currentSesion > 0) {
        currentSesion--;
        currentBloque = sesiones[currentSesion].bloques.length - 1;
    }
    mostrarBloque();
};

if(restartBtn) {
    restartBtn.onclick = () => {
        currentSesion = 0;
        currentBloque = 0;
        mostrarBloque();
    };
}
