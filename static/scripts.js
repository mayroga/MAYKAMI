// static/scripts.js actualizado con LocalStorage
const block = document.getElementById("block");
const nextBtn = document.getElementById("next-btn");
const backBtn = document.getElementById("back-btn");

// Variables de estado
let sesiones = [];
let currentSessionId = 1;
let currentBlockIndex = 0;
let totalPoints = 0;

// Cargar progreso guardado si existe
const savedData = JSON.parse(localStorage.getItem("kamizen_progress"));
if (savedData) {
  currentSessionId = savedData.currentSessionId;
  currentBlockIndex = savedData.currentBlockIndex;
  totalPoints = savedData.totalPoints;
}

// Función para guardar progreso en LocalStorage
function saveProgress() {
  localStorage.setItem(
    "kamizen_progress",
    JSON.stringify({
      currentSessionId,
      currentBlockIndex,
      totalPoints,
    })
  );
}

// Cargar sesión desde JSON por ID
async function loadSession(id) {
  try {
    const response = await fetch(`static/tvid_ejercicio_${id}.json`);
    if (!response.ok) throw new Error("No se pudo cargar la sesión");
    const data = await response.json();
    sesiones = data.sesiones;
    currentBlockIndex = currentBlockIndex || 0; // Si es primera vez
    renderBlock();
  } catch (err) {
    console.error(err);
    block.innerHTML = `<p>Error cargando la sesión ${id}</p>`;
  }
}

// Renderizar bloque actual
function renderBlock() {
  if (!sesiones.length) return;

  const session = sesiones[0]; // Siempre un solo JSON por sesión
  if (currentBlockIndex < 0) currentBlockIndex = 0;
  if (currentBlockIndex >= session.bloques.length) {
    // Pasar a siguiente sesión
    currentSessionId++;
    if (currentSessionId > 21) currentSessionId = 1; // Reiniciar desde 1
    currentBlockIndex = 0;
    loadSession(currentSessionId);
    return;
  }

  const bloque = session.bloques[currentBlockIndex];
  block.innerHTML = ""; // Limpiar

  // Cambiar color de fondo dinámico
  document.body.style.backgroundColor = bloque.color || "#ffffff";

  // Mostrar texto según tipo
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
      animateGlobo(bloque.duracion);
      break;
    case "decision":
      renderDecision(bloque);
      break;
    case "tvid_ejercicio_largo":
      renderTvidLargo(bloque);
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

// Renderizar decisiones con feedback
function renderDecision(bloque) {
  const opcionesHTML = bloque.opciones
    .map(
      (op, i) =>
        `<button class="decision-btn" data-index="${i}">${op}</button>`
    )
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

// Renderizar ejercicio largo Tvid
async function renderTvidLargo(bloque) {
  block.innerHTML = `<h3>${bloque.titulo}</h3><p id="tvid-text"></p>`;
  const textoElem = document.getElementById("tvid-text");
  for (let i = 0; i < bloque.textos.length; i++) {
    textoElem.innerText = bloque.textos[i];
    await new Promise((res) =>
      setTimeout(res, (bloque.duracion / bloque.textos.length) * 1000)
    );
  }
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
loadSession(currentSessionId);
