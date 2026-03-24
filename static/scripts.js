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
/* GALERÍA DINÁMICA */
/* ========================= */
function initGallery(total = 30) {

    gallery.innerHTML = "";

    const seedOffset = Math.floor(Math.random() * 1000);

    for (let i = 0; i < total; i++) {

        const div = document.createElement("div");

        div.className = "slide";

        div.style.backgroundImage =
            `url(https://picsum.photos/1920/1080?nature&sig=${seedOffset + i})`;

        gallery.appendChild(div);

    }

    const slides = document.querySelectorAll(".slide");

    if (slides.length > 0) {

        slideIndex = 0;

        slides.forEach(s => s.classList.remove("active"));

        slides[0].classList.add("active");

    }

    if (galleryInterval) clearInterval(galleryInterval);

    galleryInterval = setInterval(() => {

        const currentSlides = document.querySelectorAll(".slide");

        if (currentSlides.length === 0) return;

        currentSlides[slideIndex].classList.remove("active");

        slideIndex = (slideIndex + 1) % currentSlides.length;

        currentSlides[slideIndex].classList.add("active");

    }, 7000);

}


/* ========================= */
/* LIMPIAR ESTADO */
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
/* DETECTAR RESPIRACION */
/* ========================= */
function detectarRespiracion(texto) {

    const t = texto.toLowerCase();

    const inhala = ["inhala","aspira","llena","aire","dentro","oxígeno"];

    const exhala = ["exhala","suelta","expulsa","fuera","vacía"];

    const retiene = ["retén","retiene","pausa","aguanta"];

    const general = ["respira","respiración"];

    if (inhala.some(p => t.includes(p))) {

        circle.className = "inhale";

        circle.innerText = "Inhala";

    }

    else if (exhala.some(p => t.includes(p))) {

        circle.className = "exhale";

        circle.innerText = "Exhala";

    }

    else if (retiene.some(p => t.includes(p))) {

        circle.className = "hold";

        circle.innerText = "Retén";

    }

    else if (general.some(p => t.includes(p))) {

        circle.className = "inhale";

        circle.innerText = "Respira";

    }

}


/* ========================= */
/* VOZ + TEXTO */
/* ========================= */
async function procesarTexto(texto, localAbort, duracion = 0, esQuiz = false) {

    if (localAbort.abort) return;

    detectarRespiracion(texto);

    block.innerHTML = "";

    for (let char of texto) {

        if (localAbort.abort) return;

        block.innerHTML += char;

        await new Promise(r => setTimeout(r, 25));

    }

    const mensaje = new SpeechSynthesisUtterance(texto);

    mensaje.lang = "es-ES";

    mensaje.rate = 0.9;

    await new Promise(resolve => {

        mensaje.onend = resolve;

        speechSynthesis.speak(mensaje);

    });

    if (duracion > 0) {

        await new Promise(r => {

            let t = duracion;

            const timer = setInterval(() => {

                if (localAbort.abort) {

                    clearInterval(timer);

                    return;

                }

                block.innerHTML =
                    `${texto}<br><span style="font-size:50px;color:#3b82f6">${t}s</span>`;

                t--;

                if (t < 0) {

                    clearInterval(timer);

                    r();

                }

            }, 1000);

        });

    }

    if (!esQuiz)
        await new Promise(r => setTimeout(r, 1500));

}


/* ========================= */
/* QUIZ INTERACTIVO */
/* ========================= */
async function ejecutarQuiz(bloque, localAbort) {

    const container = document.createElement("div");

    container.style.cssText =
        `max-width:700px;
         margin:20px auto;
         padding:25px;
         background:${bloque.color || "#1e293b"};
         border-radius:12px;
         color:white;
         text-align:center`;

    block.appendChild(container);


    await procesarTexto(bloque.pregunta, localAbort, 0, true);


    const feedbackArea = document.createElement("div");

    feedbackArea.style.marginTop = "15px";

    container.appendChild(feedbackArea);


    const btnContainer = document.createElement("div");

    container.appendChild(btnContainer);


    nextBtn.disabled = true;
    nextBtn.style.opacity = "0.5";


    return new Promise(resolve => {

        bloque.opciones.forEach((op, i) => {

            const btn = document.createElement("button");

            btn.innerText = op;

            btn.style.cssText =
                "display:block;margin:10px auto;padding:10px;width:80%";

            btn.onclick = async () => {

                const ok = i === bloque.correcta;

                const txt = ok
                    ? `Correcto. ${bloque.explicacion}`
                    : `Incorrecto. ${bloque.explicacion}`;

                feedbackArea.innerHTML =
                    ok ? "✅ " + txt : "❌ " + txt;

                await procesarTexto(txt, localAbort);

                nextBtn.disabled = false;
                nextBtn.style.opacity = "1";

                resolve();

            };

            btnContainer.appendChild(btn);

        });

    });

}


/* ========================= */
/* CARGAR JSON */
/* ========================= */
async function cargarSesiones() {

    const r = await fetch("/tvid_ejercicio.json");

    const d = await r.json();

    sesiones = d.sesiones || [];

}


/* ========================= */
/* MOSTRAR BLOQUE */
/* ========================= */
async function mostrarBloque() {

    limpiarEstado();

    const localAbort = abortController;


    nextBtn.disabled = false;
    nextBtn.style.opacity = "1";


    const bloques =
        sesiones[currentSesion].bloques;

    const bloque =
        bloques[currentBloque];


    if (bloque.tipo === "decision") {

        await ejecutarQuiz(bloque, localAbort);

    }

    else if (bloque.tipo === "tvid_ejercicio_largo") {

        for (let t of bloque.textos) {

            if (localAbort.abort) break;

            await procesarTexto(t, localAbort, 8);

        }

    }

    else if (bloque.texto) {

        const dur =
            bloque.tipo === "respiracion"
                ? (bloque.duracion || 10)
                : 0;

        await procesarTexto(bloque.texto, localAbort, dur);

    }

}


/* ========================= */
/* EVENTOS */
/* ========================= */

startBtn.onclick = async () => {

    startBtn.style.display = "none";

    audio.volume = 0.15;

    audio.play();

    initGallery(30);

    await cargarSesiones();

    currentSesion = 0;
    currentBloque = 0;

    mostrarBloque();

};


nextBtn.onclick = () => {

    if (nextBtn.disabled) return;

    const b =
        sesiones[currentSesion].bloques;

    if (currentBloque < b.length - 1)
        currentBloque++;

    else {

        currentSesion =
            (currentSesion + 1) % sesiones.length;

        currentBloque = 0;

        initGallery(30);

    }

    mostrarBloque();

};


backBtn.onclick = () => {

    if (currentBloque > 0)
        currentBloque--;

    else if (currentSesion > 0) {

        currentSesion--;

        currentBloque =
            sesiones[currentSesion].bloques.length - 1;

    }

    mostrarBloque();

};


restartBtn.onclick = () => {

    currentSesion = 0;
    currentBloque = 0;

    initGallery(30);

    mostrarBloque();

};
