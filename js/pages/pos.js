// pos.js — Pantalla del punto de venta: productos, ticket y cobro.
import { requireAuth } from "../core/guards.js";
import { listarProductos } from "../services/productos.js";
import { CATEGORIAS, filtrarProductos, ordenarProductos } from "../utils/productos.js";
import { registrarVenta } from "../services/ventas.js";
import {
  puedeVenderse, puedeAgregar, stockMaximo,
  agregarAlTicket, cambiarCantidad, quitarDelTicket,
  calcularTotales, validarDescuento, calcularCobro,
} from "../utils/pos.js";
import {
  mostrarCargando, mostrarVacio, mostrarError, finCargando,
  conCargando, toastAviso, toastExito, formatearMoneda,
} from "../ui/index.js";

const { user, perfil } = await requireAuth();

const tabs = document.getElementById("tabs");
const contenedorProductos = document.getElementById("productos");
const buscar = document.getElementById("buscar");
const lineas = document.getElementById("lineas");
const subtotalEl = document.getElementById("subtotal");
const descuentoEl = document.getElementById("descuento-monto");
const totalEl = document.getElementById("total");
const descuentoInput = document.getElementById("descuento");
const campoMotivo = document.getElementById("campo-motivo");
const motivoInput = document.getElementById("motivo");
const metodoSelect = document.getElementById("metodo");
const campoEfectivo = document.getElementById("campo-efectivo");
const recibidoInput = document.getElementById("recibido");
const cambioEl = document.getElementById("cambio");
const errorCobro = document.getElementById("error-cobro");
const btnCobrar = document.getElementById("btn-cobrar");

let productos = [];          // copia local de Firestore
let ticket = [];             // líneas de la venta en curso
let categoriaActiva = "todas";
let texto = "";
let porcentaje = 0;          // descuento

function renderTabs() {
  const opciones = [{ id: "todas", etiqueta: "Todas" }, ...CATEGORIAS];
  tabs.replaceChildren(...opciones.map((categoria) => {
    const boton = document.createElement("button");
    boton.type = "button";
    boton.className = "pos__tab";
    boton.textContent = categoria.etiqueta;
    boton.setAttribute("aria-pressed", String(categoria.id === categoriaActiva));
    boton.addEventListener("click", () => {
      categoriaActiva = categoria.id;
      renderTabs();
      renderProductos();
    });
    return boton;
  }));
}

function crearTarjeta(producto) {
  const vendible = puedeVenderse(producto);

  const boton = document.createElement("button");
  boton.type = "button";
  boton.className = "pos-producto";
  boton.disabled = !vendible;

  const nombre = document.createElement("span");
  nombre.className = "pos-producto__nombre";
  nombre.textContent = producto.nombre;

  const precio = document.createElement("span");
  precio.className = "pos-producto__precio";
  precio.textContent = formatearMoneda(producto.precio);

  boton.append(nombre, precio);

  if (!vendible) {
    const estado = document.createElement("span");
    estado.className = "pos-producto__estado";
    estado.textContent = producto.disponible === true ? "Agotado" : "No disponible";
    boton.append(estado);
  } else if (producto.controlaStock) {
    const stock = document.createElement("span");
    stock.className = "pos-producto__stock";
    stock.textContent = `${producto.stock} disponibles`;
    boton.append(stock);
  }

  boton.addEventListener("click", () => {
    if (!puedeAgregar(ticket, producto)) {
      toastAviso(`Solo hay ${producto.stock} de ${producto.nombre}.`);
      return;
    }
    ticket = agregarAlTicket(ticket, producto);
    renderTicket();
  });
  return boton;
}


function renderProductos() {
  const visibles = ordenarProductos(
    filtrarProductos(productos, { texto, categoria: categoriaActiva })
  );
  if (visibles.length === 0) {
    mostrarVacio(contenedorProductos, {
      titulo: "Sin resultados",
      mensaje: "Prueba con otra búsqueda o categoría.",
    });
    return;
  }
  const grilla = document.createElement("div");
  grilla.className = "pos__grid";
  grilla.append(...visibles.map(crearTarjeta));
  contenedorProductos.replaceChildren(grilla);
}


