// menu-publico.js — Menú hamburguesa del sitio público (index, menu, gallery, contacto).
// El botón y el <nav id="menu-publico"> están escritos en cada HTML; aquí solo se
// alterna la clase `site-header--abierto` y el CSS (global.css) hace el resto.
const header = document.querySelector(".site-header");
const boton = document.querySelector(".nav-toggle");
const nav = document.getElementById("menu-publico");

if (header && boton && nav) {
  const estaAbierto = () => header.classList.contains("site-header--abierto");

  const cambiarMenu = (abierto) => {
    header.classList.toggle("site-header--abierto", abierto);
    document.body.classList.toggle("menu-abierto", abierto);
    boton.setAttribute("aria-expanded", String(abierto));
    boton.setAttribute("aria-label", abierto ? "Cerrar menú" : "Abrir menú");
  };
  cambiarMenu(false);

  boton.addEventListener("click", () => cambiarMenu(!estaAbierto()));

  // Al elegir un enlace se cierra (los enlaces "#" no cambian de página).
  nav.addEventListener("click", (evento) => {
    if (evento.target.closest("a")) cambiarMenu(false);
  });

  // Al tocar fuera del header o con Escape.
  document.addEventListener("click", (evento) => {
    if (estaAbierto() && !header.contains(evento.target)) cambiarMenu(false);
  });
  document.addEventListener("keydown", (evento) => {
    if (evento.key === "Escape" && estaAbierto()) {
      cambiarMenu(false);
      boton.focus();
    }
  });

  // Si la ventana se ensancha, el menú ya se ve completo: se limpia el estado.
  window.matchMedia("(min-width: 901px)").addEventListener("change", (consulta) => {
    if (consulta.matches) cambiarMenu(false);
  });

  // Al volver con "atrás" el navegador restaura la página tal cual.
  window.addEventListener("pageshow", (evento) => {
    if (evento.persisted) cambiarMenu(false);
  });
}
