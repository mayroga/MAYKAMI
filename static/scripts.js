/* ==================== ELEMENTOS ==================== */

const startBtn = document.getElementById("start-btn");
const nextBtn = document.getElementById("next-btn");
const backBtn = document.getElementById("back-btn");
const restartBtn = document.getElementById("restart-btn");
const block = document.getElementById("block");

const discBar = document.getElementById("disciplina-bar");
const clarBar = document.getElementById("claridad-bar");
const calmaBar = document.getElementById("calma-bar");

/* ================= VISUAL PROFUNDO ================= */

const gallery = document.getElementById("visual-gallery");
const circle = document.getElementById("visual-circle");
const audio = document.getElementById("nature-audio");

let slides = [];
let slideIndex = 0;
let slideInterval = null;

/* crear paisajes */

for (let i = 0; i < 20; i++) {

    const div = document.createElement("div");

    div.className = "slide";

    div.style.backgroundImage =
        `url(https://picsum.photos/1920/1080?nature&sig=${i})`;

    gallery.appendChild(div);

}

slides = document.querySelectorAll(".slide");

function cambiarSlide() {

    slides[slideIndex].classList.remove("active");

    slideIndex = (slideIndex + 1) % slides.length;

    slides[slideIndex].classList.add("active");

}


/* ===== VISUAL ON ===== */

function activarVisual(tipo = "inhala") {

    if (!circle) return;

    circle.style.display = "flex";

    circle.classList.remove("inhale", "exhale", "hold");

    if (tipo === "inhala") {

        circle.innerText = "Inhala";
        circle.classList.add("inhale");

    }

    if (tipo === "exhala") {

        circle.innerText = "Exhala";
        circle.classList.add("exhale");

    }

    if (tipo === "hold") {

        circle.innerText = "Retén";
        circle.classList.add("hold");

    }

    if (slides.length > 0) {

        slides[0].classList.add("active");

    }

    if (!slideInterval) {

        slideInterval = setInterval(cambiarSlide, 6000);

    }

    if (audio) {

        audio.volume = 0.25;
        audio.play().catch(() => {});

    }

}

function pararVisual() {

    if (!circle) return;

    circle.style.display = "none";

    if (audio) audio.pause();

    if (slideInterval) {

        clearInterval(slideInterval);

        slideInterval = null;

    }

}



/* ================= VARIABLES ================= */

let sesiones = [];
let currentBloque = 0;
let currentSesion = 0;


/* ================= PANEL ================= */

function updatePanel() {

    discBar.style.width = "50%";
    clarBar.style.width = "50%";
    calmaBar.style.width = "50%";

}



/* ================= VOZ ================= */

function voz() {

    return speechSynthesis.getVoices().find(v => v.lang.startsWith("es"));

}

function hablar(texto, lento = false) {

    return new Promise(r => {

        speechSynthesis.cancel();

        const u = new SpeechSynthesisUtterance(texto);

        u.lang = "es-ES";

        u.voice = voz();

        u.rate = lento ? 0.8 : 0.9;

        u.onend = r;

        speechSynthesis.speak(u);

    });

}



/* ================= DETECTOR ================= */

function detectarRespiracion(texto) {

    if (!texto) return false;

    texto = texto.toLowerCase();

    if (texto.includes("respira")) return true;
    if (texto.includes("inhala")) return true;
    if (texto.includes("exhala")) return true;
    if (texto.includes("lento")) return true;
    if (texto.includes("calma")) return true;
    if (texto.includes("silencio")) return true;
    if (texto.includes("observa")) return true;
    if (texto.includes("siente")) return true;
    if (texto.includes("mantente")) return true;

    return false;

}



/* ================= TEXTO ================= */

async function escribir(texto, color = "#fff", forzarVisual = false) {

    block.innerHTML = "";

    const div = document.createElement("div");

    div.style.fontSize = "26px";
    div.style.color = color;

    block.appendChild(div);

    if (detectarRespiracion(texto) || forzarVisual) {

        activarVisual("inhala");

    } else {

        pararVisual();

    }

    await hablar(texto, true);

    for (let i = 0; i < texto.length; i++) {

        div.innerHTML += texto[i];

        await new Promise(r => setTimeout(r, 18));

    }

    await new Promise(r => setTimeout(r, 1500));

}



/* ================= RESPIRACION ================= */

async function respirar(texto, duracion) {

    activarVisual("inhala");

    await hablar(texto, true);

    for (let i = duracion; i > 0; i--) {

        block.innerHTML = texto + "<br>" + i;

        await new Promise(r => setTimeout(r, 1000));

    }

    pararVisual();

}



/* ================= MOSTRAR BLOQUE ================= */

async function mostrarBloque(b) {

    if (!b) return;

    switch (b.tipo) {

        case "voz":
        case "tvid":
        case "historia":

            await escribir(b.texto, b.color);

            break;


        case "respiracion":

            await respirar(b.texto, b.duracion);

            break;


        case "tvid_ejercicio_largo":

            activarVisual("inhala");

            for (const t of b.textos) {

                await escribir(t, b.color, true);

            }

            if (b.duracion) {

                await respirar("Respira", b.duracion);

            }

            pararVisual();

            break;


        case "cierre":

            await escribir(b.texto);

            restartBtn.style.display = "block";

            break;

    }

}



/* ================= CARGAR ================= */

async function cargarSesiones() {

    try {

        const r = await fetch("/tvid_ejercicio.json");

        const d = await r.json();

        sesiones = d.sesiones || [];

        if (!sesiones.length) {

            block.innerText = "No hay sesiones";

            return;

        }

        currentSesion =
            Math.floor(Math.random() * sesiones.length);

    } catch {

        block.innerText = "Error cargando";

    }

}



/* ================= MOSTRAR ================= */

async function mostrarActual() {

    if (!sesiones.length) return;

    if (!sesiones[currentSesion]) return;

    if (!sesiones[currentSesion].bloques) return;

    if (!sesiones[currentSesion].bloques[currentBloque]) return;

    await mostrarBloque(

        sesiones[currentSesion].bloques[currentBloque]

    );

}



/* ================= BOTONES ================= */

startBtn.onclick = async () => {

    await cargarSesiones();

    startBtn.style.display = "none";

    nextBtn.style.display = "block";

    currentBloque = 0;

    mostrarActual();

};

nextBtn.onclick = () => {

    currentBloque++;

    mostrarActual();

};

backBtn.onclick = () => {

    if (currentBloque > 0) {

        currentBloque--;

        mostrarActual();

    }

};

restartBtn.onclick = () => {

    currentBloque = 0;

    mostrarActual();

};



updatePanel();
