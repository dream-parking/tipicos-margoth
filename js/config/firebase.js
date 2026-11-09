// firebase.js — Configuración e inicialización de Firebase.
// Esta configuración web es PÚBLICA por diseño: identifica el proyecto, no da
// privilegios. La seguridad real está en `firestore.rules`.
import { initializeApp, deleteApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import {
  getAuth,
  initializeAuth,
  inMemoryPersistence,
  connectAuthEmulator,
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";
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

function conectarEmuladores(authInstancia, dbInstancia) {
  connectAuthEmulator(authInstancia, "http://127.0.0.1:9099", { disableWarnings: true });
  connectFirestoreEmulator(dbInstancia, "127.0.0.1", 8080);
}

if (USA_EMULADOR) {
  conectarEmuladores(auth, db);
  console.info("[firebase] Usando emuladores locales");
}

/**
 * Crea una instancia temporal de Firebase con su propia sesión, guardada solo
 * en memoria. Sirve para que un admin cree la cuenta de otro empleado sin que
 * se cierre su propia sesión (createUserWithEmailAndPassword inicia sesión con
 * la cuenta nueva). Llamar a `cerrar()` al terminar.
 */
export function crearInstanciaTemporal() {
  const appTemporal = initializeApp(firebaseConfig, `temporal-${Date.now()}`);
  const authTemporal = initializeAuth(appTemporal, { persistence: inMemoryPersistence });
  const dbTemporal = getFirestore(appTemporal);
  if (USA_EMULADOR) conectarEmuladores(authTemporal, dbTemporal);
  return { auth: authTemporal, db: dbTemporal, cerrar: () => deleteApp(appTemporal) };
}

// Versión del SDK, por si otro módulo necesita importar más funciones del CDN.
export const SDK_VERSION = "11.0.2";
