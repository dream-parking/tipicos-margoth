// caja.js — Cierre de caja: lo esperado según las ventas del día, el efectivo
// contado por el cajero y la diferencia. Un solo cierre por día.
import { requireAuth } from "../core/guards.js";
import { listarVentasDeCajero } from "../services/ventas.js";
import { listarCierresDeCajero, listarCierres, cerrarCaja } from "../services/cierres.js";
import { traducirError } from "../services/auth-errores.js";
import { calcularCierre, calcularDiferencia, tipoDiferencia, validarEfectivoContado } from "../utils/caja.js";
import { claveDia, fechaDesdeClave, rangoDeFechas, filtrarPorRango } from "../utils/reportes.js";
import {
  mostrarCargando, mostrarVacio, mostrarError, finCargando, confirmar, conCargando,
  toastExito, formatearMoneda, formatearFecha,
} from "../ui/index.js";

const { user, perfil } = await requireAuth();
const esAdmin = perfil.rol === "admin";
const hoy = claveDia(new Date());

const resumenEl = document.getElementById("resumen");
const estadoCierre = document.getElementById("estado-cierre");
const formCierre = document.getElementById("form-cierre");
const contadoInput = document.getElementById("contado");
const vistaDiferencia = document.getElementById("vista-diferencia");
const errorCierre = document.getElementById("error-cierre");
const btnCerrar = document.getElementById("btn-cerrar");
const historial = document.getElementById("historial");

let resumen = { ventasCount: 0, totalEfectivo: 0, totalTarjeta: 0 };
let cierreDeHoy = null;

const CLASE_ALERTA = { cuadra: "alerta--exito", sobrante: "alerta--aviso", faltante: "alerta--error" };

function el(etiqueta, clase, texto) {
  const nodo = document.createElement(etiqueta);
  if (clase) nodo.className = clase;
  if (texto !== undefined) nodo.textContent = texto;
  return nodo;
}

function textoDiferencia(diferencia) {
  const tipo = tipoDiferencia(diferencia);
  if (tipo === "cuadra") return "La caja cuadra: no hay diferencia.";
  return tipo === "sobrante"
    ? `Sobrante de ${formatearMoneda(diferencia)}.`
    : `Faltante de ${formatearMoneda(Math.abs(diferencia))}.`;
}

// ───────── Resumen del día ─────────
function stat(etiqueta, valor) {
  const nodo = el("div", "stat");
  nodo.append(el("p", "stat__label", etiqueta), el("p", "stat__valor", valor));
  return nodo;
}

function dibujarResumen() {
  resumenEl.replaceChildren(
    stat("Ventas del día", String(resumen.ventasCount)),
    stat("Efectivo esperado", formatearMoneda(resumen.totalEfectivo)),
    stat("Tarjeta esperada", formatearMoneda(resumen.totalTarjeta)),
    stat("Total vendido", formatearMoneda(resumen.totalEfectivo + resumen.totalTarjeta))
  );
}

// ───────── Formulario o aviso de "ya cerrada" ─────────
function dibujarEstado() {
  if (!cierreDeHoy) {
    formCierre.hidden = false;
    estadoCierre.hidden = true;
    estadoCierre.replaceChildren();
    return;
  }
  formCierre.hidden = true;
  const alerta = el(
    "p",
    `alerta ${CLASE_ALERTA[tipoDiferencia(cierreDeHoy.diferencia)]}`,
    `Caja cerrada hoy. Contaste ${formatearMoneda(cierreDeHoy.efectivoContado)} y se esperaban ` +
      `${formatearMoneda(cierreDeHoy.totalEfectivo)}. ${textoDiferencia(cierreDeHoy.diferencia)}`
  );
  estadoCierre.replaceChildren(alerta);
  estadoCierre.hidden = false;
}

function actualizarVista() {
  const error = validarEfectivoContado(contadoInput.value);
  vistaDiferencia.textContent = error
    ? "Diferencia: —"
    : `Diferencia: ${formatearMoneda(calcularDiferencia(Number(contadoInput.value), resumen.totalEfectivo))}`;
}

