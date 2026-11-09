// guards.js — Protección de páginas internas. Ocultar opciones en la interfaz
// NO es seguridad: esto solo mejora la experiencia. Las reglas de Firestore son
// las que realmente impiden accesos indebidos.
import { usuarioActual, obtenerPerfil, cerrarSesion } from "../services/auth.js";
import { irA, rutaActual } from "./rutas.js";
import { renderHeader } from "../ui/header.js";
import { toastError } from "../ui/toast.js";

/**
 * Exige sesión iniciada con perfil activo. Si se pasa `roles`, además exige
 * que el rol del usuario esté en la lista.
 * Pinta el header de la app y muestra el <main> al terminar.
 * @param {{ roles?: string[] }} opciones
 * @returns {Promise<{ user: import("firebase/auth").User, perfil: object }>}
 */
export async function requireAuth({ roles } = {}) {
  document.body.dataset.auth = "pendiente";
  try {
    const user = await usuarioActual();
    if (!user) {
      irA("login.html", { next: rutaActual() });
      return new Promise(() => {}); // detiene la ejecución de la página
    }

    const perfil = await obtenerPerfil(user.uid);
    if (!perfil || perfil.activo !== true) {
      await cerrarSesion();
      irA("login.html", { motivo: perfil ? "inactivo" : "sin-perfil" });
      return new Promise(() => {});
    }

    if (roles && !roles.includes(perfil.rol)) {
      irA("panel.html", { motivo: "sin-permiso" });
      return new Promise(() => {});
    }

    renderHeader(perfil);
    document.body.dataset.auth = "listo";
    return { user, perfil };
  } catch (error) {
    console.error(error);
    document.body.dataset.auth = "listo";
    toastError("No se pudo verificar tu sesión. Revisa tu conexión.");
    throw error;
  }
}

/** Atajo: exige un rol concreto, p. ej. requireRole("admin"). */
export function requireRole(...roles) {
  return requireAuth({ roles });
}
