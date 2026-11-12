// pos.js — Reglas de negocio del punto de venta.
// Son funciones PURAS: reciben datos y devuelven datos. No tocan la pantalla
// ni Firebase

export const DESCUENTO_MAXIMO = 20; //porcentaje maximo permitido 
//Redondear a dos decimales 
export const redondear = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

//Un producto se puede vender si esta disponible, y si controla stock le queda
export function puedeVenderse(producto) {
    if (producto.disponible !== true) return false;
    if (producto.controlaStock && !(producto.stock > 0)) return false;
    return true;
}

//Cuantas unidades se pueden vender como maximo 
export const stockMaximo = (producto) => (producto.controlaStock ? producto.stock : Infinity);

//Unidades de un producto que ya estan en el ticket
export function cantidadEnTicket(ticket, productoId) {
    return ticket.find((linea) => linea.productoId === productoId)?.cantidad ?? 0;
}

// ¿Se puede agregar una unidad más sin pasarse del stock? 
export function puedeAgregar(ticket, producto) {
  if (!puedeVenderse(producto)) return false;
  return cantidadEnTicket(ticket, producto.id) + 1 <= stockMaximo(producto);
}

// Agrega una unidad. Devuelve un ticket NUEVO (no modifica el original)
export function agregarAlTicket(ticket, producto) {
  if (!puedeAgregar(ticket, producto)) return ticket;
  if (cantidadEnTicket(ticket, producto.id) > 0) {
    return ticket.map((linea) =>
      linea.productoId === producto.id ? { ...linea, cantidad: linea.cantidad + 1 } : linea
    );
  }
  return [...ticket, {
    productoId: producto.id,
    nombre: producto.nombre,
    categoria: producto.categoria,
    precio: producto.precio,
    cantidad: 1,
  }];
}

// Cambia la cantidad de una línea, sin pasar del máximo permitido
export function cambiarCantidad(ticket, productoId, cantidad, maximo = Infinity) {
  if (!Number.isInteger(cantidad) || cantidad < 1) return ticket;
  const valida = Math.min(cantidad, maximo);
  return ticket.map((linea) => (linea.productoId === productoId ? { ...linea, cantidad: valida } : linea));
}

// Quita una línea completa del ticket
export const quitarDelTicket = (ticket, productoId) =>
  ticket.filter((linea) => linea.productoId !== productoId);

// Subtotal, descuento (en dinero) y total. `porcentaje` va de 0 a 20
export function calcularTotales(ticket, porcentaje = 0) {
  const subtotal = redondear(ticket.reduce((suma, l) => suma + l.precio * l.cantidad, 0));
  const descuento = redondear((subtotal * porcentaje) / 100);
  return { subtotal, descuento, total: redondear(subtotal - descuento) };
}

// Devuelve el mensaje de error, o null si el descuento es válido
export function validarDescuento(porcentaje, motivo = "") {
  if (!Number.isFinite(porcentaje) || porcentaje < 0) return "El descuento debe ser un número igual o mayor a 0.";
  if (porcentaje > DESCUENTO_MAXIMO) return `El descuento máximo es ${DESCUENTO_MAXIMO}%.`;
  if (porcentaje > 0 && motivo.trim().length < 3) return "Escribe el motivo del descuento.";
  return null;
}

// Valida el cobro y calcula el cambio
export function calcularCobro(metodoPago, total, efectivoRecibido) {
  if (metodoPago === "tarjeta") return { valido: true, efectivoRecibido: 0, cambio: 0 };
  if (metodoPago !== "efectivo") return { valido: false, error: "Elige cómo paga el cliente." };
  const recibido = Number(efectivoRecibido);
  if (!Number.isFinite(recibido) || recibido < total) {
    return { valido: false, error: "El efectivo recibido debe ser igual o mayor al total." };
  }
  return { valido: true, efectivoRecibido: redondear(recibido), cambio: redondear(recibido - total) };
}

// Compara el ticket contra los productos ACTUALES de la base de datos.
// Devuelve una lista de problemas (vacía = todo bien). Se usa dentro de la
// transacción, con el stock recién leído.
export function problemasDeStock(ticket, productosPorId) {
  const problemas = [];
  for (const linea of ticket) {
    const actual = productosPorId[linea.productoId];
    if (!actual || actual.disponible !== true) {
      problemas.push(`${linea.nombre} ya no está disponible.`);
    } else if (actual.controlaStock && actual.stock < linea.cantidad) {
      problemas.push(`${linea.nombre}: quedan ${actual.stock} y pides ${linea.cantidad}.`);
    }
  }
  return problemas;
}


// ───────── Historial de ventas ─────────

const esTodos = (valor) => !valor || valor === "todos";

// Filtra por cajero, método de pago y estado ("todos" = no filtrar)
export function filtrarVentas(ventas, { cajeroId = "todos", metodoPago = "todos", estado = "todos" } = {}) {
  return ventas.filter((v) =>
    (esTodos(cajeroId) || v.cajeroId === cajeroId) &&
    (esTodos(metodoPago) || v.metodoPago === metodoPago) &&
    (esTodos(estado) || v.estado === estado)
  );
}

// Cajeros distintos que aparecen en las ventas, ordenados por nombre
export function cajerosDe(ventas) {
  const porId = new Map(ventas.map((v) => [v.cajeroId, v.cajeroNombre]));
  return [...porId]
    .map(([id, nombre]) => ({ id, nombre }))
    .sort((a, b) => (a.nombre ?? "").localeCompare(b.nombre ?? "", "es"));
}

// "2× Café de olla, 1× Flan de queso"
export function resumenItems(items = []) {
  return items.map((i) => `${i.cantidad}× ${i.nombre}`).join(", ");
}

// Al anular: nuevo stock de cada producto que controla stock
export function stockTrasAnular(items, productosPorId) {
  return items
    .filter((i) => productosPorId[i.productoId]?.controlaStock)
    .map((i) => ({ productoId: i.productoId, stock: productosPorId[i.productoId].stock + i.cantidad }));
}