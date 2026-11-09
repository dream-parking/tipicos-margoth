// header.js — Header dinámico de las páginas internas según el rol.
// Para agregar una página nueva al menú, añade una entrada a NAVEGACION.
import { urlDe, rutaActual } from "../core/rutas.js";
import { cerrarSesion } from "../services/auth.js";
import { iniciales } from "./formato.js";
import { toastError } from "./toast.js";

/**
 * Enlaces del menú interno. `roles` indica quién ve cada enlace.
 * Secciones 2 y 3: agregar aquí "admin/catalogo.html", "pos.html", etc.
 */
export const NAVEGACION = [
  { ruta: "panel.html", texto: "Panel", roles: ["admin", "cajero"] },
  { ruta: "admin/empleados.html", texto: "Empleados", roles: ["admin"] },
  { ruta: "index.html", texto: "Sitio público", roles: ["admin", "cajero"] },
];

/** Devuelve los enlaces visibles para un rol (puro, testeable). */
export function enlacesPara(rol, navegacion = NAVEGACION) {
  return navegacion.filter((item) => item.roles.includes(rol));
}

export function renderHeader(perfil) {
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
  marca.innerHTML = `<img src="${urlDe("img/logo.png")}" alt=""><span>Santa Cruz POS</span>`;

  const nav = document.createElement("nav");
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
  salir.className = "btn btn--sm";
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
  inner.append(marca, nav, usuario);
  header.replaceChildren(inner);
}
