const startBtn = document.getElementById("start-btn");
const nextBtn = document.getElementById("next-btn");
const backBtn = document.getElementById("back-btn");
const restartBtn = document.getElementById("restart-btn");

const block = document.getElementById("block");

let accessGranted = false;
let username = null;
let password = null;


// LOGIN INICIAL
async function loginUser() {

    username = prompt("Usuario:");

    if (!username) {
        alert("Usuario requerido");
        return false;
    }

    password = prompt("Contraseña:");

    if (!password) {
        alert("Contraseña requerida");
        return false;
    }

    const res = await fetch("/login", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            username,
            password
        })
    });

    const data = await res.json();

    if (data.success) {
        accessGranted = true;
        localStorage.setItem("maykami_user", username);
        return true;
    }

    accessGranted = false;
    return false;
}


// START BUTTON
startBtn.onclick = async () => {

    const ok = await loginUser();

    if (!ok) {
        alert("ACCESO DENEGADO");
        return;
    }

    block.style.display = "none";

    console.log("Acceso permitido - modo libre activado");
};


// BOTONES SEGURIDAD (SI LOS USAS)
nextBtn.onclick = () => {
    if (!accessGranted) return alert("Sin acceso");
};

backBtn.onclick = () => {
    if (!accessGranted) return alert("Sin acceso");
};

restartBtn.onclick = () => {
    if (!accessGranted) return alert("Sin acceso");
};
