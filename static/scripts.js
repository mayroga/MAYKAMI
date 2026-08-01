/* ================= PARTE 1 DE 2: ESTRUCTURA DE CONTROL Y SEGURIDAD NATIVA ================= */

const gallery = document.getElementById("visual-gallery");
const circle = document.getElementById("visual-circle");
const block = document.getElementById("block");
const startBtn = document.getElementById("start-btn");
const nextBtn = document.getElementById("next-btn");
const backBtn = document.getElementById("back-btn");
const restartBtn = document.getElementById("restart-btn");
const langBtn = document.getElementById("lang-btn");
const disclaimerText = document.getElementById("disclaimer-text");

const urlParams = new URLSearchParams(window.location.search);
const isAdmin = urlParams.get('auth') === 'admin';
const isOpenThanGo = urlParams.get('auth') === 'openthango';

let currentLang = "ESP"; 
let slideIndex = 0;

const translations = {
    "Listo para iniciar sesión": "Ready to start session",
    "SISTEMA DESBLOQUEADO (ADMIN)": "SYSTEM UNLOCKED (ADMIN)",
    "SISTEMA DESBLOQUEADO (OPEN THAN GO)": "SYSTEM UNLOCKED (OPEN THAN GO)",
    "ACCESO DENEGADO. Inicie sesión desde Open Than Go o contacte al desarrollador.": "ACCESS DENIED. Please log in via Open Than Go or contact the developer.",
    "Sesión completada exitosamente. Hasta mañana.": "Session successfully completed. See you tomorrow.",
    "Correcto. ": "Correct. ",
    "Incorrecto. ": "Incorrect. ",
    "Inhala": "Inhale",
    "Retén": "Hold",
    "Exhala": "Exhale",
    "Iniciar": "Start",
    "Atrás": "Back",
    "Siguiente": "Next",
    "Reiniciar": "Restart"
};

function translateText(text) {
    if (currentLang === "ESP") return text;
    let t = text;
    t = t.replace(/inhala|respira de forma profunda/ig, "inhale deeply");
    t = t.replace(/retén el aire|retiene|mantén/ig, "hold your breath");
    t = t.replace(/exhala|suelta el aire lentamente/ig, "exhale slowly");
    t = t.replace(/segundos|seg|s/ig, "seconds");
    t = t.replace(/bloque de decisión|selecciona una opción/ig, "decision block, choose an option");
    return t;
}

async function checkAccess() {
    // Retorna el flujo a tus condiciones lógicas originales
    if (isAdmin || isOpenThanGo || isDoubleTapUnlocked) {
        try {
            const res = await fetch("/validate-access", { method: "POST" });
            if (!res.ok) {
                const data = await res.json();
                block.innerHTML = data.error || "Cupos agotados.";
                return false;
            }
        } catch (e) {
            console.error("Error validando cupos:", e);
        }

        localStorage.setItem("maykami_verified", "true");
        block.innerHTML = isAdmin ? "SISTEMA DESBLOQUEADO (ADMIN)" : "SISTEMA DESBLOQUEADO (OPEN THAN GO)";
        if (currentLang === "ENG") {
            block.innerHTML = translations[block.innerHTML] || block.innerHTML;
        }
        startBtn.style.display = "inline-block";
        return true;
    }
    
    if (localStorage.getItem("maykami_verified") === "true") {
        startBtn.style.display = "inline-block";
        block.innerHTML = currentLang === "ESP" ? "Sesión activa previamente validada." : "Active session previously verified.";
        return true;
    }

    block.innerHTML = currentLang === "ESP" ? 
        "ACCESO DENEGADO. Inicie sesión desde Open Than Go o contacte al desarrollador." : 
        "ACCESS DENIED. Please log in via Open Than Go or contact the developer.";
    startBtn.style.display = "none";
    return false;
}
/* ================= PARTE 2 DE 2: MOTOR DE EJERCICIOS Y SINCRONIZACIÓN BIOMÉDICA ================= */

/* ================= AUDIO BACKGROUND ================= */
const bgMusic = new Audio("https://soundhelix.com");
bgMusic.loop = true;
bgMusic.volume = 0.03;
function playMusic() {
    bgMusic.play().catch(() => {
        document.body.addEventListener("click", () => { bgMusic.play(); }, { once: true });
    });
}

/* ================= ENGINE CORE ================= */
let engine = { locked: false, abort: false, timers: new Set(), breathLoop: null, session: null };
let userData = JSON.parse(localStorage.getItem("maykamiData")) || { sessionId: 1, step: 0, disciplina: 40 };

