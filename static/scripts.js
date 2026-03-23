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


// ==================== TEXTO ====================

const breathText = document.createElement("div");

breathText.style.fontSize = "22px";
breathText.style.fontWeight = "600";
breathText.style.textAlign = "center";
breathText.style.color = "#ffffff";
breathText.style.padding = "10px";


// ==================== CONTADOR ====================

const contador = document.createElement("div");

contador.style.fontSize = "16px";
contador.style.opacity = "0.8";
contador.style.marginTop = "10px";
contador.style.textAlign = "center";
contador.style.color = "#ffffff";


// ==================== VARIABLES ====================

let sesiones = [];
let currentBloque = 0;
let currentSesion = 0;
let puntos = 0;

let respirandoAuto = false;


// ==================== CARGAR JSON ====================

async function cargarSesiones() {

  try {

    const res = await fetch("/tvid_ejercicio.json");

    const data = await res.json();

    sesiones = data.sesiones || [];

  } catch (e) {

    block.innerText = "Error cargando sesiones";

  }

}


// ==================== LIMPIAR ====================

function limpiarBloque() {

  block.innerHTML = "";

  block.appendChild(breathCircle);
  block.appendChild(breathText);
  block.appendChild(contador);

}


// ==================== VOZ ====================

function obtenerVozEspañol() {

  const voces = speechSynthesis.getVoices();

  return (
    voces.find(v => v.lang.startsWith("es")) ||
    voces[0]
  );

}


function hablar(texto, soft=false) {

  return new Promise((resolve) => {

    speechSynthesis.cancel();

    const limpio = texto.replace(/<[^>]*>/g, "");

    const utter = new SpeechSynthesisUtterance(limpio);

    utter.lang = "es-ES";

    utter.voice = obtenerVozEspañol();

    utter.rate = soft ? 0.8 : 0.9;

    utter.onend = resolve;

    speechSynthesis.speak(utter);

  });

}


// ==================== TEXTO + VOZ ====================

async function escribirTextoYHablar(texto, color="#ffffff") {

  limpiarBloque();

  block.style.backgroundColor = "#020617";

  breathText.innerHTML = texto;

  await hablar(texto);

  await new Promise(r => setTimeout(r, 500));

}


// ==================== RESPIRACION AUTO ====================

function respirarAutomatico() {

  respirandoAuto = true;

  function loop() {

    if (!respirandoAuto) return;

    breathCircle.style.transition = "transform 4s linear";

    breathCircle.style.transform = "scale(1.6)";

    setTimeout(() => {

      breathCircle.style.transition = "transform 4s linear";

      breathCircle.style.transform = "scale(1)";

    }, 4000);

    setTimeout(loop, 8000);

  }

  loop();

}


function pararRespiracion() {

  respirandoAuto = false;

}



// ==================== RESPIRACION CONTROLADA ====================

async function respirar(texto, duracion) {

  limpiarBloque();

  breathText.innerHTML = texto;

  pararRespiracion();

  let inicio = 1;
  let fin = 1;

  const t = texto.toLowerCase();

  if (t.includes("inhala")) {
    inicio = 1;
    fin = 1.6;
  }

  if (t.includes("retiene")) {
    inicio = 1.6;
    fin = 1.6;
  }

  if (t.includes("exhala")) {
    inicio = 1.6;
    fin = 0.8;
  }

  if (t.includes("respira")) {
    respirarAutomatico();
  }

  breathCircle.style.transition = `transform ${duracion}s linear`;

  breathCircle.style.transform = `scale(${inicio})`;

  setTimeout(() => {

    breathCircle.style.transform = `scale(${fin})`;

  }, 100);


  await hablar(texto, true);


  for (let i = duracion; i > 0; i--) {

    contador.innerText = "Tiempo restante: " + i + "s";

    await new Promise(r => setTimeout(r, 1000));

  }

  contador.innerText = "";

}



// ==================== DECISION ====================

function decision(bloque) {

  return new Promise((resolve) => {

    limpiarBloque();

    breathText.innerHTML = bloque.pregunta;

    bloque.opciones.forEach((opt, i) => {

      const btn = document.createElement("button");

      btn.innerText = opt;

      btn.onclick = async () => {

        if (i === bloque.correcta) {

          breathText.innerHTML =
            "Correcto<br>" + bloque.explicacion;

          await hablar("Correcto. " + bloque.explicacion);

          puntos += bloque.recompensa || 0;

          resolve();

        } else {

          breathText.innerHTML =
            "Incorrecto<br>" + bloque.explicacion;

          await hablar("Incorrecto");

        }

      };

      block.appendChild(btn);

    });

  });

}


// ==================== MOSTRAR BLOQUE ====================

async function mostrarBloque(bloque) {

  block.style.backgroundColor = "#020617";

  switch (bloque.tipo) {

    case "voz":
    case "historia":
    case "tvid":
    case "estrategia":
    case "visualizacion":
    case "inteligencia_social":

      await escribirTextoYHablar(
        bloque.texto,
        bloque.color
      );

      break;


    case "respiracion":

      await respirar(
        bloque.texto,
        bloque.duracion
      );

      break;


    case "decision":

      await decision(bloque);

      break;


    case "recompensa":

      puntos += bloque.puntos || 0;

      break;


    case "tvid_ejercicio_largo":

      for (const txt of bloque.textos) {

        await escribirTextoYHablar(
          txt,
          bloque.color
        );

      }

      break;


    case "cierre":

      await escribirTextoYHablar(
        bloque.texto,
        bloque.color
      );

      break;

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

    block.innerText = "No hay sesiones disponibles";

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
