/* ============================================================
   UNIVERSAL LANGUAGE & VOICE ENGINE (i18n.js)
   ============================================================ */

let currentLang = localStorage.getItem("appLang") || "es";

const appTranslations = {
    es: {
        welcome: "Bienvenido",
        change_lang: "English",
        msg_changed: "Idioma cambiado a español"
    },
    en: {
        welcome: "Welcome",
        change_lang: "Español",
        msg_changed: "Language changed to English"
    }
};

function translateText(key) {
    return appTranslations[currentLang][key] || key;
}

// 🔊 Función universal para la voz adaptada al idioma actual
function speakUniversal(text) {
    return new Promise(resolve => {
        if (!('speechSynthesis' in window)) {
            resolve();
            return;
        }
        window.speechSynthesis.cancel();
        const cleanText = text.replace(/<[^>]*>/g, "");
        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.lang = currentLang === "es" ? "es-ES" : "en-US";
        utterance.rate = 0.9;
        utterance.pitch = 1.0;
        utterance.onend = resolve;
        utterance.onerror = resolve;
        window.speechSynthesis.speak(utterance);
    });
}

function toggleUniversalLanguage(updateUIcallback) {
    currentLang = currentLang === "es" ? "en" : "es";
    localStorage.setItem("appLang", currentLang);
    
    if (typeof updateUIcallback === "function") {
        updateUIcallback();
    }
    
    speakUniversal(translateText("msg_changed"));
}
