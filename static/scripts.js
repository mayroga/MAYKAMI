/* ==================== ELEMENTOS ==================== */
const startBtn = document.getElementById("start-btn");
const nextBtn = document.getElementById("next-btn");
const backBtn = document.getElementById("back-btn");
const restartBtn = document.getElementById("restart-btn");
const block = document.getElementById("block");

const discBar = document.getElementById("disciplina-bar");
const clarBar = document.getElementById("claridad-bar");
const calmaBar = document.getElementById("calma-bar");

/* ==================== GLOBO DE RESPIRACION ==================== */
const breathCircle = document.createElement("div");
breathCircle.style.width = "120px";
breathCircle.style.height = "120px";
breathCircle.style.borderRadius = "50%";
breathCircle.style.background = "#60a5fa";
breathCircle.style.margin = "20px auto";
breathCircle.style.transition = "transform 1s linear";
block.appendChild(breathCircle);

/* ==================== TEXTO ==================== */
const breathText = document.createElement("div");
breathText.style.fontSize = "22px";
breathText.style.fontWeight = "600";
breathText.style.textAlign = "center";
breathText.style.color = "#ffffff";
breathText.style.padding = "10px";
block.appendChild(breathText);

/* ==================== CONTADOR ==================== */
const contador = document.createElement("div");
contador.style.fontSize = "18px";
contador.style.opacity = "0.8";
contador.style.marginTop = "10px";
contador.style.textAlign = "center";
contador.style.color = "#ffffff";
block.appendChild(contador);

/* ==================== VARIABLES ==================== */
let sesiones = [];
let currentBloque = 0;
let currentSesion = 0;
let puntos = 0;
let completedSessions = JSON.parse(localStorage.getItem("completedSessions")) || [];

/* ==================== DATOS USUARIO ==================== */
let userData = JSON.parse(localStorage.getItem("maykamiData")) || {
  streak: 0,
  lastDay: null,
  nivel: 1,
  disciplina: 40,
  claridad: 50,
  calma: 30
};

/* ==================== PANEL ==================== */
function updatePanel() {
  discBar.style.width = userData.disciplina + "%";
  clarBar.style.width = userData.claridad + "%";
  calmaBar.style.width = userData.calma + "%";
  localStorage.setItem("maykamiData", JSON.stringify(userData));
}

/* ==================== PENALIZACION ==================== */
function aplicarPenalizacion() {
  userData.calma = Math.max(0, userData.calma * 0.2);
  userData.disciplina = Math.max(0, userData.disciplina * 0.2);
  userData.claridad = Math.max(0, userData.claridad * 0.6);
  updatePanel();
  hablar("Advertencia: saltar pasos afecta tu progreso.");
}

/* ==================== VOZ ==================== */
function obtenerVozEspañol() {
  const voces = speechSynthesis.getVoices();
  return voces.find(v => v.lang.startsWith("es")) || voces[0];
}

function hablar(texto, soft = false) {
  return new Promise(resolve => {
    speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(texto.replace(/<[^>]*>/g, ""));
    utter.lang = "es-ES";
    utter.voice = obtenerVozEspañol();
    utter.rate = soft ? 0.8 : 0.9;
    utter.onend = resolve;
    speechSynthesis.speak(utter);
  });
}

/* ==================== LIMPIAR BLOQUE ==================== */
function limpiarBloque() {
  block.innerHTML = "";
  block.appendChild(breathCircle);
  block.appendChild(breathText);
  block.appendChild(contador);
}

/* ==================== TEXTO + VOZ ==================== */
async function escribirTextoYHablar(texto, color = "#ffffff") {
  limpiarBloque();
  block.style.backgroundColor = "#020617";
  breathText.style.color = color;
  breathText.innerHTML = "";
  await hablar(texto);
  let i = 0;
  return new Promise(resolve => {
    const interval = setInterval(() => {
      if (i < texto.length) {
        breathText.innerHTML += texto[i];
        i++;
      } else {
        clearInterval(interval);
        resolve();
      }
    }, 20);
  });
}

