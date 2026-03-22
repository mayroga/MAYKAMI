// ======== ELEMENTOS DEL DOM ========
const startBtn = document.getElementById("start-btn");
const nextBtn = document.getElementById("next-btn");
const backBtn = document.getElementById("back-btn");
const restartBtn = document.getElementById("restart-btn");
const blockContainer = document.getElementById("block");
const blockText = document.getElementById("block-text");
const blockTitle = document.getElementById("block-title");
const feedbackText = document.getElementById("feedback-text");
const pointsDisplay = document.getElementById("points");
const blueBall = document.getElementById("blue-ball");

// ======== VARIABLES ========
let sesiones = [];
let currentSesion = 0;
let currentBloque = 0;
let puntos = 0;
let currentBloques = [];

// ======== CARGA JSON ========
fetch('static/tvid_ejercicio.json')
  .then(res => res.json())
  .then(data => {
    sesiones = data.sesiones;
    console.log("Sesiones cargadas:", sesiones.length);
  })
  .catch(err => console.error("Error cargando JSON:", err));

// ======== INICIAR SESIÓN ========
startBtn.addEventListener("click", () => {
    if(!sesiones.length) return alert("JSON aún no cargado.");
    currentSesion = 0;
    loadSesion(currentSesion);
    startBtn.style.display = "none";
    nextBtn.style.display = "inline-block";
    backBtn.style.display = "inline-block";
});

// ======== CARGAR SESIÓN ========
function loadSesion(sesionIndex) {
    puntos = 0;
    currentBloques = sesiones[sesionIndex].bloques;
    currentBloque = 0;
    pointsDisplay.textContent = `Puntos: ${puntos}`;
    renderBloque();
}

// ======== RENDERIZAR BLOQUE ========
function renderBloque() {
    feedbackText.textContent = "";
    const bloque = currentBloques[currentBloque];
    if(!bloque) return;

    // Cambiar color de fondo
    blockContainer.style.backgroundColor = bloque.color || "#ffffff";

    // Reset animación del globo
    blueBall.style.display = "none";
    blueBall.style.animation = "";

    // Mostrar título si aplica
    blockTitle.textContent = bloque.titulo || "";

    switch(bloque.tipo) {
        case "voz":
        case "inteligencia_social":
        case "estrategia":
        case "historia":
        case "visualizacion":
        case "recompensa":
        case "cierre":
        case "tvid":
            blockText.textContent = bloque.texto;
            break;

        case "decision":
            renderDecision(bloque);
            break;

        case "respiracion":
            renderRespiracion(bloque);
            break;

        case "tvid_ejercicio_largo":
            renderTvidEjercicioLargo(bloque);
            break;

        default:
            blockText.textContent = "Tipo de bloque desconocido.";
    }
}

// ======== DECISION ========
function renderDecision(bloque) {
    blockText.textContent = bloque.pregunta;
    let opcionesHTML = "";
    bloque.opciones.forEach((op, i) => {
        opcionesHTML += `<button class="decision-btn" data-index="${i}">${op}</button>`;
    });
    blockText.innerHTML += `<div class="decision-options">${opcionesHTML}</div>`;

    document.querySelectorAll(".decision-btn").forEach(btn => {
        btn.addEventListener("click", e => {
            const index = parseInt(e.target.dataset.index);
            const correcto = index === bloque.correcta;
            feedbackText.innerHTML = `<strong>${correcto ? "Correcto ✅" : "Incorrecto ❌"}</strong><br>${bloque.explicacion}`;
            if(correcto) puntos += bloque.recompensa || 0;
            pointsDisplay.textContent = `Puntos: ${puntos}`;
        });
    });
}

// ======== RESPIRACION ========
function renderRespiracion(bloque) {
    blockText.textContent = bloque.texto;
    blueBall.style.display = "block";
    blueBall.style.animation = `inflate ${bloque.duracion}s ease-in-out forwards`;
}

// ======== EJERCICIO LARGO ========
function renderTvidEjercicioLargo(bloque) {
    let index = 0;
    blockText.textContent = bloque.textos[index];

    function nextText() {
        index++;
        if(index < bloque.textos.length) {
            blockText.textContent = bloque.textos[index];
        } else {
            nextBtn.removeEventListener("click", nextText);
        }
    }

    nextBtn.addEventListener("click", nextText);
}

// ======== NAVEGACIÓN ========
nextBtn.addEventListener("click", () => {
    if(currentBloque < currentBloques.length -1) {
        currentBloque++;
        renderBloque();
    } else {
        alert("Fin de la sesión.");
    }
});

backBtn.addEventListener("click", () => {
    if(currentBloque > 0) {
        currentBloque--;
        renderBloque();
    }
});

restartBtn.addEventListener("click", () => {
    loadSesion(currentSesion);
});

// ======== ANIMACIÓN DE GLOBO ========
const style = document.createElement('style');
style.innerHTML = `
@keyframes inflate {
  0% { transform: scale(1); }
  50% { transform: scale(1.5); }
  100% { transform: scale(1); }
}
#blue-ball {
    width: 50px;
    height: 50px;
    border-radius: 50%;
    background-color: #2563eb;
    position: absolute;
    bottom: 20px;
    right: 20px;
    display: none;
}
.decision-options button {
    margin: 5px;
    padding: 10px 15px;
    border-radius: 8px;
    border: none;
    cursor: pointer;
    font-size: 16px;
}
`;
document.head.appendChild(style);

// ======== RESPONSIVE ========
window.addEventListener("resize", () => {
    if(window.innerWidth < 768){
        blockText.style.fontSize = "1rem";
    } else {
        blockText.style.fontSize = "1.2rem";
    }
});
