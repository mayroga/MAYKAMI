// ==================== ELEMENTOS ====================
const startBtn = document.getElementById("start-btn");
const nextBtn = document.getElementById("next-btn");
const backBtn = document.getElementById("back-btn");
const block = document.getElementById("block");
const discBar = document.getElementById("disciplina-bar");
const clarBar = document.getElementById("claridad-bar");
const calmaBar = document.getElementById("calma-bar");

let sesiones = [];
let currentBloque = 0;
let currentSesion = 0;
let puntos = 0;

// Globo azul para respiración
const breathCircle = document.createElement("div");
breathCircle.className = "breath-circle";
block.appendChild(breathCircle);

const breathText = document.createElement("div");
breathText.className = "breath-text";
block.appendChild(breathText);

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

// Mostrar bloque con tiempo real y voz simulada
async function mostrarBloque(bloque) {
  block.innerHTML = ""; // Limpiar bloque
  block.appendChild(breathCircle);
  block.appendChild(breathText);

  if (bloque.tipo === "voz" || bloque.tipo === "historia" || bloque.tipo === "tvid") {
    await escribirTexto(bloque.texto, 40); // 40ms por letra, ajustable para simular voz
  }

  if (bloque.tipo === "respiracion") {
    await respirar(bloque.texto, bloque.duracion);
  }

  if (bloque.tipo === "decision") {
    await decision(bloque);
  }

  if (bloque.tipo === "visualizacion" || bloque.tipo === "estrategia" || bloque.tipo === "inteligencia_social") {
    await escribirTexto(bloque.texto, 35);
  }

  if (bloque.tipo === "recompensa") {
    puntos += bloque.puntos || 0;
  }

  if (bloque.tipo === "tvid_ejercicio_largo") {
    for (const txt of bloque.textos) {
      await escribirTexto(txt, 40);
    }
  }

  if (bloque.tipo === "cierre") {
    await escribirTexto(bloque.texto, 30);
  }
}

// Simular escritura de texto como voz
function escribirTexto(texto, velocidad) {
  return new Promise((resolve) => {
    let i = 0;
    block.innerHTML = "";
    block.appendChild(breathCircle);
    block.appendChild(breathText);

    const interval = setInterval(() => {
      if (i < texto.length) {
        breathText.innerHTML += texto[i];
        i++;
      } else {
        clearInterval(interval);
        resolve();
      }
    }, velocidad);
  });
}

// Respiración con globo azul
function respirar(texto, duracion) {
  return new Promise((resolve) => {
    breathText.innerHTML = texto;
    breathCircle.style.transform = "scale(1.5)";
    let mitad = duracion * 500; // mitad del tiempo para inflar
    setTimeout(() => {
      breathCircle.style.transform = "scale(1)";
      setTimeout(resolve, mitad);
    }, mitad);
  });
}

// Decisión con opciones y explicación
function decision(bloque) {
  return new Promise((resolve) => {
    block.innerHTML = `<div>${bloque.pregunta}</div>`;
    bloque.opciones.forEach((opt, idx) => {
      const btn = document.createElement("button");
      btn.innerText = opt;
      btn.onclick = () => {
        if (idx === bloque.correcta) {
          block.innerHTML += `<div style="color:#22c55e">Correcto ✅</div><div>${bloque.explicacion}</div>`;
          setTimeout(resolve, 2000);
        } else {
          block.innerHTML += `<div style="color:#f87171">Incorrecto ❌</div><div>${bloque.explicacion}</div>`;
        }
      };
      block.appendChild(btn);
    });
  });
}

// ==================== NAVEGACIÓN ====================
function actualizarBotones() {
  backBtn.style.display = currentBloque > 0 ? "block" : "none";
  nextBtn.style.display = currentBloque < sesiones[currentSesion].bloques.length - 1 ? "block" : "none";
}

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
