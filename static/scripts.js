/* ============================================================ */
/* MAYKAMI NEUROGAME ENGINE - AURA BY MAY ROGA LLC              */
/* ============================================================ */

const circle = document.getElementById("visual-circle");
const block = document.getElementById("block");
const startBtn = document.getElementById("start-btn");
const nextBtn = document.getElementById("next-btn");
const backBtn = document.getElementById("back-btn");
const audio = document.getElementById("nature-audio");

// Barras de progreso
const discBar = document.getElementById("disciplina-bar");
const clarBar = document.getElementById("claridad-bar");
const calmaBar = document.getElementById("calma-bar");

/* ==================== ESTADO GLOBAL ==================== */
let currentSessionData = null;
let userData = JSON.parse(localStorage.getItem("maykamiData")) || {
    disciplina: 40,
    claridad: 50,
    calma: 30,
    lastSessionId: 1, // Empieza en la 1
    currentStep: 0    // Bloque actual dentro de la sesión
};

function updatePanel() {
    if (discBar) discBar.style.width = userData.disciplina + "%";
    if (clarBar) clarBar.style.width = userData.claridad + "%";
    if (calmaBar) calmaBar.style.width = userData.calma + "%";
    localStorage.setItem("maykamiData", JSON.stringify(userData));
}

/* ==================== MOTOR DE VOZ Y GLOBO ==================== */
function hablar(texto) {
    if (!texto) return;
    window.speechSynthesis.cancel();
    
    const t = texto.toLowerCase();
    // Animación automática por palabras clave
    if (["inhala", "aire", "aspira", "dentro"].some(p => t.includes(p))) circle.className = "inhale";
    else if (["exhala", "suelta", "expulsa", "fuera"].some(p => t.includes(p))) circle.className = "exhale";
    else if (["retén", "pausa", "aguanta", "manten"].some(p => t.includes(p))) circle.className = "hold";
    else circle.className = "";

    const mensaje = new SpeechSynthesisUtterance(texto);
    mensaje.lang = "es-ES";
    mensaje.rate = 0.9;
    window.speechSynthesis.speak(mensaje);
}

/* ==================== CONTROL DE SESIONES ==================== */
async function cargarSesionEspecifica(id) {
    try {
        const res = await fetch("/tvid_ejercicio.json");
        const data = await res.json();
        // Buscar la sesión por ID (del 1 al 21)
        currentSessionData = data.sesiones.find(s => s.id === id) || data.sesiones[0];
        if (!currentSessionData) throw new Error("Sesión no encontrada");
    } catch (e) {
        block.innerHTML = "<p>Error cargando la sesión. Reintentando...</p>";
    }
}

/* ==================== RENDERIZADO SEGURO ==================== */
function renderBloque() {
    if (!currentSessionData || !currentSessionData.bloques[userData.currentStep]) {
        finalizarSesion();
        return;
    }

    const bloque = currentSessionData.bloques[userData.currentStep];
    block.innerHTML = ""; 
    nextBtn.style.display = "none"; // Se oculta hasta que sea seguro avanzar

    if (bloque.tipo === "decision") {
        const p = document.createElement("p");
        p.style.fontSize = "1.3rem";
        p.innerText = bloque.pregunta;
        block.appendChild(p);
        hablar(bloque.pregunta);

        const btnCont = document.createElement("div");
        btnCont.style.marginTop = "20px";
        
        bloque.opciones.forEach((opt, idx) => {
            const b = document.createElement("button");
            b.innerText = opt;
            b.className = "quiz-btn"; // Usa tus estilos CSS aquí
            b.style.cssText = "display:block; width:100%; margin:10px 0; padding:15px; border-radius:10px; background:#1e293b; color:white; border:1px solid #3b82f6; cursor:pointer;";
            
            b.onclick = () => {
                const esCorrecto = (idx === bloque.correcta);
                const feedback = esCorrecto ? `Correcto. ${bloque.explicacion}` : `Incorrecto. ${bloque.explicacion}`;
                
                block.innerHTML = `<p style="font-size:1.2rem; color:${esCorrecto ? '#4ade80' : '#f87171'}">${feedback}</p>`;
                hablar(feedback);
                
                if (esCorrecto) userData.disciplina = Math.min(100, userData.disciplina + 5);
                updatePanel();
                nextBtn.style.display = "inline-block";
            };
            btnCont.appendChild(b);
        });
        block.appendChild(btnCont);

    } else {
        const p = document.createElement("p");
        p.innerText = bloque.texto || "";
        block.appendChild(p);
        hablar(bloque.texto);

        if (bloque.duracion) {
            let seg = bloque.duracion;
            const timer = setInterval(() => {
                p.innerHTML = `${bloque.texto}<br><br><b style="font-size:2.5rem; color:#60a5fa;">${seg}s</b>`;
                if (seg <= 0 || !document.contains(p)) {
                    clearInterval(timer);
                    nextBtn.style.display = "inline-block";
                }
                seg--;
            }, 1000);
        } else {
            nextBtn.style.display = "inline-block";
        }
    }
    // Actualizar botones de navegación
    backBtn.style.display = userData.currentStep > 0 ? "inline-block" : "none";
}

function finalizarSesion() {
    block.innerHTML = "<h2>Sesión Completada</h2><p>Tu disciplina ha subido. Mañana continuaremos con la siguiente fase.</p>";
    userData.lastSessionId = userData.lastSessionId < 21 ? userData.lastSessionId + 1 : 1;
    userData.currentStep = 0;
    updatePanel();
    nextBtn.style.display = "none";
}

/* ==================== EVENTOS ==================== */
startBtn.onclick = async () => {
    startBtn.style.display = "none";
    if (audio) { audio.volume = 0.05; audio.play(); }
    
    await cargarSesionEspecifica(userData.lastSessionId);
    renderBloque();
};

nextBtn.onclick = () => {
    userData.currentStep++;
    updatePanel();
    renderBloque();
};

backBtn.onclick = () => {
    if (userData.currentStep > 0) {
        userData.disciplina = Math.max(0, userData.disciplina - 10); // Penalización por retroceder
        userData.currentStep--;
        updatePanel();
        renderBloque();
    }
};

// Iniciar barras al cargar la página
updatePanel();
