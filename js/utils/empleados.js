// empleados.js — Lógica de negocio pura sobre la lista de empleados:
// filtrado, búsqueda, ordenamiento, indicadores y reglas de modificación.
// No depende del DOM ni de Firebase, por eso se prueba con `node --test`.

export const ROLES_VALIDOS = ["admin", "cajero"];

/** Quita tildes y pasa a minúsculas para comparar textos. */
export function normalizar(texto = "") {
  return texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

/**
 * Filtra por texto (nombre o correo), rol ("todos" | "admin" | "cajero")
 * y estado ("todos" | "activo" | "inactivo").
 */
export function filtrarEmpleados(lista, { texto = "", rol = "todos", estado = "todos" } = {}) {
  const busqueda = normalizar(texto);
  return lista.filter((e) => {
    const coincideTexto =
      !busqueda || normalizar(e.nombre).includes(busqueda) || normalizar(e.email).includes(busqueda);
    const coincideRol = rol === "todos" || e.rol === rol;
    const coincideEstado =
      estado === "todos" || (estado === "activo" ? e.activo === true : e.activo !== true);
    return coincideTexto && coincideRol && coincideEstado;
  });
}

/** Ordena: primero los pendientes de activación, luego por nombre. No muta la lista. */
export function ordenarEmpleados(lista) {
  return [...lista].sort((a, b) => {
    if (a.activo !== b.activo) return a.activo ? 1 : -1;
    return normalizar(a.nombre).localeCompare(normalizar(b.nombre), "es");
  });
}

/** Indicadores para las tarjetas de resumen. */
export function resumenEmpleados(lista) {
  return lista.reduce(
    (acc, e) => {
      acc.total += 1;
      if (e.activo) acc.activos += 1;
      else acc.pendientes += 1;
      if (e.rol === "admin") acc.admins += 1;
      else if (e.rol === "cajero") acc.cajeros += 1;
      return acc;
    },
    { total: 0, activos: 0, pendientes: 0, admins: 0, cajeros: 0 }
  );
}

/**
 * Regla de negocio: ¿puede `actorUid` aplicar `cambios` ({ rol?, activo? }) al empleado `objetivo`?
 * - Nadie modifica su propio rol ni se desactiva a sí mismo (evita quedarse sin admin).
 * - Solo se aceptan roles válidos.
 * - Debe quedar al menos un administrador activo.
 * @returns {{ permitido: boolean, motivo?: string }}
 */
export function validarCambioEmpleado(actorUid, objetivo, cambios, lista = []) {
  if (!objetivo) return { permitido: false, motivo: "El empleado no existe." };
  if (objetivo.uid === actorUid) {
    return { permitido: false, motivo: "No puedes cambiar tu propio rol ni desactivar tu cuenta." };
  }
  if ("rol" in cambios && !ROLES_VALIDOS.includes(cambios.rol)) {
    return { permitido: false, motivo: "Rol no válido." };
  }
  if ("activo" in cambios && typeof cambios.activo !== "boolean") {
    return { permitido: false, motivo: "Estado no válido." };
  }
  const dejaDeSerAdminActivo =
    objetivo.rol === "admin" &&
    objetivo.activo === true &&
    (cambios.rol === "cajero" || cambios.activo === false);
  if (dejaDeSerAdminActivo) {
    const adminsActivos = lista.filter((e) => e.rol === "admin" && e.activo === true).length;
    if (adminsActivos <= 1) {
      return { permitido: false, motivo: "Debe quedar al menos un administrador activo." };
    }
  }
  return { permitido: true };
}
