/* ========================= */
/* ELEMENTOS */
/* ========================= */

const gallery = document.getElementById("visual-gallery");
const circle = document.getElementById("visual-circle");
const block = document.getElementById("block");

const startBtn = document.getElementById("start-btn");
const nextBtn = document.getElementById("next-btn");
const backBtn = document.getElementById("back-btn");
const restartBtn = document.getElementById("restart-btn");

const audio = document.getElementById("nature-audio");


/* ========================= */
/* GALERIA NATURAL */
/* ========================= */

let slides = [];
let slideIndex = 0;

for (let i = 0; i < 20; i++) {

    const div = document.createElement("div");

    div.className = "slide";

    div.style.backgroundImage =
        "url(https://picsum.photos/1920/1080?nature&sig=" + i);

    gallery.appendChild(div);

}

slides = document.querySelectorAll(".slide");

slides[0].classList.add("active");

setInterval(() => {

    slides[slideIndex].classList.remove("active");

    slideIndex++;

    if (slideIndex >= slides.length) slideIndex = 0;

    slides[slideIndex].classList.add("active");

}, 7000);



/* ========================= */
/* RESPIRACION */
/* ========================= */

function setInhala() {

    circle.className = "";
    circle.classList.add("inhale");
    circle.innerText = "Inhala";

}

function setExhala() {

    circle.className = "";
    circle.classList.add("exhale");
    circle.innerText = "Exhala";

}

function setHold() {

    circle.className = "";
    circle.classList.add("hold");
    circle.innerText = "Retén";

}



/* ========================= */
/* VOZ */
/* ========================= */

function voz() {

    const v = speechSynthesis.getVoices();

    for (let x of v) {

        if (x.lang.startsWith("es")) return x;

    }

    return v[0];

}

function hablar(texto) {

    return new Promise(resolve => {

        try {

            speechSynthesis.cancel();

            const u = new SpeechSynthesisUtterance(texto);

            u.lang = "es-ES";
            u.voice = voz();
            u.rate = 0.9;

            u.onend = resolve;

            speechSynthesis.speak(u);

        } catch {

            resolve();

        }

    });

}



/* ========================= */
/* TEXTO SEGURO */
/* ========================= */

async function escribirSeguro(texto) {

    if (!texto) texto = "...";

    block.innerHTML = "";

    try {

        await hablar(texto);

    } catch {}

    for (let i = 0; i < texto.length; i++) {

        block.innerHTML += texto[i];

        await new Promise(r => setTimeout(r, 15));

    }

}



/* ========================= */
/* CONTADOR SEGURO */
/* ========================= */

async function contadorSeguro(texto, tiempo) {

    if (!tiempo) tiempo = 5;

    for (let i = tiempo; i > 0; i--) {

        block.innerHTML = texto + "<br>" + i;

        await new Promise(r => setTimeout(r, 1000));

    }

}



/* ========================= */
/* RESPIRACION SEGURA */
/* ========================= */

async function respirarSeguro(ciclos) {

    if (!ciclos) ciclos = 2;

    for (let i = 0; i < ciclos; i++) {

        setInhala();
        await contadorSeguro("Inhala", 4);

        setHold();
        await contadorSeguro("Retén", 4);

        setExhala();
        await contadorSeguro("Exhala", 6);

    }

}



/* ========================= */
/* SESIONES */
/* ========================= */

let sesiones = [];
let currentSesion = 0;
let currentBloque = 0;



async function cargarSesiones() {

    try {

        const r = await fetch("/tvid_ejercicio.json");

        const d = await r.json();

        sesiones = d.sesiones || d || [];

    } catch {

        sesiones = [];

    }

    if (sesiones.length === 0) {

        sesiones = [

            {
                bloques: [
                    { texto: "Respira", ciclos: 2 },
                    { texto: "Concéntrate", tiempo: 5 },
                    { texto: "Sigue adelante" }
                ]
            }

        ];

    }

    currentSesion = Math.floor(Math.random() * sesiones.length);

}



/* ========================= */
/* MOSTRAR BLOQUE FLEXIBLE */
/* ========================= */

async function mostrarBloque(b) {

    nextBtn.style.display = "none";
    backBtn.style.display = "none";

    if (!b) {

        await escribirSeguro("Continuar");

    }

    else if (b.ciclos) {

        await respirarSeguro(b.ciclos);

    }

    else if (b.tiempo || b.duracion) {

        await contadorSeguro(
            b.texto || "Respira",
            b.tiempo || b.duracion
        );

    }

    else if (b.texto) {

        await escribirSeguro(b.texto);

    }

    else {

        await escribirSeguro("...");

    }

    if (currentBloque <
        sesiones[currentSesion].bloques.length - 1) {

        nextBtn.style.display = "inline-block";

    }

    if (currentBloque > 0) {

        backBtn.style.display = "inline-block";

    }

}



/* ========================= */
/* CONTROL */
/* ========================= */

async function mostrarActual() {

    const b =
        sesiones[currentSesion].bloques[currentBloque];

    await mostrarBloque(b);

}



/* ========================= */
/* BOTONES */
/* ========================= */

startBtn.onclick = async () => {

    try {

        audio.volume = 0.3;
        await audio.play();

    } catch {}

    await cargarSesiones();

    startBtn.style.display = "none";

    await new Promise(r => setTimeout(r, 2000));

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
