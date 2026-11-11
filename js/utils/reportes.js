// reportes.js — Cálculo de reportes de ventas (lógica pura, sin Firestore ni DOM).
// Recibe la lista de ventas ya leída y devuelve números listos para mostrar.
// Una venta se ve así (ver firestore.rules):
//   { cajeroId, cajeroNombre, items: [{ productoId, nombre, categoria, precio, cantidad }],
//     total, metodoPago: "efectivo"|"tarjeta", estado: "pagada"|"anulada", creado }
import { aFecha } from "../ui/formato.js";
import { categoriaPorId } from "./productos.js";

const redondear = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;
const dos = (n) => String(n).padStart(2, "0");

// ───────── Fechas ─────────

/** Date → "YYYY-MM-DD" en hora local (la clave con la que se agrupa por día). */
export function claveDia(fecha) {
  return `${fecha.getFullYear()}-${dos(fecha.getMonth() + 1)}-${dos(fecha.getDate())}`;
}

/** "YYYY-MM-DD" → Date a las 00:00 locales (o null si no es una fecha real). */
export function fechaDesdeClave(clave) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(clave ?? ""));
  if (!m) return null;
  const [y, mes, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const fecha = new Date(y, mes - 1, d);
  // Rechaza fechas imposibles como 2026-02-31 (JS las "corrige" sin avisar).
  return fecha.getMonth() === mes - 1 && fecha.getDate() === d ? fecha : null;
}

/**
 * Convierte dos claves de día en el rango que se consulta: desde las 00:00 del
 * primer día hasta las 00:00 del día siguiente al último (extremo EXCLUIDO).
 * Devuelve { desde, hasta } o { error } si el rango no es válido.
 */
export function rangoDeFechas(desdeClave, hastaClave) {
  const desde = fechaDesdeClave(desdeClave);
  const ultimo = fechaDesdeClave(hastaClave);
  if (!desde || !ultimo) return { error: "Elige una fecha de inicio y una de fin." };
  if (ultimo < desde) return { error: "La fecha de fin no puede ser anterior a la de inicio." };
  const hasta = new Date(ultimo.getFullYear(), ultimo.getMonth(), ultimo.getDate() + 1);
  return { desde, hasta };
}

/** Rango de los últimos `dias` días terminando hoy, como claves "YYYY-MM-DD". */
export function ultimosDias(dias, hoy = new Date()) {
  const inicio = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - (dias - 1));
  return { desde: claveDia(inicio), hasta: claveDia(hoy) };
}

// ───────── Base de los cálculos ─────────

/** Solo cuentan las ventas pagadas: una venta anulada no es ingreso. */
export const ventasPagadas = (ventas) => ventas.filter((v) => v.estado !== "anulada");

/** Conserva las ventas cuya fecha cae en [desde, hasta). */
export function filtrarPorRango(ventas, desde, hasta) {
  return ventas.filter((v) => {
    const f = aFecha(v.creado);
    return f && f >= desde && f < hasta;
  });
}

export const totalVentas = (ventas) => redondear(ventas.reduce((acc, v) => acc + (Number(v.total) || 0), 0));

/** Ticket promedio = total vendido ÷ número de ventas (0 si no hay ventas). */
export function ticketPromedio(ventas) {
  return ventas.length === 0 ? 0 : redondear(totalVentas(ventas) / ventas.length);
}

// ───────── Agrupaciones ─────────

/**
 * Agrupa por una clave que calcula `claveDe(venta)` y suma el total.
 * Devuelve un Map { clave → { clave, ventas, total } } (en orden de aparición).
 */
function agrupar(ventas, claveDe) {
  const grupos = new Map();
  for (const v of ventas) {
    const clave = claveDe(v);
    const g = grupos.get(clave) ?? { clave, ventas: 0, total: 0 };
    g.ventas += 1;
    g.total += Number(v.total) || 0;
    grupos.set(clave, g);
  }
  return [...grupos.values()].map((g) => ({ ...g, total: redondear(g.total) }));
}

/**
 * Ventas por día. Incluye los días sin ventas dentro del rango (en 0) para que
 * la gráfica no tenga "huecos". Devuelve [{ dia, ventas, total }] ordenado.
 */
export function ventasPorDia(ventas, desde, hasta) {
  const porDia = new Map(
    agrupar(ventas, (v) => claveDia(aFecha(v.creado))).map((g) => [g.clave, g])
  );
  const resultado = [];
  for (let d = new Date(desde); d < hasta; d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)) {
    const clave = claveDia(d);
    const g = porDia.get(clave);
    resultado.push({ dia: clave, ventas: g?.ventas ?? 0, total: g?.total ?? 0 });
  }
  return resultado;
}

