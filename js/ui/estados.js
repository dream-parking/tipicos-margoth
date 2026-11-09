// estados.js — Representaciones de carga, vacío y error dentro de un contenedor,
// y un helper para botones que ejecutan operaciones asíncronas.

function crearBloque(clase, { icono, titulo, mensaje }) {
  const bloque = document.createElement("div");
  bloque.className = `estado ${clase}`;
  if (icono) {
    const i = document.createElement("div");
    i.className = "estado__icono";
    i.setAttribute("aria-hidden", "true");
    i.textContent = icono;
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
export function mostrarVacio(contenedor, { titulo = "No hay datos", mensaje = "", icono = "☕" } = {}) {
  contenedor.removeAttribute("aria-busy");
  contenedor.replaceChildren(crearBloque("estado--vacio", { icono, titulo, mensaje }));
}

/** Mensaje de error con botón opcional de reintento. */
export function mostrarError(contenedor, { titulo = "Algo salió mal", mensaje = "", reintentar } = {}) {
  contenedor.removeAttribute("aria-busy");
  const bloque = crearBloque("estado--error", { icono: "⚠", titulo, mensaje });
  bloque.setAttribute("role", "alert");
  if (reintentar) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn btn--secondary btn--sm";
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