/* ==================== RESPIRACION ==================== */
async function respirar(texto, duracion) {
  limpiarBloque();
  breathText.innerHTML = texto;

  let inicio = 1, fin = 1;
  if (texto.toLowerCase().includes("inhala")) inicio = 1, fin = 1.6;
  if (texto.toLowerCase().includes("retiene")) inicio = 1.6, fin = 1.6;
  if (texto.toLowerCase().includes("exhala")) inicio = 1.6, fin = 0.8;

  breathCircle.style.transition = `transform ${duracion}s linear`;
  breathCircle.style.transform = `scale(${inicio})`;
  setTimeout(() => breathCircle.style.transform = `scale(${fin})`, 100);

  await hablar(texto, true);
  for (let i = duracion; i > 0; i--) {
    contador.innerText = "Tiempo restante: " + i + "s";
    await new Promise(r => setTimeout(r, 1000));
  }
  contador.innerText = "";
}

/* ==================== DECISION ==================== */
function decision(bloque) {
  return new Promise(resolve => {
    limpiarBloque();

    // Contenedor central con color (estilo Kamizen)
    const container = document.createElement("div");
    container.style.cssText = `
      max-width: 700px;
      margin: 40px auto;
      padding: 20px;
      background-color: ${bloque.color || "#1e293b"};
      border-radius: 12px;
      box-shadow: 0 0 20px rgba(0,0,0,0.5);
      color: #ffffff;
      text-align: center;
    `;
    container.innerHTML = `<p style="font-size:1.3em;">${bloque.pregunta}</p>`;
    block.appendChild(container);

    const feedbackArea = document.createElement("div");
    feedbackArea.style.cssText = "margin-top:15px; text-align:center; color:#00d2ff;";
    feedbackArea.innerText = "Selecciona una opción";
    container.appendChild(feedbackArea);

    bloque.opciones.forEach((opt, i) => {
      const btn = document.createElement("button");
      btn.innerText = opt;
      btn.style.cssText = "display:block; margin:10px auto; padding:10px 15px; border-radius:8px; cursor:pointer;";
      btn.onclick = async () => {
        if (i === bloque.correcta) {
          feedbackArea.innerHTML = `<strong>✅ Correcto:</strong> ${bloque.explicacion || "Bien hecho"}`;
          await hablar("Correcto. " + (bloque.explicacion || ""));
          userData.disciplina += bloque.recompensa || 5;
          updatePanel();
          resolve();
        } else {
          feedbackArea.innerHTML = `<strong>❌ Incorrecto:</strong> ${bloque.explicacion || ""}`;
          await hablar("Incorrecto. " + (bloque.explicacion || ""));
          userData.calma += 2;
          updatePanel();
        }
      };
      container.appendChild(btn);
    });
  });
}

