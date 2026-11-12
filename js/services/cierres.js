// cierres.js — Cierre de caja: un cierre por cajero y por día.
// El id del documento es "<uid>_<fecha>": las reglas de Firestore prohíben
// actualizar, así que un segundo cierre el mismo día es rechazado.
import { db } from "../config/firebase.js";
import {
  collection,
  doc,
  getDocs,
  query,
  where,
  setDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";
import { listarVentasDeCajero } from "./ventas.js";
import { calcularCierre, calcularDiferencia, idCierre } from "../utils/caja.js";
import { rangoDeFechas, filtrarPorRango } from "../utils/reportes.js";

const coleccion = collection(db, "cierres");

/** Cierres de UN cajero (las reglas exigen filtrar por cajeroId). */
export async function listarCierresDeCajero(cajeroId) {
  const snap = await getDocs(query(coleccion, where("cajeroId", "==", cajeroId)));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/** Todos los cierres (solo admin). */
export async function listarCierres() {
  const snap = await getDocs(coleccion);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * Cierra la caja del día: vuelve a leer las ventas, calcula lo esperado y
 * guarda el cierre con la diferencia. Devuelve el cierre guardado.
 */
export async function cerrarCaja({ cajeroId, cajeroNombre, fecha, efectivoContado }) {
  const { desde, hasta } = rangoDeFechas(fecha, fecha);
  const ventasDelDia = filtrarPorRango(await listarVentasDeCajero(cajeroId), desde, hasta);
  const esperado = calcularCierre(ventasDelDia);

  const cierre = {
    cajeroId,
    cajeroNombre,
    fecha,
    ...esperado,
    efectivoContado,
    diferencia: calcularDiferencia(efectivoContado, esperado.totalEfectivo),
  };
  await setDoc(doc(db, "cierres", idCierre(cajeroId, fecha)), { ...cierre, creado: serverTimestamp() });
  return cierre;
}
