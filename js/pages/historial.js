// historial.js — Historial de ventas. El cajero ve las suyas de hoy; el admin ve
// todas en un rango de fechas, con filtros, y puede anular una venta.
import { requireAuth } from "../core/guards.js";
import { listarVentasEnRango, listarVentasDeCajero, anularVenta } from "../services/ventas.js";
import { traducirError } from "../services/auth-errores.js";
import { filtrarVentas, cajerosDe, resumenItems } from "../utils/pos.js";
import { rangoDeFechas, ultimosDias, claveDia, filtrarPorRango, ventasPagadas, totalVentas } from "../utils/reportes.js";
import {
  mostrarCargando, mostrarVacio, mostrarError, finCargando, conCargando,
  reglas, validarFormulario, limpiarErrores,
  toastExito, toastError, aFecha, formatearMoneda, formatearFechaHora,
} from "../ui/index.js";

const { user, perfil } = await requireAuth();
const esAdmin = perfil.rol === "admin";

const filtros = document.getElementById("filtros");
const lista = document.getElementById("lista");
const conteo = document.getElementById("conteo");
const dlgAnular = document.getElementById("dlg-anular");
const formAnular = document.getElementById("form-anular");
const btnConfirmarAnular = document.getElementById("btn-confirmar-anular");

const NOMBRE_METODO = { efectivo: "Efectivo", tarjeta: "Tarjeta" };

let ventas = [];          // lo que devolvió la última consulta
let ventaAAnular = null;  // la venta que se está por anular

function el(etiqueta, clase, texto) {
  const nodo = document.createElement(etiqueta);
  if (clase) nodo.className = clase;
  if (texto !== undefined) nodo.textContent = texto;
  return nodo;
}

function opcion(valor, texto) {
  const o = el("option", "", texto);
  o.value = valor;
  return o;
}

// ───────── Dibujo de la tabla ─────────
function crearFila(venta) {
  const anulada = venta.estado === "anulada";
  const fila = el("tr", anulada ? "venta--anulada" : "");

  const detalle = el("td");
  detalle.append(el("span", "", resumenItems(venta.items)));
  if (venta.descuento > 0) {
    detalle.append(el("p", "venta__detalle", `Descuento ${venta.descuentoPorcentaje}%: ${venta.motivoDescuento}`));
  }
  if (anulada) {
    detalle.append(el("p", "venta__detalle venta__motivo", `Anulada: ${venta.motivoAnulacion}`));
  }

  const estado = el("td");
  estado.append(el("span", `badge ${anulada ? "badge--inactivo" : "badge--activo"}`, anulada ? "Anulada" : "Pagada"));

  const acciones = el("td", "tabla__acciones");
  if (esAdmin && !anulada) {
    const boton = el("button", "btn btn--light btn--sm", "Anular");
    boton.type = "button";
    boton.addEventListener("click", () => abrirAnular(venta));
    acciones.append(boton);
  }

  fila.append(
    el("td", "fecha", formatearFechaHora(venta.creado)),
    el("td", "", venta.cajeroNombre),
    detalle,
    el("td", "", NOMBRE_METODO[venta.metodoPago] ?? venta.metodoPago),
    el("td", "mono venta__total", formatearMoneda(venta.total)),
    estado,
    acciones
  );
  return fila;
}

function dibujar() {
  const visibles = filtrarVentas(ventas, {
    cajeroId: filtros.elements.cajero.value,
    metodoPago: filtros.elements.metodo.value,
    estado: filtros.elements.estado.value,
  });
  const anuladas = visibles.filter((v) => v.estado === "anulada").length;
  conteo.textContent =
    `${visibles.length} ${visibles.length === 1 ? "venta" : "ventas"} · ` +
    `${anuladas} ${anuladas === 1 ? "anulada" : "anuladas"} · ` +
    `Total vendido ${formatearMoneda(totalVentas(ventasPagadas(visibles)))}`;

  if (visibles.length === 0) {
    mostrarVacio(lista, { titulo: "No hay ventas", mensaje: "No se encontraron ventas con estos criterios." });
    return;
  }

  const encabezado = el("tr");
  for (const titulo of ["Fecha", "Cajero", "Detalle", "Pago", "Total", "Estado", ""]) {
    encabezado.append(el("th", "", titulo));
  }
  const cabeza = el("thead");
  cabeza.append(encabezado);
  const cuerpo = el("tbody");
  cuerpo.append(...visibles.map(crearFila));
  const tabla = el("table", "tabla");
  tabla.append(cabeza, cuerpo);
  lista.replaceChildren(tabla);
  finCargando(lista);
}

