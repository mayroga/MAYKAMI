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

/* ==================== VARIABLES ==================== */
let sesiones = [];
let currentBloque = 0;
let currentSesion = 0;
let breathingInterval = null;

/* ==================== GALERIA VISUAL ==================== */
for (let i = 0; i < 20; i++) {
  const div = document.createElement("div");
  div.className = "slide";
  div.style.backgroundImage = `url(https://picsum.photos/1920/1080?nature&sig=${i})`;
  gallery.appendChild(div);
}
let slides = document.querySelectorAll(".slide");
let slideIndex = 0;
let slideInterval = null;

function cambiarSlide() {
  slides.forEach(s => s.classList.remove("active"));
  slides[slideIndex].classList.add("active");
  slideIndex = (slideIndex + 1) % slides.length;
}

/* ==================== RESPIRACION CENTRAL ==================== */
function activarVisual(tipo = "inhala") {
  circle.style.display = "flex";
  circle.classList.remove("inhale", "exhale", "hold");
  if (tipo === "inhala") circle.innerText = "Inhala", circle.classList.add("inhale");
  if (tipo === "exhala") circle.innerText = "Exhala", circle.classList.add("exhale");
  if (tipo === "hold") circle.innerText = "Retén", circle.classList.add("hold");

  slides[0].classList.add("active");
  if (!slideInterval) slideInterval = setInterval(cambiarSlide, 6000);
  audio.volume = 0.25;
  audio.play();
}

function pararVisual() {
  circle.style.display = "none";
  audio.pause();
  if (slideInterval) { clearInterval(slideInterval); slideInterval = null; }
}

/* ==================== DETECTOR RESPIRACION ==================== */
function detectarRespiracion(texto) {
  texto = texto.toLowerCase();
  const palabrasClave = ["respira","inhala","exhala","lento","calma","silencio","concéntrate","observa","siente","mantente"];
  return palabrasClave.some(p => texto.includes(p));
}

/* ==================== VOZ ==================== */
function voz() {
  return speechSynthesis.getVoices().find(v => v.lang.startsWith("es")) || speechSynthesis.getVoices()[0];
}

function hablar(texto, lento=false) {
  return new Promise(r => {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(texto.replace(/<[^>]*>/g,""));
    u.lang = "es-ES";
    u.voice = voz();
    u.rate = lento ? 0.8 : 0.9;
    u.onend = r;
    speechSynthesis.speak(u);
  });
}

/* ==================== ESCRIBIR TEXTO ==================== */
async function escribir(texto, color="#fff", forzarVisual=false, tiempoLectura=2000) {
  block.innerHTML = "";
  const div = document.createElement("div");
  div.style.fontSize = "26px";
  div.style.color = color;
  div.style.textAlign = "center";
  block.appendChild(div);

  if (detectarRespiracion(texto) || forzarVisual) activarVisual("inhala");
  else pararVisual();

  await hablar(texto,true);
  for (let i=0;i<texto.length;i++) {
    div.innerHTML += texto[i];
    await new Promise(r=>setTimeout(r,20));
  }
  await new Promise(r=>setTimeout(r, tiempoLectura));
}

/* ==================== RESPIRACION CON CONTADOR ==================== */
async function respirar(texto, duracion) {
  activarVisual("inhala");
  await hablar(texto,true);

  for (let i = duracion; i > 0; i--) {
    block.innerHTML = `<div>${texto}</div><div style="margin-top:10px;font-size:22px">${i}s</div>`;
    await new Promise(r => setTimeout(r,1000));
  }

  pararVisual();
}

/* ==================== MOSTRAR BLOQUE ==================== */
async function mostrarBloque(b) {
  switch(b.tipo) {
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
      for (let t of b.textos) await escribir(t,b.color,true,3000);
      if (b.duracion) await respirar("Respira y asimila",b.duracion);
      pararVisual();
      break;

    case "cierre":
      await escribir(b.texto, "#fff", true,4000);
      restartBtn.style.display = "block";
      break;
  }
}

/* ==================== SESIONES ==================== */
async function cargarSesiones() {
  try {
    const r = await fetch("/tvid_ejercicio.json");
    const d = await r.json();
    sesiones = d.sesiones || [];
    currentSesion = Math.floor(Math.random()*sesiones.length);
  } catch(e) {
    block.innerText="Error cargando sesiones";
    sesiones=[{tipo:"voz",texto:"Iniciando MayKaMi..."}];
  }
}

/* ==================== CONTROL ==================== */
async function mostrarActual() {
  if (!sesiones.length) return;
  await mostrarBloque(sesiones[currentSesion].bloques[currentBloque]);
}

/* ==================== BOTONES ==================== */
startBtn.onclick = async () => {
  await cargarSesiones();
  startBtn.style.display = "none";
  currentBloque = 0;
  mostrarActual();
};

nextBtn.onclick = async () => {
  if (currentBloque < sesiones[currentSesion].bloques.length-1) {
    currentBloque++;
    mostrarActual();
  }
};

backBtn.onclick = async () => {
  if (currentBloque>0) {
    currentBloque--;
    mostrarActual();
  }
};

restartBtn.onclick = () => {
  currentBloque=0;
  mostrarActual();
};

/* ==================== PANEL SEMITRANSPARENTE ==================== */
const panel = document.getElementById("mental-panel");
panel.style.backgroundColor="rgba(0,8,20,0.7)";
panel.style.position="fixed";
panel.style.top="10px";
panel.style.left="10px";
panel.style.right="10px";
panel.style.zIndex="20";
panel.style.padding="12px";
panel.style.borderRadius="12px";

[startBtn,nextBtn,backBtn,restartBtn].forEach(b=>{
  b.style.position="fixed";
  b.style.zIndex="21";
  b.style.opacity="0.85";
});

startBtn.style.bottom="20px"; startBtn.style.left="10px"; startBtn.style.width="calc(50% - 15px)";
nextBtn.style.bottom="20px"; nextBtn.style.right="10px"; nextBtn.style.width="calc(50% - 15px)";
backBtn.style.bottom="70px"; backBtn.style.left="10px"; backBtn.style.width="calc(50% - 15px)";
restartBtn.style.bottom="70px"; restartBtn.style.right="10px"; restartBtn.style.width="calc(50% - 15px)";

/* ==================== INICIALIZACION ==================== */
if(panel) panel.style.display="block";
updatePanel();

/* ==================== PANEL DINAMICO ==================== */
function updatePanel() {
  discBar.style.width="50%";
  clarBar.style.width="50%";
  calmaBar.style.width="50%";
}
