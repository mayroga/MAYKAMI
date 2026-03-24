/* ============================================================ */
/* MAYKAMI NEUROGAME ENGINE - BY MAY ROGA LLC                   */
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

let sesiones = [];
let currentBloque = 0;
let userData = JSON.parse(localStorage.getItem("maykamiData")) || { disciplina: 40, claridad: 50, calma: 30 };

function updatePanel() {
    if (discBar) discBar.style.width = userData.disciplina + "%";
    if (clarBar) clarBar.style.width = userData.claridad + "%";
    if (calmaBar) calmaBar.style.width = userData.calma + "%";
    localStorage.setItem("maykamiData", JSON.stringify(userData));
}

/* ========================= */
/* MOTOR DE VOZ Y GLOBO      */
/* ========================= */
function hablar(texto) {
    window.speechSynthesis.cancel();
    const t = texto.toLowerCase();
    
    // Animación automática del globo por palabras clave
    if (["inhala", "aire", "dentro"].some(p => t.includes(p))) circle.className = "inhale";
    else if (["exhala", "suelta", "fuera"].some(p => t.includes(p))) circle.className = "exhale";
    else if (["retén", "pausa", "aguanta"].some(p => t.includes(p))) circle.className = "hold";
    else circle.className = "";

    const mensaje = new SpeechSynthesisUtterance(texto);
    mensaje.lang = "es-ES";
    mensaje.rate = 0.9;
    window.speechSynthesis.speak(mensaje);
}

/* ========================= */
/* RENDERIZADO DE BLOQUES    */
/* ========================= */
async function renderBloque() {
    const bloque = sesiones[0].bloques[currentBloque];
    if (!bloque) return;

    block.innerHTML = ""; // Limpiar pantalla
    nextBtn.style.display = "none"; // Ocultar navegación por defecto

    if (bloque.tipo === "decision") {
        // 1. Mostrar Pregunta
        const p = document.createElement("p");
        p.style.fontSize = "1.4rem";
        p.innerText = bloque.pregunta;
        block.appendChild(p);
        hablar(bloque.pregunta);

        // 2. Crear los 3 botones de respuesta de inmediato
        const btnCont = document.createElement("div");
        btnCont.style.marginTop = "20px";
        
        bloque.opciones.forEach((opt, idx) => {
            const b = document.createElement("button");
            b.innerText = opt;
            b.style.cssText = "display:block; width:100%; margin:10px 0; padding:15px; border-radius:12px; background:#1e293b; color:white; border:1px solid #3b82f6; cursor:pointer;";
            
            b.onclick = () => {
                const esCorrecto = (idx === bloque.correcta);
                const feedback = esCorrecto ? `Correcto. ${bloque.explicacion}` : `Incorrecto. ${bloque.explicacion}`;
                
                // Feedback visual y de voz
                block.innerHTML = `<p style="font-size:1.3rem; color:${esCorrecto ? '#4ade80' : '#f87171'}">${feedback}</p>`;
                hablar(feedback);
                
                // Actualizar puntos
                if (esCorrecto) userData.disciplina += 10; else userData.calma += 5;
                updatePanel();

                // Habilitar botón para seguir
                nextBtn.style.display = "inline-block";
            };
            btnCont.appendChild(b);
        });
        block.appendChild(btnCont);

    } else {
        // Bloque normal de texto o respiración
        const p = document.createElement("p");
        p.innerText = bloque.texto;
        block.appendChild(p);
        hablar(bloque.texto);

        if (bloque.duracion) {
            let seg = bloque.duracion;
            const timer = setInterval(() => {
                p.innerHTML = `${bloque.texto}<br><br><b style="font-size:3rem; color:#60a5fa;">${seg}s</b>`;
                if (seg <= 0) {
                    clearInterval(timer);
                    nextBtn.style.display = "inline-block";
                }
                seg--;
            }, 1000);
        } else {
            nextBtn.style.display = "inline-block";
        }
    }
}

/* ========================= */
/* INICIO Y NAVEGACIÓN       */
/* ========================= */
startBtn.onclick = async () => {
    startBtn.style.display = "none";
    if (audio) { audio.volume = 0.05; audio.play(); } // Música muy baja
    
    const res = await fetch("/tvid_ejercicio.json");
    const data = await res.json();
    sesiones = data.sesiones;
    currentBloque = 0;
    renderBloque();
};

nextBtn.onclick = () => {
    currentBloque++;
    if (currentBloque < sesiones[0].bloques.length) {
        renderBloque();
    } else {
        block.innerHTML = "<h2>Sesión completada con éxito.</h2>";
        nextBtn.style.display = "none";
    }
};

backBtn.onclick = () => {
    if (currentBloque > 0) {
        userData.disciplina = Math.max(0, userData.disciplina - 15); // Penalización
        updatePanel();
        currentBloque--;
        renderBloque();
    }
};

updatePanel();
