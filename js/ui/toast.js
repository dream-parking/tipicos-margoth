// toast.js — Notificaciones breves no bloqueantes.
// Uso: toast("Guardado", "exito") · tipos: "info" | "exito" | "error" | "aviso"

let contenedor = null;

function obtenerContenedor() {
  if (contenedor && document.body.contains(contenedor)) return contenedor;
  contenedor = document.createElement("div");
  contenedor.className = "toast-stack";
  contenedor.setAttribute("role", "status");
  contenedor.setAttribute("aria-live", "polite");
  document.body.append(contenedor);
  return contenedor;
}

const ICONOS = { info: "i", exito: "✓", error: "×", aviso: "!" };

export function toast(mensaje, tipo = "info", duracion = 3500) {
  const nodo = document.createElement("div");
  nodo.className = `toast toast--${tipo}`;
  if (tipo === "error") nodo.setAttribute("role", "alert");

  const icono = document.createElement("span");
  icono.className = "toast__icon";
  icono.setAttribute("aria-hidden", "true");
  icono.textContent = ICONOS[tipo] ?? ICONOS.info;

  const texto = document.createElement("span");
  texto.textContent = mensaje;

  const cerrar = document.createElement("button");
  cerrar.type = "button";
  cerrar.className = "toast__close";
  cerrar.setAttribute("aria-label", "Cerrar notificación");
  cerrar.textContent = "×";

  nodo.append(icono, texto, cerrar);
  obtenerContenedor().append(nodo);

  const quitar = () => {
    nodo.classList.add("toast--saliendo");
    setTimeout(() => nodo.remove(), 200);
  };
  cerrar.addEventListener("click", quitar);
  if (duracion > 0) setTimeout(quitar, duracion);
  return quitar;
}

export const toastExito = (m, d) => toast(m, "exito", d);
export const toastError = (m, d = 6000) => toast(m, "error", d);
export const toastAviso = (m, d) => toast(m, "aviso", d);