function crearLinea(linea) {
  const producto = productos.find((p) => p.id === linea.productoId);
  const maximo = producto ? stockMaximo(producto) : Infinity;

  const li = document.createElement("li");
  li.className = "pos-linea";

  const nombre = document.createElement("span");
  nombre.className = "pos-linea__nombre";
  nombre.textContent = linea.nombre;

  const cantidad = document.createElement("input");
  cantidad.type = "number";
  cantidad.className = "input pos-linea__cantidad";
  cantidad.min = 1;
  if (Number.isFinite(maximo)) cantidad.max = maximo;
  cantidad.value = linea.cantidad;
  cantidad.setAttribute("aria-label", `Cantidad de ${linea.nombre}`);
  cantidad.addEventListener("change", () => {
    ticket = cambiarCantidad(ticket, linea.productoId, Number(cantidad.value), maximo);
    renderTicket();
  });

  const importe = document.createElement("span");
  importe.className = "pos-linea__importe";
  importe.textContent = formatearMoneda(linea.precio * linea.cantidad);

  const quitar = document.createElement("button");
  quitar.type = "button";
  quitar.className = "btn btn--light btn--sm";
  quitar.textContent = "×";
  quitar.setAttribute("aria-label", `Quitar ${linea.nombre}`);
  quitar.addEventListener("click", () => {
    ticket = quitarDelTicket(ticket, linea.productoId);
    renderTicket();
  });

  li.append(nombre, cantidad, importe, quitar);
  return li;
}


function renderTotales() {
  const { subtotal, descuento, total } = calcularTotales(ticket, porcentaje);
  subtotalEl.textContent = formatearMoneda(subtotal);
  descuentoEl.textContent = formatearMoneda(descuento);
  totalEl.textContent = formatearMoneda(total);
}

function renderTicket() {
  if (ticket.length === 0) {
    const vacio = document.createElement("li");
    vacio.className = "pos__vacio";
    vacio.textContent = "Agrega productos para empezar.";
    lineas.replaceChildren(vacio);
  } else {
    lineas.replaceChildren(...ticket.map(crearLinea));
  }
  actualizarCobro();
}


// Lee el descuento y el método de pago, y actualiza totales y cambio en vivo
function actualizarCobro() {
  porcentaje = Number(descuentoInput.value);
  campoMotivo.hidden = !(porcentaje > 0);
  campoEfectivo.hidden = metodoSelect.value !== "efectivo";
  renderTotales();

  const { total } = calcularTotales(ticket, porcentaje);
  const cobro = calcularCobro(metodoSelect.value, total, recibidoInput.value);
  cambioEl.textContent = `Cambio: ${formatearMoneda(cobro.valido ? cobro.cambio : 0)}`;
}

function mostrarErrorCobro(mensaje) {
  errorCobro.textContent = mensaje;
  errorCobro.hidden = false;
}

// Deja la pantalla lista para la siguiente venta
function limpiarVenta() {
  ticket = [];
  descuentoInput.value = 0;
  motivoInput.value = "";
  recibidoInput.value = "";
  metodoSelect.value = "efectivo";
  renderTicket();
}

// Los errores de Firebase traen `code` y son técnicos; los de nuestro código ya vienen en español
function mensajeDeError(error) {
  return error.code
    ? "No se pudo guardar la venta. Revisa tu conexión o tus permisos."
    : error.message;
}

async function cobrar() {
  errorCobro.hidden = true;

  if (ticket.length === 0) {
    mostrarErrorCobro("El ticket está vacío.");
    return;
  }
  const errorDescuento = validarDescuento(porcentaje, motivoInput.value);
  if (errorDescuento) {
    mostrarErrorCobro(errorDescuento);
    return;
  }
  const { total } = calcularTotales(ticket, porcentaje);
  const cobro = calcularCobro(metodoSelect.value, total, recibidoInput.value);
  if (!cobro.valido) {
    mostrarErrorCobro(cobro.error);
    return;
  }

  try {
    const venta = await conCargando(btnCobrar, () => registrarVenta({
      ticket,
      porcentaje,
      motivoDescuento: motivoInput.value,
      metodoPago: metodoSelect.value,
      efectivoRecibido: recibidoInput.value,
      cajero: { uid: user.uid, nombre: perfil.nombre },
    }), "Cobrando…");

    const cambio = metodoSelect.value === "efectivo" ? ` · Cambio ${formatearMoneda(venta.cambio)}` : "";
    toastExito(`Venta registrada: ${formatearMoneda(venta.total)}${cambio}`, 8000);
    limpiarVenta();
    await cargar();
  } catch (error) {
    console.error(error);
    mostrarErrorCobro(mensajeDeError(error));
    await cargar();
    renderTicket();
  }
}

async function cargar() {
  mostrarCargando(contenedorProductos, "Cargando productos…");
  try {
    productos = await listarProductos();
    renderTabs();
    renderProductos();
    finCargando(contenedorProductos);
  } catch (error) {
    console.error(error);
    mostrarError(contenedorProductos, {
      titulo: "No pudimos cargar los productos",
      mensaje: "Revisa tu conexión e inténtalo de nuevo.",
      reintentar: cargar,
    });
  }
}

buscar.addEventListener("input", () => {
  texto = buscar.value;
  renderProductos();
});

descuentoInput.addEventListener("input", actualizarCobro);
metodoSelect.addEventListener("change", actualizarCobro);
recibidoInput.addEventListener("input", actualizarCobro);
btnCobrar.addEventListener("click", cobrar);

renderTicket();
cargar();