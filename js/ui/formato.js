// formato.js — Formateo de valores para mostrar en la interfaz (puro, testeable).

const moneda = new Intl.NumberFormat("es-SV", { style: "currency", currency: "USD" });
const fecha = new Intl.DateTimeFormat("es-SV", { dateStyle: "medium" });
const fechaHora = new Intl.DateTimeFormat("es-SV", { dateStyle: "medium", timeStyle: "short" });

/** Convierte Timestamp de Firestore, Date o número a Date (o null). */
export function aFecha(valor) {
  if (!valor) return null;
  if (valor instanceof Date) return valor;
  if (typeof valor.toDate === "function") return valor.toDate();
  if (typeof valor === "number" || typeof valor === "string") return new Date(valor);
  return null;
}

export const formatearMoneda = (n) => moneda.format(Number(n) || 0);
export const formatearFecha = (v) => (aFecha(v) ? fecha.format(aFecha(v)) : "—");
export const formatearFechaHora = (v) => (aFecha(v) ? fechaHora.format(aFecha(v)) : "—");

/** Iniciales para avatares: "Ana María López" → "AL". */
export function iniciales(nombre = "") {
  const partes = nombre.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "?";
  if (partes.length === 1) return partes[0][0].toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}
