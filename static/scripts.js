/* =================== VARIABLES Y PERSISTENCIA =================== */
const startBtn = document.getElementById("start-btn");
const nextBtn = document.getElementById("next-btn");
const restartBtn = document.getElementById("restart-btn");
const backBtn = document.getElementById("back-btn");
const block = document.getElementById("block");

let bloques = [];
let current = 0;
let sesiones = [];
let currentSessionIndex = 0;

let userData = JSON.parse(localStorage.getItem("maykamiData")) || {
    streak: 0, lastDay: null, nivel: 1, disciplina: 40, claridad: 50, calma: 30
};

/* =================== ACTUALIZACIÓN DE PANEL =================== */
function updatePanel(){
    document.getElementById("streak").innerHTML = `🔥 Racha: ${userData.streak} días`;
    document.getElementById("level").innerHTML = `Nivel MayKaMi: ${userData.nivel}`;
    document.getElementById("disciplina-bar").style.width = (userData.disciplina || 0) + "%";
    document.getElementById("claridad-bar").style.width = (userData.claridad || 0) + "%";
    document.getElementById("calma-bar").style.width = (userData.calma || 0) + "%";
    localStorage.setItem("maykamiData", JSON.stringify(userData));
}

function aplicarPenalizacion() {
    userData.calma = Math.max(0, userData.calma * 0.20); 
    userData.disciplina = Math.max(0, userData.disciplina * 0.20);
    userData.claridad = Math.max(0, userData.claridad * 0.60);
    updatePanel();
    playVoice("Advertencia: El atajo destruye la formación de tu carácter.");
}

updatePanel();

/* =================== MOTOR DE VOZ =================== */
function playVoice(text){
    return new Promise(resolve => {
        speechSynthesis.cancel();
        let msg = new SpeechSynthesisUtterance(text);
        msg.lang = "es-ES";
        msg.rate = 0.85; 
        msg.onend = resolve;
        speechSynthesis.speak(msg);
    });
}

/* =================== RESPIRACIÓN PROFESIONAL =================== */
async function breathingAnimation(b){
    block.innerHTML = "";
    const instruccion = b.texto || "Inicia tu ciclo de poder.";
    
    const container = document.createElement("div");
    container.style.cssText = "display:flex; flex-direction:column; align-items:center; justify-content:space-between; height:480px; width:100%; padding:10px;";

    const uiLabel = document.createElement("div");
    uiLabel.style.cssText = "font-size:1.4em; font-weight:700; color:#ffffff; text-align:center; text-transform:uppercase; min-height:60px;";
    uiLabel.innerText = instruccion;
    
    const uiTimer = document.createElement("div");
    uiTimer.style.cssText = "font-size:2em; color:#00d2ff; font-weight:bold; margin-top:10px;";
    
    const circle = document.createElement("div");
    circle.style.cssText = "width:100px; height:100px; background:radial-gradient(circle, #00d2ff, #0077ff); border-radius:50%; box-shadow:0 0 50px #00d2ff; transition:transform 1s ease-in-out;";

    container.appendChild(uiLabel);
    container.appendChild(circle);
    container.appendChild(uiTimer);
    block.appendChild(container);

    await playVoice(instruccion);

    const duracion = b.duracion || 6;
    const esExpansion = (instruccion.toLowerCase().includes("inhala") || instruccion.toLowerCase().includes("mantén"));
    
    // Forzar que el globo termine el ciclo antes de habilitar siguiente
    circle.style.transition = `transform ${duracion}s cubic-bezier(0.42, 0, 0.58, 1)`;
    circle.style.transform = esExpansion ? "scale(2.5)" : "scale(0.8)";

    for(let s = duracion; s > 0; s--){
        uiTimer.innerText = `${s}s`;
        await new Promise(r => setTimeout(r, 1000));
    }

    uiLabel.innerText = "Ciclo integrado. Presiona siguiente.";
    nextBtn.style.display = "inline-block";
}

