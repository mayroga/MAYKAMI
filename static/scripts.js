/* ============================================================ */
/* MAYKAMI NEUROGAME ENGINE - AURA BY MAY ROGA LLC              */
/* ============================================================ */

const gallery = document.getElementById("visual-gallery");
const circle = document.getElementById("visual-circle");
const block = document.getElementById("block");
const startBtn = document.getElementById("start-btn");
const nextBtn = document.getElementById("next-btn");
const backBtn = document.getElementById("back-btn");
const restartBtn = document.getElementById("restart-btn");
const pauseBtn = document.getElementById("pause-btn"); 
const audio = document.getElementById("nature-audio");

// Estado de progreso: Una sesión por día (1 a 21)
let userData = JSON.parse(localStorage.getItem("maykamiData")) || {
    sessionId: 1, 
    step: 0,
    disciplina: 40,
    ultimaSesion: null // Para control diario si se desea implementar bloqueo
};

let sesionActualData = null;
let abortController = { abort: false };
let isPaused = false;
let slideIndex = 0;

/* ==================== BIENVENIDAS MOTIVADORAS (21 VARIANTES) ==================== */
function obtenerBienvenida(id) {
    const mensajes = {
        1: "Bienvenido al origen de tu nueva realidad. Hoy empezamos a programar tu mente para el éxito absoluto.",
        2: "Tu disciplina está creciendo. Hoy fortaleceremos tu capacidad de atraer abundancia.",
        3: "La claridad mental es poder. Prepárate para ver oportunidades donde otros ven obstáculos.",
        7: "Una semana de evolución. Tu mente ya está vibrando en la frecuencia de la riqueza.",
        14: "Catorce días de dominio propio. Tu energía está en su punto más alto.",
        21: "Sesión de maestría total. Has reprogramado tu destino. Disfruta de esta culminación."
    };
    return mensajes[id] || `Sesión ${id}: Tu compromiso con el éxito es tu mayor activo. Comencemos.`;
}

/* ==================== MOTOR DE VOZ Y GLOBO DINÁMICO ==================== */
function hablar(texto) {
    return new Promise(resolve => {
        window.speechSynthesis.cancel();
        const utter = new SpeechSynthesisUtterance(texto.replace(/<[^>]*>/g, ""));
        utter.lang = "es-ES";
        utter.rate = 0.90; // Velocidad pausada para autoridad y peso emocional

        const t = texto.toLowerCase();
        if (["inhala", "aspira", "aire"].some(p => t.includes(p))) { 
            circle.className = "inhale"; circle.innerText = "Inhala"; 
        } else if (["exhala", "suelta", "fuera"].some(p => t.includes(p))) { 
            circle.className = "exhale"; circle.innerText = "Exhala"; 
        } else if (["retén", "pausa", "aguanta"].some(p => t.includes(p))) { 
            circle.className = "hold"; circle.innerText = "Retén"; 
        } else { 
            circle.className = ""; circle.innerText = "MAYKAMI"; 
        }

        utter.onend = resolve;
        utter.onerror = resolve;
        window.speechSynthesis.speak(utter);
    });
}

/* ==================== LECTURA Y CONSOLIDACIÓN CON RESPIRACIÓN ==================== */
async function escribirTextoYHablar(texto, localAbort) {
    if (localAbort.abort) return;
    block.innerHTML = "";
    
    await hablar(texto);

    let i = 0;
    await new Promise(resolve => {
        const interval = setInterval(() => {
            if (localAbort.abort || i >= texto.length) {
                clearInterval(interval);
                resolve();
            } else if (!isPaused) {
                block.insertAdjacentHTML('beforeend', texto[i]);
                i++;
            }
        }, 30);
    });

    // PAUSA DE CONSOLIDACIÓN RESPIRATORIA (12 SEGUNDOS)
    if (!localAbort.abort) {
        await iniciarContador(12, "Respira y absorbe este poder...", localAbort, true);
    }
}

/* ==================== CONTADOR INDEPENDIENTE Y ASISTENTE FÍSICO ==================== */
async function iniciarContador(segundos, texto, localAbort, esConsolidacion = false) {
    return new Promise(r => {
        let t = segundos;
        const timer = setInterval(() => {
            if (localAbort.abort) { clearInterval(timer); return; }
            if (!isPaused) {
                const color = esConsolidacion ? "#10b981" : "#60a5fa"; // Verde para consolidar éxito
                
                // Guía de respiración durante la consolidación (4s c/u)
                if (esConsolidacion) {
                    if (t > 8) { circle.className = "inhale"; circle.innerText = "Inhala"; }
                    else if (t > 4) { circle.className = "hold"; circle.innerText = "Retén"; }
                    else { circle.className = "exhale"; circle.innerText = "Exhala"; }
                }

                block.innerHTML = `<span style="color:#94a3b8; font-size:18px;">${texto}</span><br>
                                   <span style="font-size:55px; color:${color}; font-weight:bold;">${t}s</span>`;
                
                if (t <= 0) { 
                    clearInterval(timer); 
                    circle.className = ""; circle.innerText = "MAYKAMI";
                    r(); 
                }
                t--;
            }
        }, 1000);
    });
}

/* ==================== LÓGICA DE SESIONES (LOOP 1-21) ==================== */
async function cargarSesion() {
    try {
        const res = await fetch("/tvid_ejercicio.json");
        const data = await res.json();
        // Buscar sesión actual o reiniciar a la 1 (Loop Infinito)
        sesionActualData = data.sesiones.find(s => s.id === userData.sessionId);
        if (!sesionActualData) {
            userData.sessionId = 1;
            sesionActualData = data.sesiones[0];
        }
    } catch (e) {
        block.innerText = "Error cargando la base de datos MAYKAMI.";
    }
}

