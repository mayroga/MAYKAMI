// ==================== ELEMENTOS ====================
const startBtn = document.getElementById("start-btn");
const nextBtn = document.getElementById("next-btn");
const backBtn = document.getElementById("back-btn");
const block = document.getElementById("block");
const discBar = document.getElementById("disciplina-bar");
const clarBar = document.getElementById("claridad-bar");
const calmaBar = document.getElementById("calma-bar");

// Globo azul
const breathCircle = document.createElement("div");
breathCircle.className = "breath-circle";
block.appendChild(breathCircle);

// Texto
const breathText = document.createElement("div");
breathText.className = "breath-text";
block.appendChild(breathText);

// Contador regresivo
const contador = document.createElement("div");
contador.style.fontSize = "16px";
contador.style.opacity = "0.7";
contador.style.marginTop = "10px";
block.appendChild(contador);

let sesiones = [];
let currentBloque = 0;
let currentSesion = 0;
let puntos = 0;

// ==================== FUNCIONES ====================

// Cargar JSON de sesiones
async function cargarSesiones() {
  try {
    const res = await fetch("/tvid_ejercicio.json");
    const data = await res.json();
    sesiones = data.sesiones || [];
  } catch (e) {
    block.innerText = "Error cargando sesiones. Verifica el JSON.";
  }
}

// Limpiar bloque
function limpiarBloque() {
  block.innerHTML = "";
  block.appendChild(breathCircle);
  block.appendChild(breathText);
  block.appendChild(contador);
}

// Hablar con SpeechSynthesis
function hablar(texto) {
  return new Promise((resolve) => {
    const utter = new SpeechSynthesisUtterance(texto);
    utter.rate = 1; // velocidad normal
    utter.onend = resolve;
    speechSynthesis.speak(utter);
  });
}

// Escribir texto sincronizado con voz
async function escribirTextoYHablar(texto) {
  breathText.innerHTML = "";
  limpiarBloque();
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

// Respiración sincronizada con globo
async function respirar(acciones, duracionTotal, objetivo) {
  limpiarBloque();
  breathText.innerHTML = `Ejercicio: ${objetivo}\nRealizando: ${acciones.join(", ")}`;
  let pasos = acciones.length;
  let duracionPaso = duracionTotal / pasos * 1000;

  for (let i = 0; i < pasos; i++) {
    breathText.innerHTML = `Ejercicio: ${objetivo}\n${acciones[i]}...`;
    if (acciones[i].toLowerCase().includes("inhala") || acciones[i].toLowerCase().includes("respira")) {
      breathCircle.style.transform = "scale(1.5)";
    } else if (acciones[i].toLowerCase().includes("exhala") || acciones[i].toLowerCase().includes("suelta")) {
      breathCircle.style.transform = "scale(0.8)";
    } else {
      breathCircle.style.transform = "scale(1)";
    }
    // Contador regresivo
    let tiempo = duracionPaso / 1000;
    contador.innerText = `Tiempo restante: ${Math.ceil(tiempo)}s`;
    await new Promise(r => setTimeout(r, duracionPaso));
  }
  breathCircle.style.transform = "scale(1)";
  contador.innerText = "";
}

// Decisión con opciones
function decision(bloque) {
  return new Promise((resolve) => {
    limpiarBloque();
    breathText.innerHTML = bloque.pregunta;
    bloque.opciones.forEach((opt, idx) => {
      const btn = document.createElement("button");
      btn.innerText = opt;
      btn.onclick = async () => {
        if (idx === bloque.correcta) {
          breathText.innerHTML = `${bloque.pregunta}\n✅ Correcto\n${bloque.explicacion}`;
          await hablar(`Correcto. ${bloque.explicacion}`);
          resolve();
        } else {
          breathText.innerHTML = `${bloque.pregunta}\n❌ Incorrecto\n${bloque.explicacion}`;
          await hablar(`Incorrecto. ${bloque.explicacion}`);
        }
      };
      block.appendChild(btn);
    });
  });
}

// Mostrar bloque actual
async function mostrarBloque(bloque) {
  limpiarBloque();
  switch (bloque.tipo) {
    case "voz":
    case "historia":
    case "tvid":
    case "visualizacion":
    case "estrategia":
    case "inteligencia_social":
      await escribirTextoYHablar(bloque.texto);
      break;
    case "respiracion":
      await respirar(bloque.acciones, bloque.duracion, bloque.objetivo);
      break;
    case "decision":
      await decision(bloque);
      break;
    case "recompensa":
      puntos += bloque.puntos || 0;
      break;
    case "tvid_ejercicio_largo":
      for (const txt of bloque.textos) {
        await escribirTextoYHablar(txt);
      }
      break;
    case "cierre":
      await escribirTextoYHablar(bloque.texto);
      break;
  }
}

// Actualizar botones
function actualizarBotones() {
  backBtn.style.display = currentBloque > 0 ? "block" : "none";
  nextBtn.style.display = currentBloque < sesiones[currentSesion].bloques.length - 1 ? "block" : "none";
}

// Mostrar bloque actual
async function mostrarActual() {
  if (!sesiones.length) return;
  actualizarBotones();
  await mostrarBloque(sesiones[currentSesion].bloques[currentBloque]);
}

// ==================== EVENTOS ====================
startBtn.onclick = async () => {
  await cargarSesiones();
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
    currentBloque--;
    puntos -= 5; // penalización
    mostrarActual();
  }
};
