// header.js — Header dinámico de las páginas internas según el rol.
// Para agregar una página nueva al menú, añade una entrada a NAVEGACION.
import { urlDe, rutaActual } from "../core/rutas.js";
import { cerrarSesion } from "../services/auth.js";
import { iniciales } from "./formato.js";
import { toastError } from "./toast.js";

/**
 * Enlaces del menú interno. `roles` indica quién ve cada enlace.
 * Las páginas de caja (pos, historial y cierre) las ven admin y cajero.
 */
export const NAVEGACION = [
  { ruta: "panel.html", texto: "Panel", roles: ["admin", "cajero"] },
  { ruta: "pos.html", texto: "Vender", roles: ["admin", "cajero"] },
  { ruta: "historial.html", texto: "Ventas", roles: ["admin", "cajero"] },
  { ruta: "caja.html", texto: "Caja", roles: ["admin", "cajero"] },
  { ruta: "admin/catalogo.html", texto: "Catálogo", roles: ["admin"] },
  { ruta: "admin/reportes.html", texto: "Reportes", roles: ["admin"] },
  { ruta: "admin/empleados.html", texto: "Empleados", roles: ["admin"] },
  { ruta: "index.html", texto: "Sitio público", roles: ["admin", "cajero"] },
];

/** Devuelve los enlaces visibles para un rol (puro, testeable). */
export function enlacesPara(rol, navegacion = NAVEGACION) {
  return navegacion.filter((item) => item.roles.includes(rol));
}

/** Carga una sola vez la tipografía serif de la marca (la usa el nombre del café). */
function cargarFuenteMarca() {
  if (document.getElementById("fuente-marca")) return;
  const enlace = document.createElement("link");
  enlace.id = "fuente-marca";
  enlace.rel = "stylesheet";
  enlace.href = "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600&display=swap";
  document.head.append(enlace);
}

export function renderHeader(perfil) {
  cargarFuenteMarca();
  let header = document.querySelector("[data-app-header]");
  if (!header) {
    header = document.createElement("header");
    header.dataset.appHeader = "";
    document.body.prepend(header);
  }
  header.className = "app-header";

  const actual = rutaActual();
  const inner = document.createElement("div");
  inner.className = "app-header__inner";

  const marca = document.createElement("a");
  marca.className = "app-header__brand";
  marca.href = urlDe("panel.html");
  marca.setAttribute("aria-label", "Café Santa Cruz POS, ir al panel");
  marca.innerHTML = `<img src="${urlDe("img/logoRecortado.png")}" alt=""><span>Santa Cruz<small>Punto de venta</small></span>`;

  const nav = document.createElement("nav");
  nav.id = "menu-principal";
  nav.setAttribute("aria-label", "Menú principal");
  const ul = document.createElement("ul");
  ul.className = "app-nav";
  for (const item of enlacesPara(perfil.rol)) {
    const li = document.createElement("li");
    const a = document.createElement("a");
    a.href = urlDe(item.ruta);
    a.textContent = item.texto;
    if (item.ruta === actual) a.setAttribute("aria-current", "page");
    li.append(a);
    ul.append(li);
  }
  nav.append(ul);

  const usuario = document.createElement("div");
  usuario.className = "app-user";
  const avatar = document.createElement("span");
  avatar.className = "app-user__avatar";
  avatar.setAttribute("aria-hidden", "true");
  avatar.textContent = iniciales(perfil.nombre);
  const info = document.createElement("div");
  info.className = "app-user__info";
  const nombre = document.createElement("span");
  nombre.className = "app-user__nombre";
  nombre.textContent = perfil.nombre;
  const rol = document.createElement("span");
  rol.className = "app-user__rol";
  rol.textContent = perfil.rol;
  info.append(nombre, rol);

  const salir = document.createElement("button");
  salir.type = "button";
  salir.className = "btn btn--secondary btn--sm";
  salir.textContent = "Salir";
  salir.addEventListener("click", async () => {
    salir.disabled = true;
    try {
      await cerrarSesion();
      window.location.replace(urlDe("login.html?motivo=salida"));
    } catch (error) {
      console.error(error);
      salir.disabled = false;
      toastError("No se pudo cerrar la sesión. Inténtalo de nuevo.");
    }
  });

  usuario.append(avatar, info, salir);
  nav.append(usuario);

  // Botón hamburguesa: solo se ve en pantallas angostas (ver app.css).
  const boton = document.createElement("button");
  boton.type = "button";
  boton.className = "app-header__toggle";
  boton.setAttribute("aria-controls", "menu-principal");
  boton.innerHTML = '<span class="app-header__barras" aria-hidden="true"></span>';

  const estaAbierto = () => header.classList.contains("app-header--abierto");
  const cambiarMenu = (abierto) => {
    header.classList.toggle("app-header--abierto", abierto);
    document.body.classList.toggle("menu-abierto", abierto);
    boton.setAttribute("aria-expanded", String(abierto));
    boton.setAttribute("aria-label", abierto ? "Cerrar menú" : "Abrir menú");
  };
  cambiarMenu(false);

  boton.addEventListener("click", () => cambiarMenu(!estaAbierto()));
  // Se cierra al elegir un enlace, al tocar fuera del header, con Escape o al ensanchar la ventana.
  nav.addEventListener("click", (evento) => {
    const enlace = evento.target.closest("a");
    if (!enlace) return;
    const clicNormal = evento.button === 0 && !(evento.ctrlKey || evento.metaKey || evento.shiftKey || evento.altKey);
    if (clicNormal) {
      // Sin hover en el celular: la opción tocada queda subrayada mientras carga la página nueva.
      // No se espera nada; el navegador navega de inmediato.
      enlace.classList.add("app-nav__tocado");
    } else {
      cambiarMenu(false); // abrir en otra pestaña: esta página se queda y el menú se cierra
    }
  });
  // Al volver con "atrás" el navegador restaura la página tal cual: se limpia el estado.
  window.addEventListener("pageshow", (evento) => {
    if (!evento.persisted) return;
    cambiarMenu(false);
    nav.querySelectorAll(".app-nav__tocado").forEach((a) => a.classList.remove("app-nav__tocado"));
  });
  document.addEventListener("click", (evento) => {
    if (estaAbierto() && !header.contains(evento.target)) cambiarMenu(false);
  });
  document.addEventListener("keydown", (evento) => {
    if (evento.key === "Escape" && estaAbierto()) {
      cambiarMenu(false);
      boton.focus();
    }
  });
  window.matchMedia("(min-width: 1101px)").addEventListener("change", (consulta) => {
    if (consulta.matches) cambiarMenu(false);
  });

  inner.append(marca, boton, nav);
  header.replaceChildren(inner);
}
