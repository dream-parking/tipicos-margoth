// panel.js — Página de inicio interna: saludo y accesos según el rol.
import { requireAuth } from "../core/guards.js";
import { urlDe } from "../core/rutas.js";

/**
 * Accesos del panel. `ruta: null` = módulo aún no disponible.
 * Secciones 2 y 3: cambiar `ruta` cuando su página exista.
 */
const ACCESOS = [
  { titulo: "Punto de venta", texto: "Cobrar órdenes y emitir tickets.", ruta: null, roles: ["admin", "cajero"] },
  { titulo: "Cierre de caja", texto: "Cuadrar el efectivo del turno.", ruta: null, roles: ["admin", "cajero"] },
  { titulo: "Catálogo e inventario", texto: "Productos, precios y stock.", ruta: null, roles: ["admin"] },
  { titulo: "Reportes", texto: "Ventas, productos top e indicadores.", ruta: null, roles: ["admin"] },
  { titulo: "Empleados", texto: "Activar cuentas y asignar roles.", ruta: "admin/empleados.html", roles: ["admin"] },
];

const { perfil } = await requireAuth();

const primerNombre = perfil.nombre.split(" ")[0];
document.getElementById("saludo").textContent = `Hola, ${primerNombre}`;
document.getElementById("fecha-hoy").textContent = new Intl.DateTimeFormat("es-SV", {
  dateStyle: "full",
}).format(new Date());

const params = new URLSearchParams(window.location.search);
if (params.get("motivo") === "sin-permiso") {
  const aviso = document.getElementById("aviso");
  aviso.className = "alerta alerta--error";
  aviso.textContent = "No tienes permiso para acceder a esa página.";
  aviso.hidden = false;
}

const contenedor = document.getElementById("accesos");
for (const acceso of ACCESOS.filter((a) => a.roles.includes(perfil.rol))) {
  const tarjeta = document.createElement(acceso.ruta ? "a" : "div");
  tarjeta.className = "card link-card";
  if (acceso.ruta) tarjeta.href = urlDe(acceso.ruta);
  else tarjeta.setAttribute("aria-disabled", "true");

  const h2 = document.createElement("h2");
  h2.textContent = acceso.titulo;
  const p = document.createElement("p");
  p.textContent = acceso.ruta ? acceso.texto : `${acceso.texto} (Próximamente)`;
  tarjeta.append(h2, p);
  contenedor.append(tarjeta);
}
