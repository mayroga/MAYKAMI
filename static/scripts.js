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
    const seed = Math.floor(Math.random() * 1000);

    for (let i = 0; i < total; i++) {
        const div = document.createElement("div");
        div.className = "slide";
        div.style.backgroundImage = `url(https://picsum.photos/1920/1080?nature&sig=${seed + i})`;
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
        const slides = document.querySelectorAll(".slide");
        slides[slideIndex].classList.remove("active");
        slideIndex = (slideIndex + 1) % slides.length;
        slides[slideIndex].classList.add("active");
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
/* RESPIRACIÓN AUTOMÁTICA */
/* ========================= */
function detectarRespiracion(texto) {
    const t = texto.toLowerCase();
    const inhala = ["inhala", "aspira", "llena", "aire", "dentro", "oxígeno"];
    const exhala = ["exhala", "suelta", "expulsa", "fuera", "vacía"];
    const retiene = ["retén", "retiene", "pausa", "fija", "aguanta"];
    const general = ["respira", "respiración", "pulmones", "diafragma"];

    if (inhala.some(p => t.includes(p))) { circle.className = "inhale"; circle.innerText = "Inhala"; }
    else if (exhala.some(p => t.includes(p))) { circle.className = "exhale"; circle.innerText = "Exhala"; }
    else if (retiene.some(p => t.includes(p))) { circle.className = "hold"; circle.innerText = "Retén"; }
    else if (general.some(p => t.includes(p))) { circle.className = "inhale"; circle.innerText = "Respira"; }
}

/* ========================= */
/* ESCRITURA MECÁNICA + VOZ */
/* ========================= */
async function procesarTexto(texto, localAbort, duracion = 0, esQuiz = false) {
    if (!texto) texto = "";
    if (localAbort.abort) return;

    detectarRespiracion(texto);

    if (!esQuiz) block.innerHTML = "";

    for (let c of texto) {
        if (localAbort.abort) return;
        block.innerHTML += c;
        await new Promise(r => setTimeout(r, 25));
    }

    const msg = new SpeechSynthesisUtterance(texto);
    msg.lang = "es-ES";
    msg.rate = 0.9;

    await new Promise(resolve => {
        msg.onend = resolve;
        speechSynthesis.speak(msg);
    });

    if (duracion > 0) {
        await new Promise(r => {
            let t = duracion;
            const timer = setInterval(() => {
                if (localAbort.abort) { clearInterval(timer); return; }
                block.innerHTML = `${texto}<br><span style="font-size:50px;color:#3b82f6">${t}</span>`;
                t--;
                if (t < 0) { clearInterval(timer); r(); }
            }, 1000);
        });
    }

    if (!esQuiz) await new Promise(r => setTimeout(r, 1200));
}

/* ========================= */
/* ESCRIBIR EN ELEMENTO (para quiz) */
/* ========================= */
async function escribirEn(el, texto, localAbort) {
    el.innerHTML = "";
    for (let c of texto) {
        if (localAbort.abort) return;
        el.innerHTML += c;
        await new Promise(r => setTimeout(r, 25));
    }
    const msg = new SpeechSynthesisUtterance(texto);
    msg.lang = "es-ES";
    await new Promise(resolve => {
        msg.onend = resolve;
        speechSynthesis.speak(msg);
    });
}

/* ========================= */
/* QUIZ INTERACTIVO */
/* ========================= */
async function ejecutarQuiz(bloque, localAbort) {
    block.innerHTML = "";

    const container = document.createElement("div");
    container.style.maxWidth = "700px";
    container.style.margin = "auto";
    container.style.textAlign = "center";
    container.style.backgroundColor = bloque.color || "#1e293b";
    container.style.padding = "20px";
    container.style.borderRadius = "12px";
    block.appendChild(container);

    await escribirEn(container, bloque.pregunta, localAbort);

    const feedback = document.createElement("div");
    feedback.style.marginTop = "15px";
    feedback.style.fontWeight = "bold";
    feedback.style.minHeight = "1.5em";
    container.appendChild(feedback);

    const btnBox = document.createElement("div");
    btnBox.style.marginTop = "15px";
    container.appendChild(btnBox);

    nextBtn.disabled = true;
    nextBtn.style.opacity = "0.5";

    return new Promise(resolve => {
        bloque.opciones.forEach((op, i) => {
            const b = document.createElement("button");
            b.innerText = op;
            b.style.display = "block";
            b.style.width = "85%";
            b.style.margin = "10px auto";
            b.style.padding = "12px";
            b.style.borderRadius = "8px";
            b.style.cursor = "pointer";
            b.style.background = "#334155";
            b.style.color = "white";
            b.style.border = "1px solid #475569";
            b.style.fontSize = "1.1em";

            b.onclick = async () => {
                btnBox.querySelectorAll("button").forEach(x => x.disabled = true);

                const ok = i === bloque.correcta;
                const txt = ok ? "✅ Correcto. " + bloque.explicacion : "❌ Incorrecto. " + bloque.explicacion;
                feedback.innerHTML = txt;

                await procesarTexto(txt, localAbort);

                nextBtn.disabled = false;
                nextBtn.style.opacity = "1";

                resolve();
            };

            btnBox.appendChild(b);
        });
    });
}

/* ========================= */
/* CARGAR JSON DE SESIONES */
/* ========================= */
async function cargarSesiones() {
    try {
        const res = await fetch("/tvid_ejercicio.json");
        const data = await res.json();
        sesiones = data.sesiones || [];
    } catch (e) { console.error("Error al cargar sesiones:", e); }
}

/* ========================= */
/* MOSTRAR BLOQUES */
/* ========================= */
async function mostrarBloque() {
    limpiarEstado();
    const localAbort = abortController;

    if (!sesiones[currentSesion]) return;
    const bloques = sesiones[currentSesion].bloques;
    const bloque = bloques[currentBloque];

    backBtn.style.display = (currentSesion === 0 && currentBloque === 0) ? "none" : "inline-block";
    nextBtn.style.display = "inline-block";

    try {
        if (bloque.tipo === "decision") {
            await ejecutarQuiz(bloque, localAbort);
        } else if (bloque.tipo === "tvid_ejercicio_largo") {
            for (let t of bloque.textos) {
                if (localAbort.abort) break;
                await procesarTexto(t, localAbort, 8);
            }
        } else if (bloque.tipo === "respiracion") {
            await procesarTexto(bloque.texto, localAbort, bloque.duracion || 10);
        } else {
            await procesarTexto(bloque.texto || "", localAbort, 0);
        }
    } catch (e) { console.error("Error mostrando bloque:", e); }
}

/* ========================= */
/* BOTONES DE CONTROL */
/* ========================= */
startBtn.onclick = async () => {
    startBtn.style.display = "none";
    nextBtn.style.display = "inline-block";
    audio.volume = 0.15;
    audio.play().catch(()=>{});
    initGallery(30);
    await cargarSesiones();
    currentSesion = 0;
    currentBloque = 0;
    mostrarBloque();
};

nextBtn.onclick = () => {
    if (nextBtn.disabled) return;

    const bloques = sesiones[currentSesion].bloques;
    if (currentBloque < bloques.length - 1) currentBloque++;
    else if (currentSesion < sesiones.length - 1) { currentSesion++; currentBloque = 0; }
    else { currentSesion = 0; currentBloque = 0; initGallery(30); }

    mostrarBloque();
};

backBtn.onclick = () => {
    if (currentBloque > 0) currentBloque--;
    else if (currentSesion > 0) { currentSesion--; currentBloque = sesiones[currentSesion].bloques.length - 1; }
    mostrarBloque();
};

restartBtn.onclick = () => {
    currentSesion = 0;
    currentBloque = 0;
    initGallery(30);
    mostrarBloque();
};
