// firebase.js — Configuración e inicialización de Firebase.
// Esta configuración web es PÚBLICA por diseño: identifica el proyecto, no da
// privilegios. La seguridad real está en `firestore.rules`.
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import { getAuth, connectAuthEmulator } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";
import { getFirestore, connectFirestoreEmulator } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDh_RfrpcAQjhNNl_ijCqXtpe9V_qc3M2E",
  authDomain: "cafe-santa-cruz.firebaseapp.com",
  projectId: "cafe-santa-cruz",
  storageBucket: "cafe-santa-cruz.firebasestorage.app",
  messagingSenderId: "548737489138",
  appId: "1:548737489138:web:e33c49e8de8069a990586b",
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Modo desarrollo: en localhost, `localStorage.emulador = "1"` conecta la app a
// los emuladores locales (npm run emuladores) en vez del proyecto real.
export const USA_EMULADOR =
  ["localhost", "127.0.0.1"].includes(location.hostname) && localStorage.getItem("emulador") === "1";
if (USA_EMULADOR) {
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  connectFirestoreEmulator(db, "127.0.0.1", 8080);
  console.info("[firebase] Usando emuladores locales");
}

// Versión del SDK, por si otro módulo necesita importar más funciones del CDN.
export const SDK_VERSION = "11.0.2";