/** Ventas por método de pago: [{ metodo, ventas, total }] de mayor a menor total. */
export function ventasPorMetodoPago(ventas) {
  return agrupar(ventas, (v) => v.metodoPago || "otro")
    .map(({ clave, ventas: n, total }) => ({ metodo: clave, ventas: n, total }))
    .sort((a, b) => b.total - a.total);
}

/** Ventas por cajero: [{ cajeroId, cajero, ventas, total }] de mayor a menor total. */
export function ventasPorCajero(ventas) {
  const nombres = new Map();
  ventas.forEach((v) => nombres.set(v.cajeroId, v.cajeroNombre || "Sin nombre"));
  return agrupar(ventas, (v) => v.cajeroId)
    .map(({ clave, ventas: n, total }) => ({ cajeroId: clave, cajero: nombres.get(clave), ventas: n, total }))
    .sort((a, b) => b.total - a.total);
}

// ───────── Productos (se calculan desde `items`) ─────────

/** Importe de una línea de venta: precio × cantidad. */
const importeItem = (item) => redondear((Number(item.precio) || 0) * (Number(item.cantidad) || 0));

/**
 * Productos más vendidos. Suma las unidades de cada producto en todas las
 * ventas y devuelve los `limite` primeros por unidades (a igualdad, por importe).
 * [{ productoId, nombre, unidades, importe }]
 */
export function topProductos(ventas, limite = 5) {
  const acumulado = new Map();
  for (const v of ventas) {
    for (const item of v.items ?? []) {
      const id = item.productoId ?? item.nombre;
      const p = acumulado.get(id) ?? { productoId: id, nombre: item.nombre ?? id, unidades: 0, importe: 0 };
      p.unidades += Number(item.cantidad) || 0;
      p.importe += importeItem(item);
      acumulado.set(id, p);
    }
  }
  return [...acumulado.values()]
    .map((p) => ({ ...p, importe: redondear(p.importe) }))
    .sort((a, b) => b.unidades - a.unidades || b.importe - a.importe || a.nombre.localeCompare(b.nombre, "es"))
    .slice(0, limite);
}

/**
 * Ventas por categoría (según los productos vendidos). Si el item no guardó su
 * categoría, se busca en `categoriaDeProducto` (mapa productoId → categoria).
 * [{ categoria, etiqueta, unidades, importe }] de mayor a menor importe.
 */
export function ventasPorCategoria(ventas, categoriaDeProducto = {}) {
  const acumulado = new Map();
  for (const v of ventas) {
    for (const item of v.items ?? []) {
      const cat = item.categoria || categoriaDeProducto[item.productoId] || "sin-categoria";
      const c = acumulado.get(cat) ?? { categoria: cat, unidades: 0, importe: 0 };
      c.unidades += Number(item.cantidad) || 0;
      c.importe += importeItem(item);
      acumulado.set(cat, c);
    }
  }
  return [...acumulado.values()]
    .map((c) => ({
      ...c,
      etiqueta: c.categoria === "sin-categoria" ? "Sin categoría" : categoriaPorId(c.categoria)?.etiqueta ?? c.categoria,
      importe: redondear(c.importe),
    }))
    .sort((a, b) => b.importe - a.importe);
}

// ───────── Resumen general ─────────

/** Indicadores de cabecera: total vendido, número de ventas, ticket promedio, anuladas. */
export function resumenVentas(ventas) {
  const pagadas = ventasPagadas(ventas);
  return {
    totalVendido: totalVentas(pagadas),
    cantidadVentas: pagadas.length,
    ticketPromedio: ticketPromedio(pagadas),
    anuladas: ventas.length - pagadas.length,
  };
}

/** Todo el reporte de una vez (lo que usa la página). */
export function generarReporte(ventas, desde, hasta, categoriaDeProducto = {}) {
  const pagadas = ventasPagadas(filtrarPorRango(ventas, desde, hasta));
  return {
    resumen: { ...resumenVentas(filtrarPorRango(ventas, desde, hasta)) },
    porDia: ventasPorDia(pagadas, desde, hasta),
    topProductos: topProductos(pagadas, 5),
    porCategoria: ventasPorCategoria(pagadas, categoriaDeProducto),
    porMetodoPago: ventasPorMetodoPago(pagadas),
    porCajero: ventasPorCajero(pagadas),
  };
}
