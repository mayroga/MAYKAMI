/* ============================================================ */
/* MAYKAMI NEUROGAME ENGINE - AURA BY MAY ROGA LLC              */
/* ============================================================ */

const block = document.getElementById("block");
const nextBtn = document.getElementById("next-btn");
const audio = document.getElementById("nature-audio");
const circle = document.getElementById("visual-circle");

// Estado del progreso en LocalStorage
let userData = JSON.parse(localStorage.getItem("maykamiData")) || {
    disciplina: 40,
    sessionId: 1, 
    step: 0       
};

/* ==================== MOTOR DE VOZ ==================== */
function hablar(texto) {
    return new Promise(resolve => {
        window.speechSynthesis.cancel();
        const utter = new SpeechSynthesisUtterance(texto.replace(/<[^>]*>/g, ""));
        utter.lang = "es-ES";
        utter.rate = 0.9;
        
        // Animación automática del globo
        const t = texto.toLowerCase();
        if (["inhala", "aire", "dentro"].some(p => t.includes(p))) circle.className = "inhale";
        else if (["exhala", "suelta", "fuera"].some(p => t.includes(p))) circle.className = "exhale";
        else if (["retén", "pausa"].some(p => t.includes(p))) circle.className = "hold";
        else circle.className = "";

        utter.onend = resolve;
        window.speechSynthesis.speak(utter);
    });
}

/* ==================== EL COMANDO DE LECTURA TOTAL ==================== */
async function escribirTextoYHablar(texto, color = "#ffffff") {
    block.innerHTML = ""; // Limpiar bloque para nueva lectura
    const p = document.createElement("p");
    p.style.color = color;
    block.appendChild(p);

    // 1. ESPERA A QUE LA VOZ TERMINE
    await hablar(texto); 

    // 2. LUEGO ESCRIBE CARÁCTER POR CARÁCTER
    let i = 0;
    return new Promise(resolve => {
        const interval = setInterval(() => {
            if (i < texto.length) {
                p.innerHTML += texto[i];
                i++;
            } else {
                clearInterval(interval);
                // 3. SOLO CUANDO TERMINA DE ESCRIBIR, SE RESUELVE LA PROMESA
                resolve(); 
            }
        }, 20);
    });
}

/* ==================== PROCESADOR DE BLOQUES ==================== */
async function procesarSesion() {
    try {
        const res = await fetch("/tvid_ejercicio.json");
        const data = await res.json();
        
        const sesionActual = data.sesiones.find(s => s.id === userData.sessionId);
        
        if (!sesionActual || !sesionActual.bloques[userData.step]) {
            avanzarDeSesion();
            return;
        }

        const bloque = sesionActual.bloques[userData.step];
        renderizar(bloque);

    } catch (e) {
        console.error("Error de lectura: ", e);
        block.innerHTML = "Error cargando datos de asesoría.";
    }
}

async function renderizar(bloque) {
    nextBtn.style.display = "none"; 

    if (bloque.tipo === "decision") {
        // En decisiones, primero hablamos la pregunta
        await escribirTextoYHablar(bloque.pregunta);
        
        const btnCont = document.createElement("div");
        btnCont.style.marginTop = "20px";
        
        bloque.opciones.forEach((opt, idx) => {
            const btn = document.createElement("button");
            btn.innerText = opt;
            btn.className = "quiz-button"; 
            btn.style.cssText = "display:block; width:100%; margin:10px 0; padding:15px; border-radius:10px; background:#1e293b; color:white; border:1px solid #3b82f6; cursor:pointer;";
            
            btn.onclick = async () => {
                const esCorrecto = (idx === bloque.correcta);
                const feedback = esCorrecto ? `Correcto. ${bloque.explicacion}` : `Incorrecto. ${bloque.explicacion}`;
                
                await escribirTextoYHablar(feedback, esCorrecto ? "#4ade80" : "#f87171");
                
                if (esCorrecto) userData.disciplina += 10;
                guardar();
                nextBtn.style.display = "inline-block";
            };
            btnCont.appendChild(btn);
        });
        block.appendChild(btnCont);

    } else {
        // Texto normal o respiración con Lectura Total
        await escribirTextoYHablar(bloque.texto);

        if (bloque.duracion) {
            let tempo = bloque.duracion;
            const clock = setInterval(() => {
                block.querySelector("p").innerHTML = `${bloque.texto}<br><br><span style="font-size:2em; color:#60a5fa;">${tempo}s</span>`;
                if (tempo <= 0) {
                    clearInterval(clock);
                    nextBtn.style.display = "inline-block";
                }
                tempo--;
            }, 1000);
        } else {
            nextBtn.style.display = "inline-block";
        }
    }
}

function avanzarDeSesion() {
    userData.sessionId = userData.sessionId < 21 ? userData.sessionId + 1 : 1;
    userData.step = 0;
    guardar();
    block.innerHTML = "<h2>Sesión Completada</h2><p>Asesoría finalizada. Tu disciplina se ha fortalecido.</p>";
}

function guardar() {
    localStorage.setItem("maykamiData", JSON.stringify(userData));
    const bar = document.getElementById("disciplina-bar");
    if(bar) bar.style.width = userData.disciplina + "%";
}

/* ==================== BOTONES ==================== */
nextBtn.onclick = () => {
    userData.step++;
    guardar();
    procesarSesion();
};

// Inicialización
if (audio) audio.volume = 0.05;
procesarSesion();
