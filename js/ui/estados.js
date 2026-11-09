// estados.js — Representaciones de carga, vacío y error dentro de un contenedor,
// y un helper para botones que ejecutan operaciones asíncronas.

// Íconos de trazo por defecto. `icono` también acepta un SVG propio (string de
// confianza, escrito en el código) o un texto corto.
const svgIcono = (trazo) =>
  `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${trazo}</svg>`;
export const ICONOS_ESTADO = {
  vacio: svgIcono('<path d="M4 7h16v12H4zM4 7l2-3h12l2 3M9 11h6"/>'),
  error: svgIcono('<path d="M12 8v5M12 16.5v.01"/><circle cx="12" cy="12" r="9"/>'),
};

function crearBloque(clase, { icono, titulo, mensaje }) {
  const bloque = document.createElement("div");
  bloque.className = `estado ${clase}`;
  if (icono) {
    const i = document.createElement("div");
    i.className = "estado__icono";
    i.setAttribute("aria-hidden", "true");
    if (icono.trim().startsWith("<svg")) i.innerHTML = icono;
    else i.textContent = icono;
    bloque.append(i);
  }
  if (titulo) {
    const h = document.createElement("p");
    h.className = "estado__titulo";
    h.textContent = titulo;
    bloque.append(h);
  }
  if (mensaje) {
    const p = document.createElement("p");
    p.className = "estado__mensaje";
    p.textContent = mensaje;
    bloque.append(p);
  }
  return bloque;
}

/** Reemplaza el contenido del contenedor por un spinner con texto. */
export function mostrarCargando(contenedor, texto = "Cargando…") {
  const bloque = document.createElement("div");
  bloque.className = "estado estado--cargando";
  bloque.setAttribute("role", "status");
  const spinner = document.createElement("span");
  spinner.className = "spinner";
  spinner.setAttribute("aria-hidden", "true");
  const p = document.createElement("p");
  p.className = "estado__mensaje";
  p.textContent = texto;
  bloque.append(spinner, p);
  contenedor.replaceChildren(bloque);
  contenedor.setAttribute("aria-busy", "true");
}

/** Mensaje cuando no hay datos que mostrar. */
export function mostrarVacio(contenedor, { titulo = "No hay datos", mensaje = "", icono = ICONOS_ESTADO.vacio } = {}) {
  contenedor.removeAttribute("aria-busy");
  contenedor.replaceChildren(crearBloque("estado--vacio", { icono, titulo, mensaje }));
}

/** Mensaje de error con botón opcional de reintento. */
export function mostrarError(contenedor, { titulo = "Algo salió mal", mensaje = "", reintentar } = {}) {
  contenedor.removeAttribute("aria-busy");
  const bloque = crearBloque("estado--error", { icono: ICONOS_ESTADO.error, titulo, mensaje });
  bloque.setAttribute("role", "alert");
  if (reintentar) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn btn--light btn--sm";
    btn.textContent = "Reintentar";
    btn.addEventListener("click", reintentar);
    bloque.append(btn);
  }
  contenedor.replaceChildren(bloque);
}

/** Quita el estado de carga (llamar después de renderizar los datos). */
export function finCargando(contenedor) {
  contenedor.removeAttribute("aria-busy");
}

/**
 * Deshabilita el botón y muestra un spinner mientras se ejecuta `tarea`.
 * Devuelve el resultado de la tarea (o relanza su error).
 */
export async function conCargando(boton, tarea, textoCargando = "Procesando…") {
  const original = boton.innerHTML;
  boton.disabled = true;
  boton.setAttribute("aria-busy", "true");
  boton.innerHTML = `<span class="spinner spinner--sm" aria-hidden="true"></span> ${textoCargando}`;
  try {
    return await tarea();
  } finally {
    boton.disabled = false;
    boton.removeAttribute("aria-busy");
    boton.innerHTML = original;
  }
}
