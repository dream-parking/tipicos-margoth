// ventas.js — Lectura de la colección `ventas` para los reportes.
// Solo LEE: registrar y anular ventas pertenece al punto de venta. Las reglas
// de seguridad dejan leer todas las ventas únicamente a un admin activo.
import { db } from "../config/firebase.js";
import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  Timestamp,
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

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
