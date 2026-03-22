// static/scripts.js

const startBtn = document.getElementById("start-btn");
const nextBtn = document.getElementById("next-btn");
const backBtn = document.getElementById("back-btn");
const restartBtn = document.getElementById("restart-btn");
const block = document.getElementById("block");

let sesiones = [];
let currentSesionIndex = 0;
let currentBloqueIndex = 0;
let puntos = 0;


// =====================
// CARGAR JSON DESDE FASTAPI
// =====================

async function cargarSesiones() {

  try {

    const res = await fetch("/tvid_ejercicio.json");

    const data = await res.json();

    sesiones = data.sesiones;

    if (!sesiones.length) {
      block.innerHTML = "No hay sesiones";
      return;
    }

    startBtn.disabled = false;

  } catch (e) {

    block.innerHTML =
      "Error cargando las sesiones. Verifica el JSON o la ruta";

    console.error(e);
  }
}


// =====================
// MOSTRAR BLOQUE
// =====================

function mostrarBloque() {

  const sesion = sesiones[currentSesionIndex];

  if (!sesion) return;

  const bloque = sesion.bloques[currentBloqueIndex];

  if (!bloque) return;

  block.innerHTML = "";

  block.style.background = bloque.color || "#000";

  switch (bloque.tipo) {

    case "voz":
    case "historia":
    case "estrategia":
    case "visualizacion":
    case "inteligencia_social":

      block.innerHTML = `<p>${bloque.texto}</p>`;
      break;


    case "tvid":

      block.innerHTML =
        `<h3>${bloque.titulo}</h3><p>${bloque.texto}</p>`;
      break;


    case "respiracion":

      mostrarRespiracion(bloque);
      break;


    case "decision":

      mostrarDecision(bloque);
      break;


    case "recompensa":

      puntos += bloque.puntos || 0;

      block.innerHTML =
        `<p>${bloque.texto}</p><p>Puntos +${bloque.puntos}</p>`;

      break;


    case "tvid_ejercicio_largo":

      mostrarEjercicioLargo(bloque);

      break;


    case "cierre":

      block.innerHTML = `<p>${bloque.texto}</p>`;

      break;

  }

}


// =====================
// RESPIRACION
// =====================

function mostrarRespiracion(b) {

  block.innerHTML =
    `<div class="breath-circle" id="circle"></div>
     <div class="breath-text">${b.texto}</div>`;

  const c = document.getElementById("circle");

  setTimeout(() => {
    c.style.transform = "scale(1.4)";
  }, 100);

  setTimeout(() => {
    c.style.transform = "scale(1)";
  }, (b.duracion || 5) * 1000);

}


// =====================
// DECISION (no bloquea next)
// =====================

function mostrarDecision(b) {

  block.innerHTML = `<p>${b.pregunta}</p>`;

  b.opciones.forEach((op, i) => {

    const btn = document.createElement("button");

    btn.innerText = op;

    btn.onclick = () => {

      if (i === b.correcta) {

        puntos += b.recompensa || 0;

        block.innerHTML +=
          `<p style="color:lime">Correcto</p>
           <p>${b.explicacion}</p>`;

      } else {

        block.innerHTML +=
          `<p style="color:red">Incorrecto</p>
           <p>${b.explicacion}</p>`;
      }

    };

    block.appendChild(btn);

  });

}


// =====================
// EJERCICIO LARGO (fluido)
// =====================

function mostrarEjercicioLargo(b) {

  let i = 0;

  const div = document.createElement("div");

  block.appendChild(div);

  function nextText() {

    if (i >= b.textos.length) return;

    div.innerHTML = `<p>${b.textos[i]}</p>`;

    i++;

  }

  nextText();

}


// =====================
// BOTONES
// =====================

startBtn.onclick = () => {

  startBtn.style.display = "none";

  nextBtn.style.display = "block";

  restartBtn.style.display = "block";

  mostrarBloque();

};


nextBtn.onclick = () => {

  currentBloqueIndex++;

  const sesion = sesiones[currentSesionIndex];

  if (currentBloqueIndex >= sesion.bloques.length) {

    currentSesionIndex++;

    currentBloqueIndex = 0;

    if (currentSesionIndex >= sesiones.length) {

      block.innerHTML = "Fin";

      return;
    }
  }

  mostrarBloque();

};


backBtn.onclick = () => {

  if (currentBloqueIndex > 0) {

    currentBloqueIndex--;

  }

  mostrarBloque();

};


restartBtn.onclick = () => {

  currentSesionIndex = 0;

  currentBloqueIndex = 0;

  puntos = 0;

  mostrarBloque();

};


// =====================

cargarSesiones();