function safeTimeout(fn, t) {
    const id = setTimeout(() => { engine.timers.delete(id); fn(); }, t);
    engine.timers.add(id);
}

function resetEngine() {
    engine.abort = true;
    window.speechSynthesis.cancel();
    engine.timers.forEach(t => clearTimeout(t));
    engine.timers.clear();
    clearInterval(engine.breathLoop);
    circle.className = "";
    circle.textContent = "MAYKAMI";
}

function speak(text) {
    return new Promise(resolve => {
        window.speechSynthesis.cancel();
        const cleanText = text.replace(/<[^>]*>/g, "");
        const translatedSpeech = translateText(cleanText);
        const utter = new SpeechSynthesisUtterance(translatedSpeech);
        
        utter.lang = currentLang === "ESP" ? "es-ES" : "en-US";
        utter.rate = currentLang === "ESP" ? 0.88 : 0.82;
        utter.pitch = 0.95;
        
        // El círculo arranca en perfecto orden al mismo tiempo que la voz empieza a hablar
        utter.onstart = () => {
            const sec = extractSeconds(cleanText);
            const hold = cleanText.toLowerCase().includes("retén") || cleanText.toLowerCase().includes("retiene");
            if (/respira|inhala|exhala|breath|inhale|exhale/i.test(cleanText)) {
                startBreathing(sec || 8, hold);
            }
        };
        
        utter.onend = resolve;
        utter.onerror = resolve;
        window.speechSynthesis.speak(utter);
    });
}

function extractSeconds(text) {
    const match = text.match(/(\d{1,3})\s*(segundos|seg|s|seconds|sec)/i);
    return match ? parseInt(match) : null;
}

/* ================= RITMO BIOMÉDICO CONTROLADO (PULMÓN REAL) ================= */
function startBreathing(seconds = null, forceHold = false) {
    clearInterval(engine.breathLoop);
    
    // Tiempos fijos que imitan un pulmón adulto real en relajación para evitar hiperventilación
    const inhalePeriod = 2500; 
    const holdPeriod = forceHold ? 1500 : 0;
    const exhalePeriod = 2500;

    const start = Date.now();
    const duration = seconds ? seconds * 1000 : Infinity;

    function loop() {
        if (engine.abort || (Date.now() - start >= duration)) {
            circle.className = "";
            circle.textContent = "MAYKAMI";
            return;
        }

        circle.className = "inhale";
        circle.textContent = currentLang === "ESP" ? "Inhala" : "Inhale";
        
        safeTimeout(() => {
            if (engine.abort) return;
            if (forceHold) {
                circle.className = "hold";
                circle.textContent = currentLang === "ESP" ? "Retén" : "Hold";
            }
            
            safeTimeout(() => {
                if (engine.abort) return;
                circle.className = "exhale";
                circle.textContent = currentLang === "ESP" ? "Exhala" : "Exhale";
                
                safeTimeout(loop, exhalePeriod);
            }, holdPeriod);
        }, inhalePeriod);
    }
    loop();
}

async function typeText(text) {
    block.innerHTML = "";
    const processedText = translateText(text);
    for (let i = 0; i < processedText.length; i++) {
        if (engine.abort) return;
        block.innerHTML += processedText[i];
        await new Promise(r => safeTimeout(r, 12));
    }
}

