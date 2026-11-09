// auth.js — Registro, inicio y cierre de sesión con Firebase Authentication,
// y lectura del perfil de empleado (colección `usuarios`).
import { auth, db } from "../config/firebase.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";
import { errorApp } from "./auth-errores.js";

export const ROLES = Object.freeze({ ADMIN: "admin", CAJERO: "cajero" });

/** Lee el perfil `usuarios/{uid}`; devuelve null si no existe. */
export async function obtenerPerfil(uid) {
  const snap = await getDoc(doc(db, "usuarios", uid));
  return snap.exists() ? { uid, ...snap.data() } : null;
}

/**
 * Registra un empleado nuevo. Siempre queda como cajero INACTIVO: solo un
 * administrador puede activarlo o cambiarle el rol (lo exigen las reglas).
 * Al terminar cierra la sesión, porque la cuenta aún no puede operar.
 */
export async function registrar({ nombre, email, password }) {
  const credencial = await createUserWithEmailAndPassword(auth, email, password);
  const { user } = credencial;
  try {
    await updateProfile(user, { displayName: nombre });
    await setDoc(doc(db, "usuarios", user.uid), {
      nombre,
      email: user.email,
      rol: ROLES.CAJERO,
      activo: false,
      creado: serverTimestamp(),
    });
  } catch (error) {
    // Si no se pudo crear el perfil, borramos la cuenta para no dejarla huérfana.
    await user.delete().catch(() => {});
    throw error;
  } finally {
    await signOut(auth).catch(() => {});
  }
}

/**
 * Inicia sesión y valida que el perfil exista y esté activo.
 * @returns {Promise<object>} el perfil del empleado
 */
export async function iniciarSesion({ email, password }) {
  const { user } = await signInWithEmailAndPassword(auth, email, password);
  const perfil = await obtenerPerfil(user.uid);
  if (!perfil) {
    await signOut(auth);
    throw errorApp("app/sin-perfil");
  }
  if (perfil.activo !== true) {
    await signOut(auth);
    throw errorApp("app/inactivo");
  }
  return perfil;
}

export async function cerrarSesion() {
  await signOut(auth);
}

/** Suscribe un callback a los cambios de sesión. Devuelve la función para desuscribir. */
export function observarSesion(callback) {
  return onAuthStateChanged(auth, callback);
}

/** Resuelve con el usuario actual una vez que Firebase restauró la sesión. */
export function usuarioActual() {
  return new Promise((resolve) => {
    const desuscribir = onAuthStateChanged(auth, (user) => {
      desuscribir();
      resolve(user);
    });
  });
}