// ───────── Cierres anteriores ─────────
function crearFila(cierre) {
  const fila = el("tr");
  fila.append(
    el("td", "fecha", formatearFecha(fechaDesdeClave(cierre.fecha))),
    el("td", "", cierre.cajeroNombre ?? "—"),
    el("td", "mono", String(cierre.ventasCount)),
    el("td", "mono", formatearMoneda(cierre.totalEfectivo)),
    el("td", "mono", formatearMoneda(cierre.totalTarjeta)),
    el("td", "mono", formatearMoneda(cierre.efectivoContado)),
    el("td", `mono dif--${tipoDiferencia(cierre.diferencia)}`, formatearMoneda(cierre.diferencia))
  );
  return fila;
}

function dibujarHistorial(cierres) {
  if (cierres.length === 0) {
    mostrarVacio(historial, { titulo: "Aún no hay cierres", mensaje: "Los cierres de caja aparecerán aquí." });
    return;
  }
  const ordenados = [...cierres].sort((a, b) => b.fecha.localeCompare(a.fecha));
  const encabezado = el("tr");
  for (const titulo of ["Fecha", "Cajero", "Ventas", "Efectivo esperado", "Tarjeta", "Contado", "Diferencia"]) {
    encabezado.append(el("th", "", titulo));
  }
  const cabeza = el("thead");
  cabeza.append(encabezado);
  const cuerpo = el("tbody");
  cuerpo.append(...ordenados.map(crearFila));
  const tabla = el("table", "tabla");
  tabla.append(cabeza, cuerpo);
  historial.replaceChildren(tabla);
  finCargando(historial);
}

// ───────── Carga ─────────
async function cargar() {
  mostrarCargando(historial, "Cargando cierres…");
  try {
    const dia = rangoDeFechas(hoy, hoy);
    const ventasDeHoy = filtrarPorRango(await listarVentasDeCajero(user.uid), dia.desde, dia.hasta);
    resumen = calcularCierre(ventasDeHoy);

    const mios = await listarCierresDeCajero(user.uid);
    cierreDeHoy = mios.find((c) => c.fecha === hoy) ?? null;

    dibujarResumen();
    dibujarEstado();
    actualizarVista();
    dibujarHistorial(esAdmin ? await listarCierres() : mios);
  } catch (error) {
    console.error(error);
    mostrarError(historial, { titulo: "No se pudo cargar la caja", mensaje: traducirError(error), reintentar: cargar });
  }
}

// ───────── Cerrar la caja ─────────
function mostrarErrorCierre(mensaje) {
  errorCierre.textContent = mensaje;
  errorCierre.hidden = false;
}

formCierre.addEventListener("submit", async (evento) => {
  evento.preventDefault();
  errorCierre.hidden = true;

  const error = validarEfectivoContado(contadoInput.value);
  if (error) {
    mostrarErrorCierre(error);
    return;
  }
  const acepto = await confirmar({
    titulo: "¿Cerrar la caja de hoy?",
    mensaje: "Solo se permite un cierre por día. No podrás repetirlo ni corregirlo.",
    textoConfirmar: "Cerrar caja",
  });
  if (!acepto) return;

  try {
    await conCargando(
      btnCerrar,
      () => cerrarCaja({
        cajeroId: user.uid,
        cajeroNombre: perfil.nombre,
        fecha: hoy,
        efectivoContado: Number(contadoInput.value),
      }),
      "Cerrando…"
    );
    toastExito("Caja cerrada.");
  } catch (e) {
    console.error(e);
    mostrarErrorCierre(
      e.code === "permission-denied" ? "Ya cerraste la caja hoy, o tu usuario no tiene permiso." : traducirError(e)
    );
  }
  await cargar();
});

contadoInput.addEventListener("input", actualizarVista);

document.getElementById("subtitulo").textContent = esAdmin
  ? "Cuadra tu efectivo del día y revisa los cierres de todos los cajeros."
  : "Cuadra el efectivo de tu turno. Solo puedes cerrar una vez al día.";
cargar();