/* ================= EJECUCIÓN PASO A PASO ================= */
async function loadSession() {
    try {
        const res = await fetch("/tvid_ejercicio.json");
        const data = await res.json();
        const diaAnio = Math.floor((new Date() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
        const idHoy = (diaAnio % 21) + 1;
        engine.session = data.sesiones.find(s => s.id === idHoy) || data.sesiones;
    } catch (e) { console.error("Error JSON:", e); }
}

async function runStep() {
    if (engine.locked) return;
    engine.locked = true;
    resetEngine();
    engine.abort = false;
    
    const step = engine.session?.bloques?.[userData.step];
    if (!step) { finish(); return; }
    
    nextBtn.style.display = "inline-block";
    restartBtn.style.display = "inline-block";
    backBtn.style.display = "inline-block";

    // ORDEN REQUERIDO: 1° Letras impresas, 2° Entra la voz junto con la animación del círculo
    if (step.textos?.length) {
        for (const t of step.textos) {
            if (engine.abort) break;
            await typeText(t);
            await speak(t);
            await new Promise(r => safeTimeout(r, 800));
        }
    } else if (step.tipo === "decision") {
        const preguntaOriginal = step.pregunta;
        await typeText(preguntaOriginal);
        await speak(preguntaOriginal);
        
        const box = document.createElement("div");
        box.className = "decision-box";
        step.opciones.forEach((opt, i) => {
            const btn = document.createElement("button");
            btn.className = "opt-btn";
            btn.textContent = translateText(opt);
            btn.onclick = async () => {
                const ok = i === step.correcta;
                const msg = (ok ? translations["Correcto. "] : translations["Incorrecto. "]) + step.explicacion;
                await typeText(msg);
                await speak(msg);
                if (ok) userData.disciplina += 5;
                save();
            };
            box.appendChild(btn);
        });
        block.appendChild(box);
    } else if (step.texto) {
        await typeText(step.texto);
        await speak(step.texto);
    }
    engine.locked = false;
}

function finish() {
    const endMsg = translations["Sesión completada exitosamente. Hasta mañana."];
    block.innerHTML = currentLang === "ESP" ? endMsg : translations[endMsg];
    userData.step = 0;
    save();
    engine.locked = false;
}

function save() { 
    localStorage.setItem("maykamiData", JSON.stringify(userData)); 
}

/* ================= CAMBIO DE IDIOMA POR SOFTWARE ================= */
langBtn.onclick = () => {
    if (currentLang === "ESP") {
        currentLang = "ENG";
        langBtn.textContent = "ESP";
        if (disclaimerText) disclaimerText.innerHTML = "DISCLAIMER: This system is a general wellness tool. Guided breathing exercises follow standard physiological relaxation rhythms but do not substitute professional medical advice, diagnosis, or treatment. Discontinue immediately if you experience dizziness.";
    } else {
        currentLang = "ESP";
        langBtn.textContent = "ENG";
        if (disclaimerText) disclaimerText.innerHTML = "AVISO: Este sistema es una herramienta de bienestar general. Los ejercicios de respiración guían ritmos fisiológicos estándar de relajación, pero no sustituyen tratamientos, diagnósticos ni consejos médicos profesionales. Suspenda su uso ante cualquier mareo.";
    }
    
    startBtn.textContent = currentLang === "ESP" ? "Iniciar" : "Start";
    backBtn.textContent = currentLang === "ESP" ? "Atrás" : "Back";
    nextBtn.textContent = currentLang === "ESP" ? "Siguiente" : "Next";
    restartBtn.textContent = currentLang === "ESP" ? "Reiniciar" : "Restart";
    
    if(startBtn.style.display !== "none" && userData.step === 0) {
        block.innerHTML = isAdmin ? (currentLang === "ESP" ? "SISTEMA DESBLOQUEADO (ADMIN)" : "SYSTEM UNLOCKED (ADMIN)") : (currentLang === "ESP" ? "SISTEMA DESBLOQUEADO (OPEN THAN GO)" : "SYSTEM UNLOCKED (OPEN THAN GO)");
    }
};

/* ================= UI & GALERÍA VISUAL NATIVA ================= */
function initGallery() {
    gallery.innerHTML = "";
    for (let i = 0; i < 20; i++) {
        const div = document.createElement("div");
        div.className = "slide";
        div.style.backgroundImage = `linear-gradient(rgba(255,255,255,0.18), rgba(255,255,255,0.18)), url(https://picsum.photos{i})`;
        div.style.backgroundSize = "cover";
        div.style.backgroundPosition = "center";
        div.style.filter = "brightness(1.18) contrast(1.08) saturate(1.1)";
        gallery.appendChild(div);
    }
    
    const firstSlide = gallery.querySelector(".slide");
    if (firstSlide) {
        firstSlide.classList.add("active");
    }

    setInterval(() => {
        const all = document.querySelectorAll(".slide");
        if (all.length === 0) return;
        all.forEach(s => s.classList.remove("active"));
        slideIndex = (slideIndex + 1) % all.length;
        if (all[slideIndex]) {
            all[slideIndex].classList.add("active");
        }
    }, 7000);
}

/* ================= EVENTOS DE BOTONES ================= */
startBtn.onclick = async () => {
    startBtn.style.display = "none";
    playMusic();
    userData.step = 0;
    initGallery();
    await loadSession();
    runStep();
};

nextBtn.onclick = () => { userData.step++; save(); runStep(); };
backBtn.onclick = () => { if (userData.step > 0) userData.step--; save(); runStep(); };
restartBtn.onclick = () => { userData.step = 0; save(); runStep(); };

checkAccess();
save();