function llenarCajeros() {
  const select = filtros.elements.cajero;
  const actual = select.value;
  select.replaceChildren(
    opcion("todos", "Todos los cajeros"),
    ...cajerosDe(ventas).map((c) => opcion(c.id, c.nombre))
  );
  select.value = actual;
}

// ───────── Consulta ─────────
async function cargar() {
  let rango = null;
  if (esAdmin) {
    rango = rangoDeFechas(filtros.elements.desde.value, filtros.elements.hasta.value);
    if (rango.error) {
      toastError(rango.error);
      return;
    }
  }

  mostrarCargando(lista, "Cargando ventas…");
  try {
    if (esAdmin) {
      ventas = await listarVentasEnRango(rango.desde, rango.hasta);
    } else {
      const hoy = claveDia(new Date());
      const dia = rangoDeFechas(hoy, hoy);
      ventas = filtrarPorRango(await listarVentasDeCajero(user.uid), dia.desde, dia.hasta);
    }
    ventas.sort((a, b) => aFecha(b.creado) - aFecha(a.creado));
    llenarCajeros();
    dibujar();
  } catch (error) {
    console.error(error);
    mostrarError(lista, { titulo: "No se pudieron cargar las ventas", mensaje: traducirError(error), reintentar: cargar });
  }
}

// ───────── Anular (solo admin) ─────────
const esquemaAnulacion = {
  motivo: [
    reglas.requerido("Escribe el motivo de la anulación."),
    reglas.minLongitud(3, "El motivo debe tener al menos 3 caracteres."),
  ],
};

function abrirAnular(venta) {
  ventaAAnular = venta;
  formAnular.reset();
  limpiarErrores(formAnular);
  document.getElementById("anular-detalle").textContent =
    `Venta de ${formatearMoneda(venta.total)} (${formatearFechaHora(venta.creado)}). El stock de sus productos se devolverá.`;
  dlgAnular.showModal();
}

formAnular.addEventListener("submit", async (evento) => {
  evento.preventDefault();
  const datos = validarFormulario(formAnular, esquemaAnulacion);
  if (!datos) return;
  try {
    await conCargando(
      btnConfirmarAnular,
      () => anularVenta({ ventaId: ventaAAnular.id, motivo: datos.motivo, admin: user }),
      "Anulando…"
    );
    dlgAnular.close();
    toastExito("Venta anulada. El stock fue devuelto.");
    await cargar();
  } catch (error) {
    console.error(error);
    toastError(error.code ? "No se pudo anular la venta. Revisa tu conexión o tus permisos." : error.message);
  }
});
document.getElementById("btn-cancelar-anular").addEventListener("click", () => dlgAnular.close());

// ───────── Arranque ─────────
if (esAdmin) {
  filtros.hidden = false;
  document.getElementById("subtitulo").textContent = "Todas las ventas del café, con filtros. Puedes anular una venta con motivo.";
  filtros.addEventListener("submit", cargar);
  filtros.querySelectorAll("select").forEach((s) => s.addEventListener("change", dibujar));
  filtros.querySelectorAll("[data-dias]").forEach((btn) =>
    btn.addEventListener("click", () => {
      const { desde, hasta } = ultimosDias(Number(btn.dataset.dias));
      filtros.elements.desde.value = desde;
      filtros.elements.hasta.value = hasta;
      cargar();
    })
  );
  const inicial = ultimosDias(7);
  filtros.elements.desde.value = inicial.desde;
  filtros.elements.hasta.value = inicial.hasta;
} else {
  document.getElementById("subtitulo").textContent = "Tus ventas de hoy.";
}
cargar();
