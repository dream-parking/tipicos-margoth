// auth-errores.js — Traducción de errores de Firebase al español (puro, testeable).

export const MENSAJES_ERROR = {
  "auth/invalid-email": "El correo no tiene un formato válido.",
  "auth/missing-email": "Ingresa tu correo.",
  "auth/missing-password": "Ingresa tu contraseña.",
  "auth/invalid-credential": "Correo o contraseña incorrectos.",
  "auth/invalid-login-credentials": "Correo o contraseña incorrectos.",
  "auth/wrong-password": "Correo o contraseña incorrectos.",
  "auth/user-not-found": "Correo o contraseña incorrectos.",
  "auth/user-disabled": "Esta cuenta fue deshabilitada.",
  "auth/email-already-in-use": "Ya existe una cuenta con ese correo.",
  "auth/weak-password": "La contraseña es muy débil (mínimo 6 caracteres).",
  "auth/too-many-requests": "Demasiados intentos. Espera unos minutos e inténtalo de nuevo.",
  "auth/network-request-failed": "No hay conexión. Revisa tu internet e inténtalo de nuevo.",
  "auth/operation-not-allowed": "El acceso con correo y contraseña no está habilitado.",
  "auth/requires-recent-login": "Por seguridad, vuelve a iniciar sesión.",
  "permission-denied": "No tienes permiso para realizar esta operación.",
  "unavailable": "El servicio no está disponible. Revisa tu conexión.",
  "not-found": "El registro no existe.",
  "app/inactivo": "Tu cuenta está pendiente de activación. Un administrador debe activarla.",
  "app/sin-perfil": "Tu cuenta no tiene perfil de empleado. Contacta al administrador.",
};

export const MENSAJE_GENERICO = "Ocurrió un error inesperado. Inténtalo de nuevo.";

/** Devuelve un mensaje en español para un error de Firebase (o de la app). */
export function traducirError(error) {
  const codigo = error?.code ?? "";
  // Firestore a veces usa el prefijo "firestore/".
  const limpio = codigo.replace(/^firestore\//, "");
  return MENSAJES_ERROR[codigo] ?? MENSAJES_ERROR[limpio] ?? MENSAJE_GENERICO;
}

/** Crea un error con `code` para estados propios de la app. */
export function errorApp(codigo) {
  const e = new Error(MENSAJES_ERROR[codigo] ?? MENSAJE_GENERICO);
  e.code = codigo;
  return e;
}
