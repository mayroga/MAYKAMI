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

let abortController = { abort: false }; 
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
    if (slides.length > 0) {
        slideIndex = 0;
        slides[0].classList.add("active");
    }

    if (galleryInterval) clearInterval(galleryInterval);
    galleryInterval = setInterval(() => {
        if (slides.length === 0) return;
        slides[slideIndex].classList.remove("active");
        slideIndex = (slideIndex + 1) % slides.length;
        slides[slideIndex].classList.add("active");
    }, 7000);
}

/* ========================= */
/* FUNCIONES DE ESTADO */
/* ========================= */
function limpiarEstado() {
    abortController.abort = true; 
    abortController = { abort: false }; 
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

    block.innerHTML = "";
    for (let char of texto) {
        if (localAbort.abort) return;
        block.innerHTML += char;
        await new Promise(r => setTimeout(r, 25));
    }

    if (localAbort.abort) return;
    const u = new SpeechSynthesisUtterance(texto);
    u.lang = "es-ES";
    u.rate = 0.95;
    speechSynthesis.speak(u);
}

/* ========================= */
/* RESPIRACION AUTOMATICA */
/* ========================= */
async function ejecutarRespiracion(bloquesResp, localAbort) {
    for (let br of bloquesResp) {
        if (localAbort.abort) return;

        let dur = br.duracion || 4; 
        const txtBajo = br.texto.toLowerCase();

        if (txtBajo.includes("inhala")) setInhala();
        else if (txtBajo.includes("ret") || txtBajo.includes("fija")) setHold();
        else if (txtBajo.includes("exhala") || txtBajo.includes("expulsa")) setExhala();
        else circle.innerText = "Respira";

        await new Promise(r => {
            let t = dur;
            const interval = setInterval(() => {
                if (localAbort.abort) {
                    clearInterval(interval);
                    return;
                }
                block.innerHTML = `${br.texto}<br><span style="font-size:45px; font-weight:bold;">${t}s</span>`;
                t--;
                if (t < 0) {
                    clearInterval(interval);
                    r();
                }
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
        const res = await fetch("/tvid_ejercicio.json");
        const data = await res.json();
        sesiones = data.sesiones || [];
        console.log("Sistema MayKaMi: Datos cargados correctamente.");
    } catch (e) {
        console.error("Error cargando base de datos:", e);
        sesiones = [{
            bloques: [{ tipo: "voz", texto: "Error crítico: No se pudo conectar con el servidor de sesiones." }]
        }];
    }
}

/* ========================= */
/* MOSTRAR BLOQUE ACTUAL */
/* ========================= */
async function mostrarBloque() {
    limpiarEstado();
    const localAbort = abortController;

    if (!sesiones[currentSesion]) return;
    const listaBloques = sesiones[currentSesion].bloques;
    const bloque = listaBloques[currentBloque];

    // CONTROL DE BOTONES PARA 21 SESIONES
    // "Atrás" se muestra si no estás en el primer bloque de la primera sesión
    backBtn.style.display = (currentBloque > 0 || currentSesion > 0) ? "inline-block" : "none";
    
    // "Siguiente" se muestra si hay más bloques O más sesiones por delante
    const hayMasBloques = currentBloque < listaBloques.length - 1;
    const hayMasSesiones = currentSesion < sesiones.length - 1;
    nextBtn.style.display = (hayMasBloques || hayMasSesiones) ? "inline-block" : "none";

    // "Reiniciar" solo aparece al final de la sesión 21 (último bloque de la última sesión)
    restartBtn.style.display = (!hayMasBloques && !hayMasSesiones) ? "inline-block" : "none";

    try {
        if (bloque.tipo === "respiracion") {
            await ejecutarRespiracion([bloque], localAbort);
        } 
        else if (bloque.tipo === "tvid_ejercicio_largo") {
            const pasos = bloque.textos.map(txt => ({ texto: txt, duracion: 8 }));
            await ejecutarRespiracion(pasos, localAbort);
        } 
        else if (bloque.texto) {
            await mostrarTextoYVoz(bloque.texto, localAbort);
        }
    } catch (e) {
        console.error("Error en flujo de bloque:", e);
        block.innerHTML = "Continuando secuencia...";
    }
}

/* ========================= */
/* EVENTOS BOTONES */
/* ========================= */
startBtn.onclick = async () => {
    startBtn.style.display = "none";
    
    audio.volume = 0.2;
    audio.play().catch(e => console.log("Audio requiere interacción manual adicional."));

    initGallery(30);
    await cargarSesiones();
    currentSesion = 0; // Asegurar empezar en sesión 1
    currentBloque = 0;
    mostrarBloque();
};

nextBtn.onclick = () => {
    const listaBloques = sesiones[currentSesion].bloques;
    
    if (currentBloque < listaBloques.length - 1) {
        // Avanza al siguiente bloque de la misma sesión
        currentBloque++;
    } else if (currentSesion < sesiones.length - 1) {
        // Salta a la siguiente sesión
        currentSesion++;
        currentBloque = 0;
    }
    mostrarBloque();
};

backBtn.onclick = () => {
    if (currentBloque > 0) {
        currentBloque--;
    } else if (currentSesion > 0) {
        // Retrocede a la sesión anterior, al último bloque de esa sesión
        currentSesion--;
        currentBloque = sesiones[currentSesion].bloques.length - 1;
    }
    mostrarBloque();
};

restartBtn.onclick = () => {
    currentSesion = 0;
    currentBloque = 0;
    mostrarBloque();
};