async function mostrarBloque() {
    limpiarEstado();
    const localAbort = abortController;
    const bloque = sesionActualData.bloques[userData.step];

    if (!bloque) {
        finalizarSesion();
        return;
    }

    nextBtn.style.display = "none"; 
    restartBtn.style.display = "none";
    pauseBtn.style.display = "inline-block";
    backBtn.style.display = userData.step > 0 ? "inline-block" : "none";

    // 1. Bloques largos (Arrays de textos TVD)
    if (bloque.textos && Array.isArray(bloque.textos)) {
        for (const frase of bloque.textos) {
            if (localAbort.abort) return;
            await escribirTextoYHablar(frase, localAbort);
        }
        if (bloque.duracion) await iniciarContador(bloque.duracion, "Asimila la técnica...", localAbort);
        nextBtn.style.display = "inline-block";
    } 
    
    // 2. Bloques de Decisión (Quiz de Disciplina)
    else if (bloque.tipo === "decision") {
        await escribirTextoYHablar(bloque.pregunta, localAbort);
        const btnCont = document.createElement("div");
        btnCont.style.marginTop = "20px";
        bloque.opciones.forEach((opt, idx) => {
            const btn = document.createElement("button");
            btn.innerText = opt;
            btn.className = "quiz-btn"; // Estilo en tu CSS
            btn.onclick = async () => {
                const esCorrecto = (idx === bloque.correcta);
                const feedback = esCorrecto ? `Correcto. ${bloque.explicacion}` : `Incorrecto. ${bloque.explicacion}`;
                await escribirTextoYHablar(feedback, localAbort);
                if (esCorrecto) userData.disciplina += 5;
                guardarProgreso();
                nextBtn.style.display = "inline-block";
            };
            btnCont.appendChild(btn);
        });
        block.appendChild(btnCont);
    } 

    // 3. Texto Simple o Cierre
    else if (bloque.texto) {
        await escribirTextoYHablar(bloque.texto, localAbort);
        if (bloque.duracion) await iniciarContador(bloque.duracion, "Realiza el ejercicio...", localAbort);
        if (bloque.tipo === "cierre") finalizarSesion();
        else nextBtn.style.display = "inline-block";
    }
}

function finalizarSesion() {
    block.innerHTML = "<h2>Sesión Completada</h2><p>Felicidades. Has invertido en tu éxito hoy. Vuelve mañana para continuar tu ascenso.</p>";
    userData.sessionId = userData.sessionId < 21 ? userData.sessionId + 1 : 1;
    userData.step = 0;
    guardarProgreso();
    
    nextBtn.style.display = "inline-block";
    restartBtn.style.display = "inline-block";
}

function guardarProgreso() {
    localStorage.setItem("maykamiData", JSON.stringify(userData));
    const dBar = document.getElementById("disciplina-bar");
    if (dBar) dBar.style.width = userData.disciplina + "%";
}

function limpiarEstado() {
    abortController.abort = true;
    abortController = { abort: false };
    window.speechSynthesis.cancel();
    isPaused = false;
    if (pauseBtn) pauseBtn.innerText = "⏸️ Pausar";
}

/* ==================== INTERFAZ Y GALERIA (30 PAISAJES) ==================== */
function initGallery() {
    gallery.innerHTML = "";
    for (let i = 0; i < 30; i++) {
        const div = document.createElement("div");
        div.className = "slide";
        div.style.backgroundImage = `url(https://picsum.photos/1920/1080?nature&sig=${i + (userData.sessionId * 40)})`;
        gallery.appendChild(div);
    }
    const slides = document.querySelectorAll(".slide");
    if (slides.length > 0) slides[0].classList.add("active");
    
    setInterval(() => {
        if (!isPaused) {
            slides[slideIndex].classList.remove("active");
            slideIndex = (slideIndex + 1) % slides.length;
            slides[slideIndex].classList.add("active");
        }
    }, 8000);
}

/* ==================== EVENTOS DE BOTONES ==================== */
startBtn.onclick = async () => {
    startBtn.style.display = "none";
    if (audio) { audio.volume = 0.03; audio.play(); } 
    initGallery();
    await cargarSesion();

    // Bienvenida Motivadora inicial
    const saludo = obtenerBienvenida(userData.sessionId);
    await escribirTextoYHablar(saludo, abortController);
    await new Promise(r => setTimeout(r, 2000)); 

    mostrarBloque();
};

if (pauseBtn) {
    pauseBtn.onclick = () => {
        isPaused = !isPaused;
        if (isPaused) {
            window.speechSynthesis.pause();
            pauseBtn.innerText = "▶️ Reanudar";
        } else {
            window.speechSynthesis.resume();
            pauseBtn.innerText = "⏸️ Pausar";
        }
    };
}

nextBtn.onclick = () => {
    if (sesionActualData.bloques[userData.step]?.tipo === "cierre") {
        cargarSesion().then(() => mostrarBloque());
    } else {
        userData.step++;
        guardarProgreso();
        mostrarBloque();
    }
};

backBtn.onclick = () => {
    if (userData.step > 0) {
        userData.step--;
        guardarProgreso();
        mostrarBloque();
    }
};

restartBtn.onclick = () => {
    userData.step = 0;
    guardarProgreso();
    mostrarBloque();
};

guardarProgreso();
