const startBtn = document.getElementById("start-btn");
const nextBtn = document.getElementById("next-btn");
const backBtn = document.getElementById("back-btn");
const restartBtn = document.getElementById("restart-btn");

const block = document.getElementById("block");

const circle = document.getElementById("breath-circle");

const timerEl = document.getElementById("timer");

const sessionLabel =
document.getElementById("session-label");

const disciplinaBar =
document.getElementById("disciplina");

const claridadBar =
document.getElementById("claridad");

const calmaBar =
document.getElementById("calma");


let sesiones = [];
let bloques = [];

let current = 0;

let tiempo = 0;

let disciplina = 50;
let claridad = 50;
let calma = 50;


let lastSessionId =
parseInt(
localStorage.getItem("lastSessionId")
) || 0;



/* ================= COLORES ================= */

const colors = [
"#020617",
"#0f172a",
"#111827",
"#1e293b",
"#000000"
];

function changeColor(){

const c =
colors[
Math.floor(
Math.random()*colors.length
)
];

document.body.style.background = c;

}



/* ================= TIMER ================= */

function startTimer(){

setInterval(()=>{

tiempo++;

let m =
String(
Math.floor(tiempo/60)
).padStart(2,"0");

let s =
String(
tiempo%60
).padStart(2,"0");

timerEl.innerText =
m+":"+s;

},1000);

}



/* ================= STATS ================= */

function updateStats(){

disciplinaBar.style.width =
disciplina+"%";

claridadBar.style.width =
claridad+"%";

calmaBar.style.width =
calma+"%";

}



/* ================= VOZ ================= */

function playVoice(text){

return new Promise(r=>{

speechSynthesis.cancel();

const msg =
new SpeechSynthesisUtterance(text);

msg.lang="es-ES";

msg.rate=0.9;

msg.onend=()=>r();

speechSynthesis.speak(msg);

});

}



/* ================= PAUSA ================= */

function wait(ms){
return new Promise(r=>setTimeout(r,ms));
}



/* ================= CARGAR ================= */

async function loadSession(){

sessionLabel.innerText =
"Nueva sesión";

changeColor();

await wait(800);

const res =
await fetch(
`/tvid_ejercicio.json?last_id=${lastSessionId}`
);

const data =
await res.json();

sesiones =
data.sesiones || [];

if(!sesiones.length)
return;

bloques =
sesiones[0].bloques;

lastSessionId =
sesiones[0].id;

localStorage.setItem(
"lastSessionId",
lastSessionId
);

current = 0;

}



/* ================= RESPIRACION ================= */

async function breathing(b){

changeColor();

block.innerHTML="";

circle.style.display="block";

const dur =
b.duracion || 4;

const text =
b.texto || "Respira";


block.innerText = text;

await playVoice(text);


circle.style.transform =
"scale(2.5)";

await wait(dur*1000);


circle.style.transform =
"scale(1)";

await wait(dur*1000);


disciplina+=2;
calma+=3;

updateStats();

nextBtn.style.display="block";

}



/* ================= QUIZ ================= */

async function quiz(b){

changeColor();

circle.style.display="none";

block.innerHTML="";

const p =
document.createElement("p");

p.innerText =
b.pregunta;

block.appendChild(p);

await playVoice(b.pregunta);


b.opciones.forEach((op,i)=>{

const btn =
document.createElement("button");

btn.innerText=op;

btn.onclick=async()=>{

block.innerHTML="";

const correct =
i===b.correcta;

const h =
document.createElement("h2");

h.innerText=
correct
? "✔ CORRECTO"
: "✘ INCORRECTO";

block.appendChild(h);

await playVoice(
correct
? "Correcto"
: "Incorrecto"
);

await wait(400);

const exp =
document.createElement("p");

exp.innerText =
b.explicacion;

block.appendChild(exp);

await playVoice(
b.explicacion
);


if(correct){

block.innerHTML +=
"<p>Tu mente respondió bien</p>";

disciplina+=5;
claridad+=3;

}else{

block.innerHTML +=
"<p>Tu mente dudó</p>";

disciplina-=5;
claridad-=2;

}


updateStats();

nextBtn.style.display="block";

};

block.appendChild(btn);

});

}



/* ================= TEXTO ================= */

async function textBlock(b){

changeColor();

circle.style.display="none";

block.innerText =
b.texto;

await playVoice(
b.texto
);

nextBtn.style.display="block";

}



/* ================= BLOQUE ================= */

async function showBlock(b){

nextBtn.style.display="none";

if(!b) return;

if(b.tipo==="respiracion"){

await breathing(b);
return;

}

if(
b.tipo==="quiz"
|| b.tipo==="acertijo"
|| b.tipo==="decision"
){

await quiz(b);
return;

}

await textBlock(b);

}



/* ================= START ================= */

startBtn.onclick = async()=>{

startBtn.style.display="none";

startTimer();

await loadSession();

showBlock(
bloques[current]
);

};



/* ================= NEXT ================= */

nextBtn.onclick=()=>{

current++;

if(current<bloques.length){

showBlock(
bloques[current]
);

}else{

loadSession();

}

};



/* ================= BACK ================= */

backBtn.onclick=()=>{

if(current>0){

current--;

disciplina*=0.2;
claridad*=0.6;
calma*=0.2;

updateStats();

showBlock(
bloques[current]
);

}

};



/* ================= RESET ================= */

restartBtn.onclick=()=>{

localStorage.removeItem(
"lastSessionId"
);

location.reload();

};
