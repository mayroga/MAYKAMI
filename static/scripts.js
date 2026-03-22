// static/scripts.js

// Botones y contenedor
const startBtn = document.getElementById("start-btn");
const nextBtn = document.getElementById("next-btn");
const backBtn = document.getElementById("back-btn");
const restartBtn = document.getElementById("restart-btn");
const block = document.getElementById("block");

// Variables globales
let sesiones = [];
let currentSesionIndex = 0;
let currentBloqueIndex = 0;
let puntos = 0;
let userData = JSON.parse(localStorage.getItem("kamizen_userData")) || { puntos: 0 };

// Función para cargar JSON
async function cargarSesiones() {
  try {
    const res = await fetch("static/tvid_ejercicio.json");
    const data = await res.json();
    sesiones = data.sesiones;
    startBtn.disabled = false;
  } catch (error) {
    block.innerHTML = "<p style='color:red'>Error cargando las sesiones. Verifica el JSON o la ruta.</p>";
    console.error("Error cargando JSON:", error);
  }
}

// Función para mostrar bloque
function mostrarBloque() {
  if (!sesiones.length) return;

  const sesion = sesiones[currentSesionIndex];
  const bloque = sesion.bloques[currentBloqueIndex];

  if (!bloque) return;

  // Limpia contenido anterior
  block.innerHTML = "";
  block.style.backgroundColor = bloque.color || "#ffffff";

  switch (bloque.tipo) {
    case "voz":
    case "inteligencia_social":
    case "estrategia":
    case "historia":
    case "visualizacion":
      block.innerHTML = `<p>${bloque.texto}</p>`;
      break;

    case "tvid":
      block.innerHTML = `<h3>${bloque.titulo}</h3><p>${bloque.texto}</p>`;
      break;

    case "respiracion":
      block.innerHTML = `<p>${bloque.texto}</p>`;
      animarGlobo(bloque);
      break;

    case "decision":
      mostrarDecision(bloque);
      break;

    case "recompensa":
      block.innerHTML = `<p>${bloque.texto}</p><p>Puntos: ${bloque.puntos}</p>`;
      puntos += bloque.puntos;
      actualizarPuntos();
      break;

    case "tvid_ejercicio_largo":
      mostrarTvidEjercicioLargo(bloque);
      break;

    case "cierre":
      block.innerHTML = `<p>${bloque.texto}</p>`;
      break;

    default:
      block.innerHTML = `<p>${bloque.texto || ""}</p>`;
  }
}

// Función de animación de globo (solo respiración)
function animarGlobo(bloque) {
  const globo = document.createElement("div");
  globo.style.width = "100px";
  globo.style.height = "100px";
  globo.style.borderRadius = "50%";
  globo.style.backgroundColor = "#60a5fa";
  globo.style.margin = "20px auto";
  globo.style.transition = `all ${bloque.duracion || 5}s ease-in-out`;
  block.appendChild(globo);

  setTimeout(() => {
    globo.style.transform = "scale(1.5)";
  }, 100);

  setTimeout(() => {
    globo.style.transform = "scale(1)";
  }, (bloque.duracion || 5) * 1000);
}

// Función mostrar decision
function mostrarDecision(bloque) {
  block.innerHTML = `<p>${bloque.pregunta}</p>`;
  bloque.opciones.forEach((op, index) => {
    const btn = document.createElement("button");
    btn.innerText = op;
    btn.style.margin = "5px";
    btn.onclick = () => {
      if (index === bloque.correcta) {
        block.innerHTML += `<p style="color:green">Correcto ✅</p><p>${bloque.explicacion}</p>`;
        puntos += bloque.recompensa;
        actualizarPuntos();
      } else {
        block.innerHTML += `<p style="color:red">Incorrecto ❌</p><p>${bloque.explicacion}</p>`;
      }
    };
    block.appendChild(btn);
  });
}

// Función mostrar tvid_ejercicio_largo
function mostrarTvidEjercicioLargo(bloque) {
  let index = 0;
  const textoDiv = document.createElement("div");
  textoDiv.style.marginBottom = "20px";
  block.appendChild(textoDiv);

  const siguienteTexto = () => {
    if (index >= bloque.textos.length) return;
    textoDiv.innerHTML = `<p>${bloque.textos[index]}</p>`;
    index++;
    // Avanza solo con next, sin bloquear
  };

  siguienteTexto();
}

// Función actualizar puntos
function actualizarPuntos() {
  userData.puntos = puntos;
  localStorage.setItem("kamizen_userData", JSON.stringify(userData));
}

// Botones
startBtn.addEventListener("click", () => {
  startBtn.style.display = "none";
  nextBtn.style.display = "inline-block";
  backBtn.style.display = "inline-block";
  restartBtn.style.display = "inline-block";
  mostrarBloque();
});

nextBtn.addEventListener("click", () => {
  currentBloqueIndex++;
  const sesion = sesiones[currentSesionIndex];
  if (currentBloqueIndex >= sesion.bloques.length) {
    currentSesionIndex++;
    currentBloqueIndex = 0;
    if (currentSesionIndex >= sesiones.length) {
      block.innerHTML = "<p>¡Has completado todas las sesiones! 🎉</p>";
      nextBtn.disabled = true;
      return;
    }
  }
  mostrarBloque();
});

backBtn.addEventListener("click", () => {
  if (currentBloqueIndex > 0) currentBloqueIndex--;
  else if (currentSesionIndex > 0) {
    currentSesionIndex--;
    currentBloqueIndex = sesiones[currentSesionIndex].bloques.length - 1;
  }
  mostrarBloque();
});

restartBtn.addEventListener("click", () => {
  currentSesionIndex = 0;
  currentBloqueIndex = 0;
  puntos = 0;
  actualizarPuntos();
  mostrarBloque();
});

// Carga inicial
cargarSesiones();
