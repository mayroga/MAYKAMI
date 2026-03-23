/* ==================== ELEMENTOS ==================== */
const startBtn = document.getElementById("start-btn");
const nextBtn = document.getElementById("next-btn");
const backBtn = document.getElementById("back-btn");
const restartBtn = document.getElementById("restart-btn");
const block = document.getElementById("block");

const discBar = document.getElementById("disciplina-bar");
const clarBar = document.getElementById("claridad-bar");
const calmaBar = document.getElementById("calma-bar");

const gallery = document.getElementById("visual-gallery");
const circle = document.getElementById("visual-circle");
const audio = document.getElementById("nature-audio");

let slides = [];
let slideIndex = 0;
let slideInterval = null;

/* ==================== CREAR GALERIA ==================== */
for (let i = 0; i < 20; i++) {
    const div = document.createElement("div");
    div.className = "slide";
    div.style.backgroundImage = `url(https://picsum.photos/1920/1080?nature&sig=${i})`;
    gallery.appendChild(div);
}
slides = document.querySelectorAll(".slide");

function cambiarSlide() {
    slides[slideIndex].classList.remove("active");
    slideIndex = (slideIndex + 1) % slides.length;
    slides[slideIndex].classList.add("active");
}

/* ==================== VISUAL RESPIRACION ==================== */
function activarVisual(tipo="inhala"){
    circle.style.display = "flex";
    circle.classList.remove("inhale","exhale","hold");
    if(tipo==="inhala"){ circle.innerText="Inhala"; circle.classList.add("inhale"); }
    if(tipo==="exhala"){ circle.innerText="Exhala"; circle.classList.add("exhale"); }
    if(tipo==="hold"){ circle.innerText="Retén"; circle.classList.add("hold"); }

    if(!slideInterval) slideInterval = setInterval(cambiarSlide,6000);
    audio.volume=0.25; audio.play();
}

function pararVisual(){
    circle.style.display="none";
    if(slideInterval){ clearInterval(slideInterval); slideInterval=null; }
}

/* ==================== PANEL INICIAL Y FINAL ==================== */
function mostrarPanelTemporizado(segundos){
    document.getElementById("app").style.opacity = 1;
    startBtn.style.display="block";
    nextBtn.style.display="none";
    backBtn.style.display="none";
    restartBtn.style.display="none";

    setTimeout(()=>{ 
        document.getElementById("app").style.opacity = 0;
        startBtn.style.display="none";
    },segundos*1000);
}

/* ==================== PANEL DE ESTADISTICAS ==================== */
function updatePanel(disc=50,clar=50,calma=40){
    discBar.style.width = disc+"%";
    clarBar.style.width = clar+"%";
    calmaBar.style.width = calma+"%";
}

/* ==================== VOZ ==================== */
function voz(){ return speechSynthesis.getVoices().find(v=>v.lang.startsWith("es")); }

function hablar(texto,lento=false){
    return new Promise(r=>{
        speechSynthesis.cancel();
        const u=new SpeechSynthesisUtterance(texto);
        u.lang="es-ES";
        u.voice=voz();
        u.rate=lento?0.8:0.9;
        u.onend=r;
        speechSynthesis.speak(u);
    });
}

/* ==================== DETECTOR RESPIRACION ==================== */
function detectarRespiracion(texto){
    texto=texto.toLowerCase();
    return ["respira","inhala","exhala","lento","calma","silencio","concéntrate","observa","siente","mantente"].some(p=>texto.includes(p));
}

/* ==================== ESCRIBIR TEXTO ==================== */
async function escribir(texto,color="#fff",forzarVisual=false){
    block.innerHTML="";
    const div=document.createElement("div");
    div.style.fontSize="26px";
    div.style.color=color;
    block.appendChild(div);

    if(detectarRespiracion(texto)||forzarVisual) activarVisual("inhala");

    await hablar(texto,true);

    for(let i=0;i<texto.length;i++){
        div.innerHTML+=texto[i];
        await new Promise(r=>setTimeout(r,20));
    }

    await new Promise(r=>setTimeout(r,1500)); // mantiene lectura
}

/* ==================== RESPIRACION CON CONTADOR ==================== */
async function respirar(texto,duracion){
    activarVisual("inhala");
    for(let i=duracion;i>0;i--){
        block.innerHTML=texto+"<br><span style='font-size:28px;'>"+i+"</span>";
        await new Promise(r=>setTimeout(r,1000));
    }
    pararVisual();
}

/* ==================== SESIONES ==================== */
let sesiones=[]; let currentBloque=0; let currentSesion=0;

async function cargarSesiones(){
    const r = await fetch("/tvid_ejercicio.json");
    const d = await r.json();
    sesiones = d.sesiones;
    currentSesion = Math.floor(Math.random() * sesiones.length);
}

/* ==================== MOSTRAR BLOQUE ==================== */
async function mostrarBloque(b){
    nextBtn.disabled=true; backBtn.disabled=true;

    switch(b.tipo){
        case "voz":
        case "tvid":
        case "historia":
            await escribir(b.texto,b.color);
            break;
        case "respiracion":
            await respirar(b.texto,b.duracion);
            break;
        case "tvid_ejercicio_largo":
            activarVisual("inhala");
            for(let t of b.textos) await escribir(t,b.color,true);
            if(b.duracion) await respirar("Respira",b.duracion);
            pararVisual();
            break;
        case "cierre":
            await escribir(b.texto);
            restartBtn.style.display="block";
            mostrarPanelTemporizado(10); // final
            break;
    }

    nextBtn.disabled=false; backBtn.disabled=false;
}

/* ==================== CONTROL ==================== */
async function mostrarActual(){
    if(currentBloque<0) currentBloque=0;
    if(currentBloque>=sesiones[currentSesion].bloques.length) currentBloque=sesiones[currentSesion].bloques.length-1;
    await mostrarBloque(sesiones[currentSesion].bloques[currentBloque]);
}

/* ==================== BOTONES ==================== */
startBtn.onclick=async()=>{
    await cargarSesiones();
    mostrarPanelTemporizado(5); // panel inicial 5s
    currentBloque=0;
    mostrarActual();
    nextBtn.style.display="block";
};

nextBtn.onclick=()=>{
    currentBloque++;
    mostrarActual();
    nextBtn.style.display="none"; // aparece solo cuando se necesite
};

backBtn.onclick=()=>{
    if(currentBloque>0){
        currentBloque--;
        mostrarActual();
        backBtn.style.display="none"; // solo aparece cuando se necesite
    } else {
        alert("No puedes retroceder más. Se aplicará penalidad.");
    }
};

restartBtn.onclick=()=>{
    currentBloque=0;
    mostrarActual();
};

updatePanel();