/* ==================== MOSTRAR BLOQUE ==================== */
async function mostrarBloque(bloque) {
  // Cambiar fondo general solo si no es respiración
  if (bloque.tipo !== "respiracion") document.body.style.backgroundColor = "#020617";
  
  switch (bloque.tipo) {
    case "voz":
    case "historia":
    case "tvid":
    case "estrategia":
    case "visualizacion":
    case "inteligencia_social":
      if (bloque.texto) {
        // Contenedor central con color
        const container = document.createElement("div");
        container.style.cssText = `
          max-width: 800px;
          margin: 40px auto;
          padding: 30px;
          background-color: ${bloque.color || "#1e293b"};
          border-radius: 12px;
          box-shadow: 0 0 20px rgba(0,0,0,0.5);
          color: #ffffff;
          text-align: center;
        `;
        container.innerHTML = `<p style="font-size:1.3em; line-height:1.5;">${bloque.texto}</p>`;
        block.appendChild(container);
        await hablar(bloque.texto);
        nextBtn.style.display = "inline-block";
      }
      break;

    case "tvid_ejercicio_largo":
      if (Array.isArray(bloque.textos)) {
        for (const t of bloque.textos) {
          const container = document.createElement("div");
          container.style.cssText = `
            max-width: 800px;
            margin: 30px auto;
            padding: 25px;
            background-color: ${bloque.color || "#1e293b"};
            border-radius: 12px;
            box-shadow: 0 0 15px rgba(0,0,0,0.5);
            color: #ffffff;
            text-align: center;
          `;
          container.innerHTML = `<p style="font-size:1.2em; line-height:1.5;">${t}</p>`;
          block.appendChild(container);
          await hablar(t);
          await new Promise(r => setTimeout(r, 300));
        }
      }
      if (bloque.duracion) await respirar("Respira y asimila lo aprendido", bloque.duracion);
      nextBtn.style.display = "inline-block";
      break;

    case "respiracion":
      if (bloque.texto && bloque.duracion) await respirar(bloque.texto, bloque.duracion);
      break;

    case "decision":
      if (bloque.pregunta && Array.isArray(bloque.opciones)) await decision(bloque);
      break;

    case "cierre":
      if (bloque.texto) {
        const container = document.createElement("div");
        container.style.cssText = `
          max-width: 800px;
          margin: 40px auto;
          padding: 30px;
          background-color: ${bloque.color || "#1e293b"};
          border-radius: 12px;
          box-shadow: 0 0 20px rgba(0,0,0,0.5);
          color: #ffffff;
          text-align: center;
        `;
        container.innerHTML = `<p style="font-size:1.4em;">${bloque.texto}</p>`;
        block.appendChild(container);
        await hablar(bloque.texto);
        completedSessions.push(currentSesion);
        localStorage.setItem("completedSessions", JSON.stringify(completedSessions));
        restartBtn.style.display = "block";
      }
      break;

    default:
      console.warn("Tipo de bloque no reconocido:", bloque.tipo);
      break;
  }
}

/* ==================== BOTONES ==================== */
function actualizarBotones() {
  backBtn.style.display = currentBloque > 0 ? "block" : "none";
  nextBtn.style.display = currentBloque < sesiones[currentSesion].bloques.length - 1 ? "block" : "none";
  restartBtn.style.display = currentBloque >= sesiones[currentSesion].bloques.length - 1 ? "block" : "none";
}

async function mostrarActual() {
  if (!sesiones.length) return;
  actualizarBotones();
  await mostrarBloque(sesiones[currentSesion].bloques[currentBloque]);
}

/* ==================== CARGAR SESIONES ==================== */
async function cargarSesiones() {
  try {
    const res = await fetch("/tvid_ejercicio.json");
    const data = await res.json();
    sesiones = data.sesiones || [];
    let disponibles = sesiones.map((_,i)=>i).filter(i=>!completedSessions.includes(i));
    if(!disponibles.length) { completedSessions=[]; disponibles = sesiones.map((_,i)=>i); }
    currentSesion = disponibles[Math.floor(Math.random() * disponibles.length)];
  } catch (e) {
    block.innerText = "Error cargando sesiones";
    sesiones = [{ tipo: "voz", texto: "Iniciando Maykami..." }];
  }
}

/* ==================== EVENTOS ==================== */
startBtn.onclick = async () => {
  await cargarSesiones();
  if (!sesiones.length) { block.innerText = "No hay sesiones disponibles"; return; }
  startBtn.style.display = "none";
  currentBloque = 0;
  mostrarActual();
};

nextBtn.onclick = async () => {
  if (currentBloque < sesiones[currentSesion].bloques.length - 1) {
    currentBloque++;
    mostrarActual();
  }
};

backBtn.onclick = async () => {
  if (currentBloque > 0) {
    aplicarPenalizacion();
    currentBloque--;
    mostrarActual();
  }
};

restartBtn.onclick = async () => {
  currentBloque = 0;
  mostrarActual();
};

/* ==================== INICIALIZACION ==================== */
updatePanel();
