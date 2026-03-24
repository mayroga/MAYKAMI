/* ========================= */
/* ELEMENTOS PRINCIPALES */
/* ========================= */
const gallery = document.getElementById("visual-gallery");
const circle = document.getElementById("visual-circle");
const block = document.getElementById("block");
const startBtn = document.getElementById("start-btn");
const nextBtn = document.getElementById("next-btn");
const backBtn = document.getElementById("back-btn");
const restartBtn = document.getElementById("restart-btn");
const audio = document.getElementById("nature-audio");

let sesiones = [];
let currentSesion = 0;
let currentBloque = 0;

let abortController = { abort: false }; // Para detener cualquier proceso activo
let slideIndex = 0;
let galleryInterval = null;

/* ========================= */
/* CARGAR GALERIA DE FONDOS */
/* ========================= */
function initGallery(total = 30) {
    gallery.innerHTML = "";
    for (let i = 0; i < total; i++) {
        const div = document.createElement("div");
        div.className = "slide";
        div.style.backgroundImage = `url(https://picsum.photos/1920/1080?nature&sig=${i})`;
        gallery.appendChild(div);
    }
    const slides = document.querySelectorAll(".slide");
    if (slides.length > 0) slides[0].classList.add("active");

    // Cambiar imagen automáticamente cada 7s
    if (galleryInterval) clearInterval(galleryInterval);
    galleryInterval = setInterval(() => {
        slides[slideIndex].classList.remove("active");
        slideIndex = (slideIndex + 1) % slides.length;
        slides[slideIndex].classList.add("active");
    }, 7000);
}

/* ========================= */
/* FUNCIONES DE ESTADO */
/* ========================= */
function limpiarEstado() {
    abortController.abort = true; // Detener procesos activos
    abortController = { abort: false }; // Nuevo controlador
    speechSynthesis.cancel();
    circle.className = "";
    circle.innerText = "Respira";
    block.innerHTML = "";
}

/* ========================= */
/* CIRCULO RESPIRACION */
/* ========================= */
function setInhala() {
    circle.className = "inhale";
    circle.innerText = "Inhala";
}

function setExhala() {
    circle.className = "exhale";
    circle.innerText = "Exhala";
}

function setHold() {
    circle.className = "hold";
    circle.innerText = "Retén";
}

/* ========================= */
/* ESCRITURA Y VOZ SINCRONIZADA */
/* ========================= */
async function mostrarTextoYVoz(texto, localAbort) {
    if (localAbort.abort) return;

    // Primero mostrar el texto letra por letra
    block.innerHTML = "";
    for (let char of texto) {
        if (localAbort.abort) return;
        block.innerHTML += char;
        await new Promise(r => setTimeout(r, 30));
    }

    // Luego hablar el texto
    if (localAbort.abort) return;
    const u = new SpeechSynthesisUtterance(texto);
    u.lang = "es-ES";
    u.rate = 0.9;
    speechSynthesis.speak(u);
}

/* ========================= */
/* RESPIRACION AUTOMATICA */
/* ========================= */
async function ejecutarRespiracion(bloquesResp, localAbort) {
    for (let br of bloquesResp) {
        if (localAbort.abort) return;

        let dur = br.duracion || 4; // segundos por defecto
        if (br.texto.toLowerCase().includes("inhala")) setInhala();
        else if (br.texto.toLowerCase().includes("ret")) setHold();
        else if (br.texto.toLowerCase().includes("exhala")) setExhala();
        else circle.innerText = "Respira";

        block.innerHTML = br.texto;

        // Contador regresivo visual y temporizador sin bloquear
        await new Promise(r => {
            let t = dur;
            const interval = setInterval(() => {
                if (localAbort.abort) {
                    clearInterval(interval);
                    return;
                }
                block.innerHTML = `${br.texto}<br><span style="font-size:40px">${t}</span>`;
                t--;
                if (t < 0) clearInterval(interval), r();
            }, 1000);
        });
    }
    circle.className = "";
    circle.innerText = "Pausa";
}

/* ========================= */
/* CARGAR JSON DE SESIONES */
/* ========================= */
async function cargarSesiones() {
    try {
        const res = await fetch("/static/tvid_ejercicio.json");
        const data = await res.json();
        sesiones = data.sesiones || [];
    } catch (e) {
        sesiones = [{
            bloques: [{ tipo: "voz", texto: "Error al cargar sesión. Revisa el archivo JSON." }]
        }];
    }
}

/* ========================= */
/* MOSTRAR BLOQUE ACTUAL */
/* ========================= */
async function mostrarBloque() {
    limpiarEstado();
    const localAbort = abortController;

    const bloque = sesiones[currentSesion].bloques[currentBloque];

    // Control de botones
    nextBtn.style.display = (currentBloque < sesiones[currentSesion].bloques.length - 1) ? "inline-block" : "none";
    backBtn.style.display = (currentBloque > 0) ? "inline-block" : "none";

    try {
        if (bloque.tipo === "voz" || bloque.tipo === "tvid" || bloque.tipo === "estrategia" || bloque.tipo === "historia" || bloque.tipo === "visualizacion" || bloque.tipo === "recompensa" || bloque.tipo === "decision") {
            await mostrarTextoYVoz(bloque.texto, localAbort);
        } else if (bloque.tipo === "respiracion") {
            await ejecutarRespiracion([bloque], localAbort);
        } else if (bloque.tipo === "tvid_ejercicio_largo") {
            const textos = bloque.textos.map(txt => ({ texto: txt, duracion: 8 })); // 8s por cada paso
            await ejecutarRespiracion(textos, localAbort);
        }
    } catch (e) {
        block.innerHTML = "Error en el bloque. Continuando...";
    }
}

/* ========================= */
/* EVENTOS BOTONES */
/* ========================= */
startBtn.onclick = async () => {
    startBtn.style.display = "none";
    audio.volume = 0.2;
    audio.play();
    initGallery(30);
    await cargarSesiones();
    currentBloque = 0;
    mostrarBloque();
};

nextBtn.onclick = () => {
    if (currentBloque < sesiones[currentSesion].bloques.length - 1) {
        currentBloque++;
        mostrarBloque();
    }
};

backBtn.onclick = () => {
    if (currentBloque > 0) {
        currentBloque--;
        mostrarBloque();
    }
};

restartBtn.onclick = () => {
    currentBloque = 0;
    mostrarBloque();
};
