// caja.js — Reglas del cierre de caja (funciones puras).
import { redondear } from "./pos.js";
import { ventasPagadas } from "./reportes.js";

// Lo esperado según las ventas: cuántas, y cuánto en efectivo y en tarjeta
export function calcularCierre(ventas) {
  const pagadas = ventasPagadas(ventas);
  const sumar = (metodo) =>
    redondear(pagadas.filter((v) => v.metodoPago === metodo).reduce((suma, v) => suma + (Number(v.total) || 0), 0));
  return { ventasCount: pagadas.length, totalEfectivo: sumar("efectivo"), totalTarjeta: sumar("tarjeta") };
}

// Diferencia = lo contado menos lo esperado (negativo = falta dinero)
export const calcularDiferencia = (efectivoContado, totalEfectivo) => redondear(efectivoContado - totalEfectivo);

// "cuadra", "sobrante" o "faltante"
export function tipoDiferencia(diferencia) {
  if (diferencia === 0) return "cuadra";
  return diferencia > 0 ? "sobrante" : "faltante";
}

// Id del documento: un cierre por cajero y por día
export const idCierre = (cajeroId, fecha) => `${cajeroId}_${fecha}`;

// Devuelve el mensaje de error, o null si el monto es válido
export function validarEfectivoContado(valor) {
  if (valor === "" || valor === null || valor === undefined) return "Ingresa el efectivo contado.";
  const numero = Number(valor);
  if (!Number.isFinite(numero)) return "El efectivo contado debe ser un número.";
  if (numero < 0) return "El efectivo contado no puede ser negativo.";
  return null;
}
