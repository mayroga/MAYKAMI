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


/* ================= COLORES FUERTES ================= */

const colors = [
    "#020617",
    "#0f172a",
    "#111827",
    "#1e293b",
    "#0b132b",
    "#020617",
    "#1a1a2e",
    "#000000"
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


/* ================= PAUSA OBLIGATORIA ================= */

function wait(ms) {
    return new Promise(r => setTimeout(r, ms));
}


/* ================= VOZ ================= */

function playVoice(text, soft=false) {

    return new Promise(resolve => {

        speechSynthesis.cancel();

        const msg =
            new SpeechSynthesisUtterance(text);

        msg.lang = "es-ES";

        if (soft) {

            msg.rate = 0.8;
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


/* ================= EFECTO CONFIRMACION ================= */

async function confirmEffect(text) {

    const p = document.createElement("p");

    p.innerText = text;
    p.style.fontSize = "22px";
    p.style.marginTop = "20px";
    p.style.opacity = "0.8";

    block.appendChild(p);

    await playVoice(text, true);

    await wait(700);
}


/* ================= RESPIRACION ================= */

async function breathing(b) {

    changeColor();

    block.innerHTML = "";

    const text = b.texto || "Respira";
    const dur = b.duracion || 4;

    const circle = document.createElement("div");

    circle.style.width = "140px";
    circle.style.height = "140px";
    circle.style.borderRadius = "50%";
    circle.style.background = "#00bfff";
    circle.style.margin = "30px auto";
    circle.style.transition =
        `transform ${dur}s linear`;

    block.appendChild(circle);

    const p = document.createElement("p");
    p.innerText = text;
    block.appendChild(p);

    await playVoice(text, true);

    circle.style.transform = "scale(2.5)";

    await wait(dur * 1000);

    circle.style.transform = "scale(1)";

    await wait(dur * 1000);

    await confirmEffect("Control mental activo");

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

    for (let i = 0; i < b.opciones.length; i++) {

        const btn =
            document.createElement("button");

        btn.innerText = b.opciones[i];

        btn.onclick = async () => {

            block.innerHTML = "";

            const correct =
                i === b.correcta;

            const result =
                correct
                ? "CORRECTO"
                : "INCORRECTO";

            const h =
                document.createElement("h2");

            h.innerText = result;

            block.appendChild(h);

            await playVoice(result);

            await wait(500);

            if (b.explicacion) {

                const p =
                    document.createElement("p");

                p.innerText =
                    b.explicacion;

                block.appendChild(p);

                await playVoice(
                    b.explicacion,
                    true
                );
            }

            if (correct) {

                await confirmEffect(
                    "Disciplina aumenta"
                );

            } else {

                await confirmEffect(
                    "Debes entrenar más"
                );

            }

            nextBtn.style.display =
                "inline-block";
        };

        block.appendChild(btn);
    }

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

        await wait(400);
    }

    await confirmEffect(
        "Ejercicio completado"
    );

    nextBtn.style.display =
        "inline-block";
}


/* ================= BLOQUE FUERTE ================= */

async function showBlock(b) {

    nextBtn.style.display = "none";

    changeColor();

    block.innerHTML = "";

    await wait(300);


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


    /* ===== TEXTO NORMAL ===== */

    const p =
        document.createElement("p");

    p.innerText = b.texto || "";

    block.appendChild(p);

    await playVoice(b.texto);

    await wait(500);

    await confirmEffect(
        "Continúa"
    );

    nextBtn.style.display =
        "inline-block";
}


/* ================= START ================= */

startBtn.onclick = async () => {

    startBtn.style.display = "none";

    await loadSession();

    showBlock(
        bloques[current]
    );
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
