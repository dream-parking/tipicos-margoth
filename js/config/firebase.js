// firebase.js — Configuración e inicialización de Firebase.
// Esta configuración web es PÚBLICA por diseño: identifica el proyecto, no da
// privilegios. La seguridad real está en `firestore.rules`.
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

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

// Versión del SDK, por si otro módulo necesita importar más funciones del CDN.
export const SDK_VERSION = "11.0.2";
