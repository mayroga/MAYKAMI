/* =================== VARIABLES Y PERSISTENCIA =================== */
const startBtn = document.getElementById("start-btn");
const nextBtn = document.getElementById("next-btn");
const restartBtn = document.getElementById("restart-btn");
const backBtn = document.getElementById("back-btn");
const forwardBtn = document.getElementById("forward-btn");
const block = document.getElementById("block");

let bloques = [];
let current = 0;
let isBreathing = false; 

let userData = JSON.parse(localStorage.getItem("kamizenData")) || {
    streak: 0, lastDay: null, nivel: 1, disciplina: 40, claridad: 50, calma: 30
};
let completedSessions = JSON.parse(localStorage.getItem("completedSessions")) || [];

/* =================== ACTUALIZACIÓN DE PANEL =================== */
function updatePanel(){
    document.getElementById("streak").innerHTML = `🔥 Racha: ${userData.streak} días`;
    document.getElementById("level").innerHTML = `Nivel KaMiZen: ${userData.nivel}`;
    document.getElementById("disciplina-bar").style.width = (userData.disciplina || 0) + "%";
    document.getElementById("claridad-bar").style.width = (userData.claridad || 0) + "%";
    document.getElementById("calma-bar").style.width = (userData.calma || 0) + "%";
    localStorage.setItem("kamizenData", JSON.stringify(userData));
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

/* =================== RESPIRACIÓN PROFESIONAL: EL GLOBO =================== */
async function breathingAnimation(b){
    block.innerHTML = "";
    isBreathing = true;
    
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

    playVoice(instruccion);

    const duracion = b.duracion || 6;
    const esExpansion = (instruccion.toLowerCase().includes("inhala") || instruccion.toLowerCase().includes("mantén"));
    
    setTimeout(() => {
        circle.style.transition = `transform ${duracion}s cubic-bezier(0.42, 0, 0.58, 1)`;
        circle.style.transform = esExpansion ? "scale(2.5)" : "scale(0.8)";
    }, 100);

    for(let s = duracion; s > 0; s--){
        uiTimer.innerText = `${s}s`;
        await new Promise(r => setTimeout(r, 1000));
    }

    uiLabel.innerText = "Ciclo integrado. Presiona siguiente.";
    isBreathing = false;
    nextBtn.style.display = "inline-block";
}

/* =================== PROCESADOR DE BLOQUES =================== */
async function showBlock(b){
    block.innerHTML = "";
    document.body.style.background = b.color || "#070b14";
    nextBtn.style.display = "none";

    // Bloques de texto y voz
    if(["voz","tvid","inteligencia_social","estrategia","historia","visualizacion","recompensa"].includes(b.tipo)){
        const titulo = b.titulo ? `<h2 style='color:#00d2ff; font-size:1.5em;'>${b.titulo}</h2>` : "";
        const texto = b.texto || "Continúa.";
        block.innerHTML = `<div style='text-align:center; padding:20px;'>${titulo}<p style='font-size:1.4em; font-weight:300; line-height:1.4;'>${texto}</p></div>`;
        if(b.tipo === "recompensa") { userData.disciplina += (b.puntos || 10); updatePanel(); }
        await playVoice(texto);
        setTimeout(() => { nextBtn.style.display = "inline-block"; }, 1500);
        return;
    }

    // Respiración
    if(b.tipo === "respiracion"){
        await breathingAnimation(b);
        return;
    }

    // Juegos interactivos
    if(["quiz","acertijo","decision","juego_mental"].includes(b.tipo)){
        const pregunta = b.pregunta || "¿Qué decides?";
        block.innerHTML = `<h3 style='font-size:1.6em; text-align:center; color:#ffffff;'>${pregunta}</h3>`;
        await playVoice(pregunta);

        const feedbackArea = document.createElement("div");
        feedbackArea.style.cssText = "margin:15px auto; width:90%; padding:10px; border-radius:8px; background:rgba(255,255,255,0.05); color:#00d2ff; text-align:center; font-size:1.1em; min-height:50px;";
        feedbackArea.innerText = "Tu elección define tu progreso.";

        b.opciones.forEach((op, i) => {
            let btn = document.createElement("button");
            btn.style.cssText = "display:block; width:85%; margin:10px auto; padding:12px; border-radius:10px; border:1px solid #00d2ff; background:transparent; color:white; cursor:pointer;";
            btn.innerText = op;
            
            btn.onclick = async () => {
                const esCorrecto = (i === b.correcta);
                const explicacion = b.explicacion || b.explanacion || "Sigue adelante.";
                let msgFeedback = esCorrecto ? `Correcto. ${explicacion}` : `Incorrecto. ${explicacion}`;
                feedbackArea.innerHTML = `<strong>${esCorrecto ? "✅" : "ℹ️"}</strong> ${msgFeedback}`;
                await playVoice(msgFeedback);

                if(esCorrecto){
                    userData.disciplina += (b.recompensa || 5);
                    updatePanel();
                    nextBtn.style.display = "inline-block";
                } else {
                    userData.calma += 2;
                    updatePanel();
                }
            };
            block.appendChild(btn);
        });
        block.appendChild(feedbackArea);
        return;
    }

    // Bloques de ejercicio largo Tvid
    if(b.tipo === "tvid_ejercicio_largo"){
        block.innerHTML = "";
        const container = document.createElement("div");
        container.style.cssText = "color:white; text-align:center; padding:20px;";
        block.appendChild(container);

        for(let i=0;i<b.textos.length;i++){
            const p = document.createElement("p");
            p.style.margin="15px 0";
            p.innerText = b.textos[i];
            container.appendChild(p);
            await playVoice(b.textos[i]);
        }

        nextBtn.style.display = "inline-block";
        return;
    }

    // Cierre de sesión
    if(b.tipo === "cierre"){
        block.innerHTML = `<p style='font-size:1.8em; text-align:center; padding:40px;'>${b.texto}</p>`;
        await playVoice(b.texto);
        completedSessions.push(currentSessionIndex);
        localStorage.setItem("completedSessions", JSON.stringify(completedSessions));
        restartBtn.style.display = "inline-block";
    }
}

/* =================== NAVEGACIÓN Y CARGA =================== */
let currentSessionIndex = 0;
startBtn.addEventListener("click", async () => {
    startBtn.style.display = "none";
    try {
        const res = await fetch("/tvid_ejercicio.json");
        const data = await res.json();
        const sesiones = data.sesiones;
        let available = sesiones.map((_,i) => i).filter(i => !completedSessions.includes(i));
        if(available.length === 0) { completedSessions = []; available = sesiones.map((_,i) => i); }
        currentSessionIndex = available[Math.floor(Math.random() * available.length)];
        bloques = sesiones[currentSessionIndex].bloques;
    } catch (e) {
        bloques = [{ tipo: "voz", texto: "Iniciando KaMiZen.", color: "#070b14" }];
    }
    current = 0;
    showBlock(bloques[0]);
});

nextBtn.addEventListener("click", () => {
    current++;
    if(current < bloques.length) showBlock(bloques[current]);
});

// Botones de navegación con penalización
backBtn.addEventListener("click", () => {
    if(current > 0) {
        aplicarPenalizacion();
        current--;
        showBlock(bloques[current]);
    }
});
forwardBtn.addEventListener("click", () => {
    if(current < bloques.length - 1) {
        aplicarPenalizacion();
        current++;
        showBlock(bloques[current]);
    }
});

restartBtn.addEventListener("click", () => location.reload());
