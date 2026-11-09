// rutas.js — Construye URLs relativas a la raíz del sitio, para que funcionen
// igual desde `/login.html` que desde `/admin/empleados.html`.

// Este archivo vive en /js/core/, así que la raíz está dos niveles arriba.
const RAIZ = new URL("../../", import.meta.url);

export function urlDe(ruta) {
  return new URL(ruta, RAIZ).href;
}

export function irA(ruta, params = {}) {
  const url = new URL(ruta, RAIZ);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  window.location.replace(url.href);
}

/** Ruta actual relativa a la raíz (ej. "admin/empleados.html"). */
export function rutaActual() {
  const actual = new URL(window.location.href);
  return actual.pathname.slice(RAIZ.pathname.length) || "index.html";
}

/** Solo acepta destinos internos para evitar redirecciones abiertas. */
export function destinoSeguro(valor, porDefecto = "panel.html") {
  if (!valor || /^[a-z]+:|^\/\//i.test(valor) || valor.includes("..")) return porDefecto;
  return valor.replace(/^\/+/, "");
}
