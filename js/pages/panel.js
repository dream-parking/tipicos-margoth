// panel.js — Página de inicio interna: saludo y módulos según el rol.
import { requireAuth } from "../core/guards.js";
import { urlDe } from "../core/rutas.js";
import { listarUsuarios } from "../services/usuarios.js";
import { resumenEmpleados } from "../utils/empleados.js";

// Íconos de trazo (24×24) para cada módulo.
const ICONOS = {
  pos: '<path d="M4 7h16v12H4z"/><path d="M8 7V4h8v3M8 12h8M8 15h5"/>',
  caja: '<rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18M7 15h3"/>',
  catalogo: '<path d="M4 5h7v7H4zM13 5h7v7h-7zM4 14h7v5H4zM13 14h7v5h-7z"/>',
  reportes: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  empleados: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6M16 4.5a3.5 3.5 0 0 1 0 7M18.5 14.3c1.8.8 3 2.8 3 5.7"/>',
};

const svg = (trazo, clase = "") =>
  `<svg class="${clase}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${trazo}</svg>`;

/**
 * Módulos del panel. `ruta: null` = aún no disponible (lo implementa otra sección).
 * Secciones 2 y 3: cambiar `ruta` cuando su página exista.
 */
const ACCESOS = [
  { id: "pos", titulo: "Punto de venta", texto: "Cobra órdenes y emite tickets.", ruta: null, roles: ["admin", "cajero"] },
  { id: "caja", titulo: "Cierre de caja", texto: "Cuadra el efectivo del turno.", ruta: null, roles: ["admin", "cajero"] },
  { id: "catalogo", titulo: "Catálogo e inventario", texto: "Productos, precios y stock.", ruta: "admin/catalogo.html", roles: ["admin"] },
  { id: "reportes", titulo: "Reportes", texto: "Ventas, productos top e indicadores.", ruta: "admin/reportes.html", roles: ["admin"] },
  { id: "empleados", titulo: "Empleados", texto: "Activa cuentas y asigna roles.", ruta: "admin/empleados.html", roles: ["admin"] },
];

const { perfil } = await requireAuth();

const primerNombre = perfil.nombre.split(" ")[0];
document.getElementById("saludo").textContent = `Hola, ${primerNombre}.`;
document.getElementById("fecha-hoy").textContent = new Intl.DateTimeFormat("es-SV", {
  weekday: "long", day: "numeric", month: "long", year: "numeric",
}).format(new Date());
document.getElementById("subtitulo").textContent =
  perfil.rol === "admin"
    ? "Administras el catálogo, el equipo y los reportes del café."
    : "Desde aquí cobras y cierras tu caja al final del turno.";

const params = new URLSearchParams(window.location.search);
if (params.get("motivo") === "sin-permiso") {
  const aviso = document.getElementById("aviso");
  aviso.className = "alerta alerta--error";
  aviso.textContent = "No tienes permiso para acceder a esa página.";
  aviso.hidden = false;
}

// ───────── Módulos ─────────
const contenedor = document.getElementById("accesos");
// Los módulos disponibles van primero: son lo que el usuario puede usar hoy.
const visibles = ACCESOS.filter((a) => a.roles.includes(perfil.rol)).sort(
  (a, b) => Number(Boolean(b.ruta)) - Number(Boolean(a.ruta))
);
for (const acceso of visibles) {
  const disponible = Boolean(acceso.ruta);
  const tarjeta = document.createElement(disponible ? "a" : "div");
  tarjeta.className = `modulo ${disponible ? "modulo--activo" : "modulo--pronto"}`;
  if (disponible) tarjeta.href = urlDe(acceso.ruta);
  else tarjeta.setAttribute("aria-disabled", "true");

  tarjeta.innerHTML = `
    <span class="modulo__icono">${svg(ICONOS[acceso.id])}</span>
    ${disponible ? svg('<path d="M7 17 17 7M9 7h8v8"/>', "modulo__flecha") : ""}
    <h2></h2>
    <p></p>
    <span class="modulo__meta">${disponible ? "Abrir módulo" : "En desarrollo"}</span>`;
  tarjeta.querySelector("h2").textContent = acceso.titulo;
  tarjeta.querySelector("p").textContent = acceso.texto;
  contenedor.append(tarjeta);
}

// ───────── Aviso de cuentas pendientes (solo admin) ─────────
if (perfil.rol === "admin") {
  try {
    const { pendientes } = resumenEmpleados(await listarUsuarios());
    if (pendientes > 0) {
      const franja = document.getElementById("pendientes");
      const texto = document.createElement("span");
      texto.textContent =
        pendientes === 1
          ? "Hay 1 cuenta esperando activación."
          : `Hay ${pendientes} cuentas esperando activación.`;
      const enlace = document.createElement("a");
      enlace.href = urlDe("admin/empleados.html");
      enlace.textContent = "Revisar empleados";
      franja.append(texto, enlace);
      franja.hidden = false;
    }
  } catch (error) {
    // El aviso es opcional: si falla, el panel sigue funcionando.
    console.warn("No se pudo consultar las cuentas pendientes", error);
  }
}
