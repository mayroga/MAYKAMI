// static/scripts.js versión fluida

const block = document.getElementById("block");
const nextBtn = document.getElementById("next-btn");
const backBtn = document.getElementById("back-btn");

// Variables de estado
let sesiones = [];
let currentBlockIndex = 0;
let totalPoints = 0;

// Cargar progreso guardado si existe
const savedData = JSON.parse(localStorage.getItem("kamizen_progress"));
if (savedData) {
  currentBlockIndex = savedData.currentBlockIndex || 0;
  totalPoints = savedData.totalPoints || 0;
}

// Guardar progreso
function saveProgress() {
  localStorage.setItem(
    "kamizen_progress",
    JSON.stringify({
      currentBlockIndex,
      totalPoints,
    })
  );
}

// Cargar JSON completo
async function loadJSON() {
  try {
    const response = await fetch("static/tvid_ejercicio.json");
    if (!response.ok) throw new Error("No se pudo cargar el JSON");
    const data = await response.json();
    sesiones = data.sesiones || [];
    renderBlock();
  } catch (err) {
    console.error(err);
    block.innerHTML = `<p>Error cargando las sesiones</p>`;
  }
}

// Renderizar bloque
function renderBlock() {
  if (!sesiones.length) return;

  // Evitar índice fuera de rango
  if (currentBlockIndex < 0) currentBlockIndex = 0;
  if (currentBlockIndex >= sesiones.length) {
    currentBlockIndex = 0; // Reiniciar desde 0
  }

  const bloque = sesiones[currentBlockIndex];
  block.innerHTML = "";

  // Color de fondo dinámico
  document.body.style.backgroundColor = bloque.color || "#ffffff";

  // Render según tipo
  switch (bloque.tipo) {
    case "voz":
    case "inteligencia_social":
    case "estrategia":
    case "historia":
    case "visualizacion":
    case "recompensa":
    case "cierre":
      block.innerHTML = `<p>${bloque.texto}</p>`;
      break;

    case "tvid":
      block.innerHTML = `<h3>${bloque.titulo}</h3><p>${bloque.texto}</p>`;
      break;

    case "respiracion":
      block.innerHTML = `<h3>${bloque.texto}</h3><div class="globo"></div>`;
      animateGlobo(bloque.duracion || 5);
      break;

    case "decision":
      renderDecision(bloque); // Fluido: next se puede usar mientras se da feedback
      break;

    case "tvid_ejercicio_largo":
      renderTvidLargo(bloque); // Fluido: next no bloquea
      break;

    default:
      block.innerHTML = `<p>${bloque.texto || "Contenido desconocido"}</p>`;
  }

  saveProgress();
}

// Animación del globo azul solo en respiración
function animateGlobo(duration) {
  const globo = document.querySelector(".globo");
  if (!globo) return;
  globo.style.transition = `transform ${duration}s ease-in-out`;
  globo.style.transform = "scale(1.5)";
  setTimeout(() => (globo.style.transform = "scale(1)"), duration * 1000);
}

// Renderizar decisiones con feedback (fluido)
function renderDecision(bloque) {
  const opcionesHTML = bloque.opciones
    .map((op, i) => `<button class="decision-btn" data-index="${i}">${op}</button>`)
    .join("");
  block.innerHTML = `<p>${bloque.pregunta}</p>${opcionesHTML}<div id="decision-feedback"></div>`;

  document.querySelectorAll(".decision-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const idx = parseInt(btn.dataset.index);
      const feedback = document.getElementById("decision-feedback");
      if (idx === bloque.correcta) {
        feedback.innerHTML = `<p style="color:green">Correcto ✅: ${bloque.explicacion}</p>`;
        totalPoints += bloque.recompensa || 0;
      } else {
        feedback.innerHTML = `<p style="color:red">Incorrecto ❌: ${bloque.explicacion}</p>`;
      }
      saveProgress();
    });
  });
}

// Renderizar ejercicio largo Tvid (fluido)
async function renderTvidLargo(bloque) {
  block.innerHTML = `<h3>${bloque.titulo}</h3><p id="tvid-text"></p>`;
  const textoElem = document.getElementById("tvid-text");

  // Reproduce cada texto de manera asíncrona pero sin bloquear next
  bloque.textos.forEach((txt, i) => {
    setTimeout(() => {
      textoElem.innerText = txt;
    }, (bloque.duracion / bloque.textos.length) * 1000 * i);
  });
}

// Botones
nextBtn.addEventListener("click", () => {
  currentBlockIndex++;
  renderBlock();
});

backBtn.addEventListener("click", () => {
  currentBlockIndex--;
  renderBlock();
});

// Inicializar
loadJSON();
