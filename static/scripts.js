// ==================== ELEMENTOS ====================

const startBtn = document.getElementById("start-btn");
const nextBtn = document.getElementById("next-btn");
const backBtn = document.getElementById("back-btn");
const restartBtn = document.getElementById("restart-btn");
const block = document.getElementById("block");

const discBar = document.getElementById("disciplina-bar");
const clarBar = document.getElementById("claridad-bar");
const calmaBar = document.getElementById("calma-bar");


// ==================== GLOBO ====================

const breathCircle = document.createElement("div");

breathCircle.style.width = "120px";
breathCircle.style.height = "120px";
breathCircle.style.borderRadius = "50%";
breathCircle.style.background = "#60a5fa";
breathCircle.style.margin = "20px auto";
breathCircle.style.transition = "transform 1s linear";
breathCircle.style.display = "block";

block.appendChild(breathCircle);


// ==================== TEXTO ====================

const breathText = document.createElement("div");

breathText.style.fontSize = "22px";
breathText.style.fontWeight = "600";
breathText.style.textAlign = "center";
breathText.style.color = "#ffffff";
breathText.style.padding = "10px";

block.appendChild(breathText);


// ==================== CONTADOR ====================

const contador = document.createElement("div");

contador.style.fontSize = "16px";
contador.style.opacity = "0.7";
contador.style.marginTop = "10px";
contador.style.textAlign = "center";
contador.style.color = "#ffffff";

block.appendChild(contador);


// ==================== VARIABLES ====================

let sesiones = [];
let currentBloque = 0;
let currentSesion = 0;
let puntos = 0;


// ==================== FUNCIONES ====================


// Cargar JSON

async function cargarSesiones() {

  try {

    const res = await fetch("/tvid_ejercicio.json");

    const data = await res.json();

    sesiones = data.sesiones || [];

  } catch (e) {

    block.innerText = "Error cargando sesiones. Verifica el JSON.";

  }

}


// Limpiar

function limpiarBloque() {

  block.innerHTML = "";

  block.appendChild(breathCircle);
  block.appendChild(breathText);
  block.appendChild(contador);

}


// ==================== VOZ ====================

function obtenerVozEspañol() {

  const voces = speechSynthesis.getVoices();

  const voz =
    voces.find(v => v.lang.startsWith("es") && v.name.toLowerCase().includes("male"))
    || voces.find(v => v.lang.startsWith("es"))
    || voces[0];

  return voz;

}


function hablar(texto, soft=false) {

  return new Promise((resolve) => {

    speechSynthesis.cancel();

    const utter = new SpeechSynthesisUtterance(
      texto.replace(/<[^>]*>/g, "")
    );

    utter.lang = "es-ES";

    utter.voice = obtenerVozEspañol();

    utter.rate = soft ? 0.8 : 0.9;

    utter.pitch = soft ? 0.9 : 1;

    utter.onend = resolve;

    speechSynthesis.speak(utter);

  });

}



async function escribirTextoYHablar(texto, color="#ffffff") {

  limpiarBloque();

  block.style.color = color;

  breathText.innerHTML = "";

  await hablar(texto);

  let i = 0;

  return new Promise((resolve) => {

    const interval = setInterval(() => {

      if (i < texto.length) {

        breathText.innerHTML += texto[i];

        i++;

      } else {

        clearInterval(interval);

        resolve();

      }

    }, 35);

  });

}


// ==================== RESPIRACION ====================

async function respirar(texto, duracion) {

  limpiarBloque();

  breathText.innerHTML = texto;

  let scale = 1;

  if (
    texto.toLowerCase().includes("inhala") ||
    texto.toLowerCase().includes("respira")
  ) scale = 1.5;

  if (
    texto.toLowerCase().includes("exhala") ||
    texto.toLowerCase().includes("suelta")
  ) scale = 0.8;


  breathCircle.style.transform = `scale(${scale})`;

  contador.innerText = `Tiempo restante: ${duracion}s`;

  await hablar(texto, true);


  for (let i = duracion; i > 0; i--) {

    contador.innerText = `Tiempo restante: ${i}s`;

    await new Promise(r => setTimeout(r, 1000));

  }


  breathCircle.style.transform = "scale(1)";

  contador.innerText = "";

}


// ==================== DECISION ====================

function decision(bloque) {

  return new Promise((resolve) => {

    limpiarBloque();

    block.style.color = bloque.color || "#ffffff";

    breathText.innerHTML = bloque.pregunta;

    bloque.opciones.forEach((opt, idx) => {

      const btn = document.createElement("button");

      btn.innerText = opt;

      btn.onclick = async () => {

        if (idx === bloque.correcta) {

          breathText.innerHTML =
            `${bloque.pregunta}<br>✅ Correcto<br>${bloque.explicacion}`;

          await hablar(`Correcto. ${bloque.explicacion}`);

          puntos += bloque.recompensa || 0;

          resolve();

        } else {

          breathText.innerHTML =
            `${bloque.pregunta}<br>❌ Incorrecto<br>${bloque.explicacion}`;

          await hablar(`Incorrecto. ${bloque.explicacion}`);

        }

      };

      block.appendChild(btn);

    });

  });

}


// ==================== MOSTRAR BLOQUE ====================

async function mostrarBloque(bloque) {

  block.style.backgroundColor = bloque.color || "#020617";

  switch (bloque.tipo) {

    case "voz":
    case "historia":
    case "tvid":
    case "estrategia":
    case "inteligencia_social":
    case "visualizacion":

      await escribirTextoYHablar(bloque.texto, bloque.color);

      break;


    case "respiracion":

      await respirar(bloque.texto, bloque.duracion);

      break;


    case "decision":

      await decision(bloque);

      break;


    case "recompensa":

      puntos += bloque.puntos || 0;

      break;


    case "tvid_ejercicio_largo":

      for (const txt of bloque.textos) {

        await escribirTextoYHablar(txt, bloque.color);

      }

      break;


    case "cierre":

      await escribirTextoYHablar(bloque.texto, bloque.color);

      break;


    default:

      await escribirTextoYHablar("Bloque desconocido", "#ffffff");

  }

}


// ==================== BOTONES ====================

function actualizarBotones() {

  backBtn.style.display =
    currentBloque > 0 ? "block" : "none";

  nextBtn.style.display =
    currentBloque <
    sesiones[currentSesion].bloques.length - 1
      ? "block"
      : "none";

  restartBtn.style.display =
    currentBloque >=
    sesiones[currentSesion].bloques.length - 1
      ? "block"
      : "none";

}


// ==================== MOSTRAR ====================

async function mostrarActual() {

  if (!sesiones.length) return;

  actualizarBotones();

  await mostrarBloque(
    sesiones[currentSesion].bloques[currentBloque]
  );

}


// ==================== EVENTOS ====================

startBtn.onclick = async () => {

  await cargarSesiones();

  if (!sesiones.length) {

    block.innerText = "No hay sesiones disponibles.";

    return;

  }

  startBtn.style.display = "none";

  currentBloque = 0;

  mostrarActual();

};


nextBtn.onclick = async () => {

  if (
    currentBloque <
    sesiones[currentSesion].bloques.length - 1
  ) {

    currentBloque++;

    mostrarActual();

  }

};


backBtn.onclick = async () => {

  if (currentBloque > 0) {

    currentBloque--;

    puntos -= 5;

    mostrarActual();

  }

};


restartBtn.onclick = async () => {

  currentBloque = 0;

  puntos = 0;

  mostrarActual();

};
