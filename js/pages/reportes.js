// reportes.js — Panel de reportes (solo admin). Lee las ventas del rango elegido
// y deja que js/utils/reportes.js haga todos los cálculos; aquí solo se dibuja.
import { requireRole } from "../core/guards.js";
import { listarVentasEnRango } from "../services/ventas.js";
import { listarProductos } from "../services/productos.js";
import { traducirError } from "../services/auth-errores.js";
import { rangoDeFechas, ultimosDias, generarReporte } from "../utils/reportes.js";
import {
  mostrarCargando,
  mostrarVacio,
  mostrarError,
  finCargando,
  toastError,
  formatearMoneda,
  formatearFecha,
} from "../ui/index.js";

await requireRole("admin");

const form = document.getElementById("filtros");
const reporte = document.getElementById("reporte");
const rangoTexto = document.getElementById("rango-texto");
const btnConsultar = document.getElementById("btn-consultar");

const NOMBRE_METODO = { efectivo: "Efectivo", tarjeta: "Tarjeta", otro: "Otro" };

/** productoId → categoría, solo para ventas cuyos items no guardaron la categoría. */
let categoriaDeProducto = {};

// ───────── Utilidades de dibujo ─────────
function el(etiqueta, clase, texto) {
  const nodo = document.createElement(etiqueta);
  if (clase) nodo.className = clase;
  if (texto !== undefined) nodo.textContent = texto;
  return nodo;
}

function tarjeta(titulo, ...contenido) {
  const seccion = el("section", "reporte-card");
  seccion.append(el("h2", "reporte-card__titulo", titulo), ...contenido);
  return seccion;
}

/** Fila con una barra proporcional: etiqueta · barra · valor. */
function filaBarra(etiqueta, valor, maximo, textoValor, detalle) {
  const fila = el("div", "barra-fila");
  const nombre = el("span", "barra-fila__nombre", etiqueta);
  const pista = el("span", "barra-fila__pista");
  const barra = el("span", "barra-fila__barra");
  barra.style.width = `${maximo > 0 ? Math.max((valor / maximo) * 100, valor > 0 ? 2 : 0) : 0}%`;
  pista.append(barra);
  const dato = el("span", "barra-fila__valor", textoValor);
  if (detalle) dato.title = detalle;
  fila.append(nombre, pista, dato);
  return fila;
}

function listaBarras(filas, vacio = "Sin datos en este rango.") {
  if (filas.length === 0) return el("p", "reporte-card__vacio", vacio);
  const contenedor = el("div", "barras");
  contenedor.append(...filas);
  return contenedor;
}

const plural = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`;

// ───────── Secciones del reporte ─────────
function renderIndicadores(r) {
  const datos = [
    ["Total vendido", formatearMoneda(r.totalVendido)],
    ["Ventas", r.cantidadVentas],
    ["Ticket promedio", formatearMoneda(r.ticketPromedio)],
    ["Anuladas", r.anuladas],
  ];
  const cont = el("section", "stats");
  cont.setAttribute("aria-label", "Indicadores");
  datos.forEach(([label, valor]) => {
    const c = el("div", "stat");
    c.append(el("div", "stat__label", label), el("div", "stat__valor", String(valor)));
    cont.append(c);
  });
  return cont;
}

function renderPorDia(dias) {
  const max = Math.max(...dias.map((d) => d.total), 0);
  return tarjeta(
    "Ventas por día",
    listaBarras(
      dias.map((d) => {
        const [y, m, dd] = d.dia.split("-").map(Number);
        return filaBarra(formatearFecha(new Date(y, m - 1, dd)), d.total, max, formatearMoneda(d.total), plural(d.ventas, "venta", "ventas"));
      })
    )
  );
}

function renderTop(top) {
  const max = Math.max(...top.map((p) => p.unidades), 0);
  return tarjeta(
    "Top 5 productos",
    listaBarras(top.map((p) => filaBarra(p.nombre, p.unidades, max, plural(p.unidades, "unidad", "unidades"), formatearMoneda(p.importe))))
  );
}

function renderCategorias(cats) {
  const max = Math.max(...cats.map((c) => c.importe), 0);
  return tarjeta("Ventas por categoría", listaBarras(cats.map((c) => filaBarra(c.etiqueta, c.importe, max, formatearMoneda(c.importe), plural(c.unidades, "unidad", "unidades")))));
}

function renderMetodos(metodos) {
  const max = Math.max(...metodos.map((m) => m.total), 0);
  return tarjeta("Método de pago", listaBarras(metodos.map((m) => filaBarra(NOMBRE_METODO[m.metodo] ?? m.metodo, m.total, max, formatearMoneda(m.total), plural(m.ventas, "venta", "ventas")))));
}

function renderCajeros(cajeros) {
  const max = Math.max(...cajeros.map((c) => c.total), 0);
  return tarjeta("Ventas por cajero", listaBarras(cajeros.map((c) => filaBarra(c.cajero, c.total, max, formatearMoneda(c.total), plural(c.ventas, "venta", "ventas")))));
}

function dibujar(datos) {
  if (datos.resumen.cantidadVentas === 0) {
    mostrarVacio(reporte, {
      titulo: "No hay ventas en este rango",
      mensaje: "Prueba con otras fechas. Las ventas aparecen aquí cuando se cobran en el punto de venta.",
    });
    reporte.prepend(renderIndicadores(datos.resumen));
    return;
  }
  const rejilla = el("div", "reporte-rejilla");
  rejilla.append(
    renderPorDia(datos.porDia),
    renderTop(datos.topProductos),
    renderCategorias(datos.porCategoria),
    renderMetodos(datos.porMetodoPago),
    renderCajeros(datos.porCajero)
  );
  reporte.replaceChildren(renderIndicadores(datos.resumen), rejilla);
  finCargando(reporte);
}

// ───────── Consulta ─────────
async function consultar() {
  const rango = rangoDeFechas(form.desde.value, form.hasta.value);
  if (rango.error) {
    toastError(rango.error);
    return;
  }
  rangoTexto.textContent = `Del ${formatearFecha(rango.desde)} al ${formatearFecha(new Date(rango.hasta.getTime() - 1))}`;
  btnConsultar.disabled = true;
  mostrarCargando(reporte, "Calculando reporte…");
  try {
    const ventas = await listarVentasEnRango(rango.desde, rango.hasta);
    dibujar(generarReporte(ventas, rango.desde, rango.hasta, categoriaDeProducto));
  } catch (error) {
    console.error(error);
    mostrarError(reporte, { titulo: "No se pudo generar el reporte", mensaje: traducirError(error), reintentar: consultar });
  } finally {
    btnConsultar.disabled = false;
  }
}

form.addEventListener("submit", consultar);
form.querySelectorAll("[data-dias]").forEach((btn) =>
  btn.addEventListener("click", () => {
    const { desde, hasta } = ultimosDias(Number(btn.dataset.dias));
    form.desde.value = desde;
    form.hasta.value = hasta;
    consultar();
  })
);

// Arranque: últimos 7 días. El catálogo solo sirve de respaldo para categorías.
try {
  const productos = await listarProductos();
  categoriaDeProducto = Object.fromEntries(productos.map((p) => [p.id, p.categoria]));
} catch (error) {
  console.error(error);
}
const inicial = ultimosDias(7);
form.desde.value = inicial.desde;
form.hasta.value = inicial.hasta;
consultar();
