const startBtn = document.getElementById("start-btn");
const nextBtn = document.getElementById("next-btn");
const backBtn = document.getElementById("back-btn");
const restartBtn = document.getElementById("restart-btn");
const block = document.getElementById("block");

let sesiones = [];
let bloques = [];
let current = 0;

let lastSessionId =
    parseInt(localStorage.getItem("lastSessionId")) || 0;


/* ================= COLORES AUTOMATICOS ================= */

const colors = [
    "#0f172a",
    "#020617",
    "#111827",
    "#1e293b",
    "#0b132b",
    "#020617",
    "#1a1a2e",
    "#0a0f1f"
];

function changeColor() {

    const c =
        colors[
            Math.floor(
                Math.random() * colors.length
            )
        ];

    document.body.style.background = c;
}


/* ================= VOZ ================= */

function playVoice(text, soft=false) {

    return new Promise(resolve => {

        speechSynthesis.cancel();

        const msg =
            new SpeechSynthesisUtterance(text);

        msg.lang = "es-ES";

        if (soft) {

            msg.rate = 0.75;
            msg.pitch = 0.9;

        } else {

            msg.rate = 0.9;
            msg.pitch = 1;
        }

        msg.onend = () => resolve();

        speechSynthesis.speak(msg);

    });

}


/* ================= CARGAR SESION ================= */

async function loadSession() {

    const res =
        await fetch(
            `/tvid_ejercicio.json?last_id=${lastSessionId}`
        );

    const data = await res.json();

    sesiones = data.sesiones || [];

    if (sesiones.length === 0) return;

    bloques = sesiones[0].bloques;

    lastSessionId = sesiones[0].id;

    localStorage.setItem(
        "lastSessionId",
        lastSessionId
    );

    current = 0;
}


/* ================= RESPIRACION ================= */

async function breathing(b) {

    changeColor();

    block.innerHTML = "";

    const text = b.texto || "Respira";

    const dur = b.duracion || 4;

    const circle = document.createElement("div");

    circle.style.width = "120px";
    circle.style.height = "120px";
    circle.style.borderRadius = "50%";
    circle.style.background = "#00bfff";
    circle.style.margin = "40px auto";
    circle.style.transition =
        `transform ${dur}s linear`;

    block.appendChild(circle);

    const p = document.createElement("p");

    p.innerText = text;

    block.appendChild(p);

    await playVoice(text, true);

    circle.style.transform = "scale(2.5)";

    await new Promise(
        r => setTimeout(r, dur * 1000)
    );

    circle.style.transform = "scale(1)";

    await new Promise(
        r => setTimeout(r, dur * 1000)
    );

    nextBtn.style.display = "inline-block";
}


/* ================= QUIZ ================= */

async function quiz(b) {

    changeColor();

    block.innerHTML = "";

    const q = document.createElement("p");

    q.innerText = b.pregunta;

    block.appendChild(q);

    await playVoice(b.pregunta);

    b.opciones.forEach((op, i) => {

        const btn =
            document.createElement("button");

        btn.innerText = op;

        btn.onclick = async () => {

            const correct =
                i === b.correcta;

            const result =
                correct
                ? "CORRECTO"
                : "INCORRECTO";

            block.innerHTML +=
                `<h2>${result}</h2>`;

            await playVoice(result);

            if (b.explicacion) {

                block.innerHTML +=
                    `<p>${b.explicacion}</p>`;

                await playVoice(
                    b.explicacion,
                    true
                );
            }

            nextBtn.style.display =
                "inline-block";
        };

        block.appendChild(btn);
    });

}


/* ================= TVID LARGO ================= */

async function tvidLargo(b) {

    changeColor();

    block.innerHTML = "";

    const textos = b.textos || [];

    for (let t of textos) {

        const p =
            document.createElement("p");

        p.innerText = t;

        block.appendChild(p);

        await playVoice(t, true);
    }

    nextBtn.style.display =
        "inline-block";
}


/* ================= BLOQUE ================= */

async function showBlock(b) {

    nextBtn.style.display = "none";

    changeColor();

    if (b.tipo === "respiracion") {

        await breathing(b);
        return;
    }

    if (
        b.tipo === "quiz"
        || b.tipo === "acertijo"
        || b.tipo === "decision"
    ) {

        await quiz(b);
        return;
    }

    if (
        b.tipo ===
        "tvid_ejercicio_largo"
    ) {

        await tvidLargo(b);
        return;
    }

    block.innerHTML = "";

    const p =
        document.createElement("p");

    p.innerText = b.texto || "";

    block.appendChild(p);

    await playVoice(b.texto);

    nextBtn.style.display =
        "inline-block";
}


/* ================= START ================= */

startBtn.onclick = async () => {

    startBtn.style.display = "none";

    await loadSession();

    showBlock(bloques[current]);
};


/* ================= NEXT ================= */

nextBtn.onclick = async () => {

    current++;

    if (current < bloques.length) {

        showBlock(
            bloques[current]
        );

    } else {

        await loadSession();

        showBlock(
            bloques[current]
        );
    }

};


/* ================= BACK ================= */

backBtn.onclick = () => {

    if (current > 0) {

        current--;

        showBlock(
            bloques[current]
        );
    }

};


/* ================= RESET ================= */

restartBtn.onclick = () => {

    localStorage.removeItem(
        "lastSessionId"
    );

    location.reload();

};