/* =================== PROCESADOR DE BLOQUES =================== */
async function showBlock(b){
    block.innerHTML = "";
    document.body.style.background = b.color || "#070b14";
    nextBtn.style.display = "none";
    restartBtn.style.display = "none";

    // Bloques tipo texto
    if(["voz","tvid","inteligencia_social","estrategia","historia","visualizacion"].includes(b.tipo)){
        const titulo = b.titulo ? `<h2 style='color:#00d2ff; font-size:1.5em;'>${b.titulo}</h2>` : "";
        const texto = b.texto || "Continúa.";
        block.innerHTML = `<div style='text-align:center; padding:20px;'>${titulo}<p style='font-size:1.4em; font-weight:300; line-height:1.4;'>${texto}</p></div>`;
        await playVoice(texto);
        nextBtn.style.display = "inline-block";
        return;
    }

    // Recompensas
    if(b.tipo === "recompensa"){
        userData.disciplina += (b.puntos || 10);
        updatePanel();
        block.innerHTML = `<p style='font-size:1.5em; text-align:center; padding:30px;'>${b.texto}</p>`;
        await playVoice(b.texto);
        nextBtn.style.display = "inline-block";
        return;
    }

    // Respiración
    if(b.tipo === "respiracion"){
        await breathingAnimation(b);
        return;
    }

    // Ejercicios tipo selección
    if(["quiz","acertijo","decision","juego_mental"].includes(b.tipo)){
        const container = document.createElement("div");
        container.style.cssText = "color:white; text-align:center; padding:20px;";
        const pregunta = document.createElement("p");
        pregunta.style.fontSize = "1.4em";
        pregunta.style.marginBottom = "20px";
        pregunta.innerText = b.pregunta;
        container.appendChild(pregunta);

        b.opciones.forEach((op, idx) => {
            const btn = document.createElement("button");
            btn.innerText = op;
            btn.style.cssText = "margin:5px; padding:10px 20px; font-size:1.2em;";
            btn.onclick = async () => {
                // Siempre explicar
                await playVoice(b.explicacion || "Esta es la opción que elegiste.");
                if(idx === b.correcta) userData.disciplina += (b.recompensa || 5);
                updatePanel();
                nextBtn.style.display = "inline-block";
                Array.from(container.children).forEach(c => c.disabled = true);
            };
            container.appendChild(btn);
        });

        block.appendChild(container);
        return;
    }

    // Ejercicios largos
    if(b.tipo === "tvid_ejercicio_largo"){
        const container = document.createElement("div");
        container.style.cssText = "color:white; text-align:center; padding:20px;";
        const textos = b.textos || [b.texto || "Continúa tu entrenamiento MayKaMi."];
        for(let i=0;i<textos.length;i++){
            const p = document.createElement("p");
            p.style.margin="15px 0";
            p.innerText = textos[i];
            container.appendChild(p);
            await playVoice(textos[i]);
        }
        block.appendChild(container);
        nextBtn.style.display = "inline-block";
        return;
    }

    // Cierre
    if(b.tipo === "cierre"){
        block.innerHTML = `<p style='font-size:1.8em; text-align:center; padding:40px;'>${b.texto}</p>`;
        await playVoice(b.texto);
        nextBtn.style.display = "none";
        restartBtn.style.display = "inline-block";
        return;
    }
}

/* =================== CARGA DE SESIONES =================== */
async function loadSessions(){
    try {
        const res = await fetch("/static/tvid_ejercicio.json");
        const data = await res.json();
        sesiones = data.sesiones.sort((a,b) => a.id - b.id);
    } catch (e) {
        console.error("Error cargando JSON:", e);
        sesiones = [{id:1, bloques:[{tipo:"voz", texto:"Iniciando MayKaMi."}]}];
    }
}

/* =================== NAVEGACIÓN Y CARGA =================== */
startBtn.addEventListener("click", async () => {
    startBtn.style.display = "none";
    await loadSessions();
    currentSessionIndex = 0;
    bloques = sesiones[currentSessionIndex].bloques;
    current = 0;
    showBlock(bloques[current]);
});

// Siguiente bloque
nextBtn.addEventListener("click", () => {
    current++;
    if(current < bloques.length){
        showBlock(bloques[current]);
    } else {
        // Termina la sesión actual
        currentSessionIndex++;
        if(currentSessionIndex >= sesiones.length) currentSessionIndex = 0;
        bloques = sesiones[currentSessionIndex].bloques;
        current = 0;
        showBlock(bloques[current]);
    }
});

// Botón atrás con penalización
backBtn.addEventListener("click", () => {
    if(current > 0){
        aplicarPenalizacion();
        current--;
        showBlock(bloques[current]);
    }
});

restartBtn.addEventListener("click", () => location.reload());
