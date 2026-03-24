/* ============================================================ */
/* MAYKAMI NEUROGAME ENGINE - AURA BY MAY ROGA LLC              */
/* ============================================================ */

const block = document.getElementById("block");
const nextBtn = document.getElementById("next-btn");
const audio = document.getElementById("nature-audio");

// Estado del progreso en LocalStorage
let userData = JSON.parse(localStorage.getItem("maykamiData")) || {
    disciplina: 40,
    sessionId: 1, // Controla sesiones 1 a 21
    step: 0       // Bloque actual
};

/* ==================== PROCESADOR DE BLOQUES ==================== */
async function procesarSesion() {
    try {
        const res = await fetch("/tvid_ejercicio.json");
        const data = await res.json();
        
        // Buscamos la sesión exacta por ID
        const sesionActual = data.sesiones.find(s => s.id === userData.sessionId);
        
        if (!sesionActual || !sesionActual.bloques[userData.step]) {
            // Si el bloque no existe, es que terminó la sesión
            avanzarDeSesion();
            return;
        }

        const bloque = sesionActual.bloques[userData.step];
        renderizar(bloque);

    } catch (e) {
        console.error("Error de lectura: ", e);
        block.innerHTML = "Error cargando datos de SmartCargo.";
    }
}

function renderizar(bloque) {
    block.innerHTML = "";
    nextBtn.style.display = "none"; // Congelamos navegación hasta que lea todo

    // TIPO DECISIÓN (EL QUIZ)
    if (bloque.tipo === "decision") {
        const p = document.createElement("p");
        p.innerText = bloque.pregunta;
        block.appendChild(p);
        hablar(bloque.pregunta);

        bloque.opciones.forEach((opt, idx) => {
            const btn = document.createElement("button");
            btn.innerText = opt;
            btn.className = "quiz-button"; // Estilo para tus 3 botones
            btn.onclick = () => {
                const esCorrecto = (idx === bloque.correcta);
                const feedback = esCorrecto ? `Correcto. ${bloque.explicacion}` : `Incorrecto. ${bloque.explicacion}`;
                
                block.innerHTML = `<p>${feedback}</p>`;
                hablar(feedback);
                
                // Actualizamos peso de la asesoría
                if (esCorrecto) userData.disciplina += 10;
                guardar();
                
                // Solo ahora permitimos seguir
                nextBtn.style.display = "inline-block";
            };
            block.appendChild(btn);
        });

    } else {
        // TIPO TEXTO O RESPIRACIÓN
        const p = document.createElement("p");
        p.innerText = bloque.texto;
        block.appendChild(p);
        hablar(bloque.texto);

        if (bloque.duracion) {
            let tempo = bloque.duracion;
            const clock = setInterval(() => {
                p.innerHTML = `${bloque.texto}<br><br><span style="font-size:2em;">${tempo}s</span>`;
                if (tempo <= 0) {
                    clearInterval(clock);
                    nextBtn.style.display = "inline-block";
                }
                tempo--;
            }, 1000);
        } else {
            // Si no hay tiempo, esperamos un poco a que termine la voz
            setTimeout(() => { nextBtn.style.display = "inline-block"; }, 2000);
        }
    }
}

function avanzarDeSesion() {
    userData.sessionId = userData.sessionId < 21 ? userData.sessionId + 1 : 1;
    userData.step = 0;
    guardar();
    block.innerHTML = "<h2>Sesión Completada</h2><p>Asesoría de SmartCargo finalizada por hoy.</p>";
}

function guardar() {
    localStorage.setItem("maykamiData", JSON.stringify(userData));
    // Actualizar barras visuales
    document.getElementById("disciplina-bar").style.width = userData.disciplina + "%";
}

/* ==================== BOTONES ==================== */
nextBtn.onclick = () => {
    userData.step++;
    guardar();
    procesarSesion();
};

// Al iniciar
if (audio) audio.volume = 0.05; // Música sutil
procesarSesion();
