// ventas.js — Acceso a la colección `ventas`: registrar (con transacción),
// y leer para reportes e historial.
import { db } from "../config/firebase.js";
import {
  collection,
  doc,
  getDocs,
  query,
  where,
  orderBy,
  Timestamp,
  runTransaction,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";
import { calcularCobro, calcularTotales, problemasDeStock, stockTrasAnular } from "../utils/pos.js"; 


const coleccion = collection(db, "ventas");

/**
 * Ventas con fecha en [desde, hasta). Pide solo ese rango a Firestore (no baja
 * toda la historia). Un único campo con rango (`creado`) no necesita índice.
 */
export async function listarVentasEnRango(desde, hasta) {
  const consulta = query(
    coleccion,
    where("creado", ">=", Timestamp.fromDate(desde)),
    where("creado", "<", Timestamp.fromDate(hasta)),
    orderBy("creado", "asc")
  );
  const snap = await getDocs(consulta);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/** 
 * Registra una venta: relee el stock, valida, descuenta y
 * crea la venta en una sola operación. Si algo falla, no se guarda nada.
 */
export async function registrarVenta({ticket, porcentaje = 0, motivoDescuento = "", metodoPago, efectivoRecibido, cajero}) {
  const {subtotal, descuento, total} = calcularTotales(ticket, porcentaje);
  const cobro = calcularCobro(metodoPago, total, efectivoRecibido);
  if (!cobro.valido) throw new Error(cobro.error);

  const ventaRef = doc(coleccion);

  await runTransaction(db, async (transaccion) => {
    // 1) LEER: el stock actual de cada producto del ticket 
    const refs = ticket.map((linea) => doc(db, "productos", linea.productoId));
    const snaps = await Promise.all(refs.map((ref) => transaccion.get(ref)));
    const productosPorId = {};
    for (const snap of snaps) {
      if (snap.exists()) productosPorId[snap.id] = snap.data();
    }

    // 2) VALIDAR con el stock recién leído
    const problemas = problemasDeStock(ticket, productosPorId);
    if (problemas.length > 0) throw new Error(problemas.join(" "));

    // 3) ESCRIBIR: Descontar stock y crear la venta
    ticket.forEach((linea, i) => {
      const actual = productosPorId[linea.productoId];
      if (actual.controlaStock) {
        transaccion.update(refs[i], {stock: actual.stock - linea.cantidad});
      }
    });

    transaccion.set(ventaRef, {
      cajeroId: cajero.uid,
      cajeroNombre: cajero.nombre,
      items: ticket,
      subtotal,
      descuento,
      descuentoPorcentaje: porcentaje,
      motivoDescuento: porcentaje > 0 ? motivoDescuento.trim() : "",
      total, 
      metodoPago, 
      efectivoRecibido: cobro.efectivoRecibido, 
      cambio: cobro.cambio, 
      estado: "pagada", 
      creado: serverTimestamp(),
    });
  });

  return { id: ventaRef.id, total, cambio: cobro.cambio };
}

/** Ventas de UN cajero (las reglas exigen filtrar por cajeroId). */
export async function listarVentasDeCajero(cajeroId) {
  const snap = await getDocs(query(coleccion, where("cajeroId", "==", cajeroId)));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * Anula una venta (solo admin): marca la venta como anulada y devuelve el
 * stock, en una sola transacción.
 */
export async function anularVenta({ ventaId, motivo, admin }) {
  const ventaRef = doc(db, "ventas", ventaId);

  await runTransaction(db, async (transaccion) => {
    // 1) LEER: la venta y los productos que vendió
    const ventaSnap = await transaccion.get(ventaRef);
    if (!ventaSnap.exists()) throw new Error("La venta no existe.");
    const venta = ventaSnap.data();
    if (venta.estado !== "pagada") throw new Error("Esta venta ya estaba anulada.");

    const refs = venta.items.map((item) => doc(db, "productos", item.productoId));
    const snaps = await Promise.all(refs.map((ref) => transaccion.get(ref)));
    const productosPorId = {};
    for (const snap of snaps) {
      if (snap.exists()) productosPorId[snap.id] = snap.data();
    }

    // 2) ESCRIBIR: devolver el stock y marcar la venta
    for (const { productoId, stock } of stockTrasAnular(venta.items, productosPorId)) {
      transaccion.update(doc(db, "productos", productoId), { stock, actualizado: serverTimestamp() });
    }
    transaccion.update(ventaRef, {
      estado: "anulada",
      motivoAnulacion: motivo.trim(),
      anuladoPor: admin.uid,
      anuladoEn: serverTimestamp(),
    });
  });
}