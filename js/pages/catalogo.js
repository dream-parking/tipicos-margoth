// catalogo.js — Catálogo e inventario (solo admin): tabla de productos, alta y
// edición, validaciones, disponibilidad, eliminación con confirmación, entrada
// de mercadería, aviso de stock bajo, búsqueda, filtros y orden.
import { requireRole } from "../core/guards.js";
import {
  listarProductos,
  crearProducto,
  actualizarProducto,
  cambiarDisponibilidad,
  registrarEntrada,
  eliminarProducto,
  cargarProductosIniciales,
} from "../services/productos.js";
import { traducirError } from "../services/auth-errores.js";
import {
  CATEGORIAS,
  CRITERIOS_ORDEN,
  esquemaProducto,
  esquemaEntrada,
  datosAProducto,
  esStockBajo,
  sumarStock,
  resumenInventario,
  filtrarProductos,
  ordenarProductos,
  contarPorCategoria,
  etiquetaCategoria,
} from "../utils/productos.js";
import { normalizar } from "../utils/empleados.js";
import {
  mostrarCargando,
  mostrarVacio,
  mostrarError,
  finCargando,
  confirmar,
  toastExito,
  toastError,
  leerFormulario,
  validarFormulario,
  mostrarErrores,
  limpiarErrores,
  conCargando,
  formatearMoneda,
} from "../ui/index.js";

await requireRole("admin");

const lista = document.getElementById("lista");
const resumen = document.getElementById("resumen");
const conteo = document.getElementById("conteo");
const filtros = document.getElementById("filtros");
const chipsCategorias = document.getElementById("categorias");

/** Todos los productos tal como están en Firestore (la "copia local"). */
let productos = [];

// ───────── Selects que se llenan desde los datos ─────────
function opcion(valor, texto) {
  const o = document.createElement("option");
  o.value = valor;
  o.textContent = texto;
  return o;
}

function llenarSelects() {
  const filtroCategoria = document.getElementById("filtro-categoria");
  filtroCategoria.append(opcion("todas", "Todas las categorías"));
  CATEGORIAS.forEach((c) => filtroCategoria.append(opcion(c.id, c.etiqueta)));

  const orden = document.getElementById("orden");
  Object.entries(CRITERIOS_ORDEN).forEach(([id, { etiqueta }]) => orden.append(opcion(id, etiqueta)));

  const formCategoria = document.getElementById("prod-categoria");
  formCategoria.append(opcion("", "Elige una categoría"));
  CATEGORIAS.forEach((c) => formCategoria.append(opcion(c.id, c.etiqueta)));
}

// ───────── Carga de datos ─────────
async function cargar() {
  mostrarCargando(lista, "Cargando productos…");
  conteo.textContent = "";
  try {
    productos = await listarProductos();
    render();
  } catch (error) {
    console.error(error);
    resumen.replaceChildren();
    chipsCategorias.replaceChildren();
    mostrarError(lista, {
      titulo: "No se pudo cargar el catálogo",
      mensaje: traducirError(error),
      reintentar: cargar,
    });
  }
}

// ───────── Render ─────────
const ICONO_BUSCAR =
  '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2"/></svg>';

function render() {
  renderResumen();
  renderConteoCategorias();

  const { orden, ...criterios } = leerFormulario(filtros);
  const visibles = ordenarProductos(filtrarProductos(productos, criterios), orden);
  conteo.textContent = `Mostrando ${visibles.length} de ${productos.length} productos`;

  if (productos.length === 0) {
    renderCatalogoVacio();
    return;
  }
  if (visibles.length === 0) {
    mostrarVacio(lista, { icono: ICONO_BUSCAR, titulo: "Sin resultados", mensaje: "Prueba con otra búsqueda o quita los filtros." });
    return;
  }

  const tabla = document.createElement("table");
  tabla.className = "tabla tabla--responsive";
  tabla.innerHTML = `
    <thead><tr>
      <th scope="col">Producto</th><th scope="col">Categoría</th><th scope="col">Precio</th>
      <th scope="col">Stock</th><th scope="col">Estado</th><th scope="col">Acciones</th>
    </tr></thead>`;
  const tbody = document.createElement("tbody");
  visibles.forEach((p) => tbody.append(filaProducto(p)));
  tabla.append(tbody);
  lista.replaceChildren(tabla);
  finCargando(lista);
}

function renderCatalogoVacio() {
  mostrarVacio(lista, {
    titulo: "Aún no hay productos",
    mensaje: "Crea el primero o carga los productos que estaban en el menú del sitio.",
  });
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "btn btn--secondary btn--sm";
  btn.textContent = "Cargar datos iniciales";
  btn.addEventListener("click", () => onCargarIniciales(btn));
  lista.querySelector(".estado").append(btn);
}

function renderResumen() {
  const r = resumenInventario(productos);
  const datos = [
    ["Productos", r.total, false],
    ["Disponibles", r.disponibles, false],
    ["Bajo stock", r.bajoStock, r.bajoStock > 0],
    ["Valor del inventario", formatearMoneda(r.valorInventario), false],
  ];
  resumen.replaceChildren(
    ...datos.map(([label, valor, alerta]) => {
      const card = document.createElement("div");
      card.className = alerta ? "stat stat--alerta" : "stat";
      card.innerHTML = `<div class="stat__label"></div><div class="stat__valor"></div>`;
      card.querySelector(".stat__valor").textContent = valor;
      card.querySelector(".stat__label").textContent = label;
      return card;
    })
  );
}

function renderConteoCategorias() {
  const porCategoria = contarPorCategoria(productos);
  chipsCategorias.replaceChildren(
    ...CATEGORIAS.map((c) => {
      const li = document.createElement("li");
      const n = document.createElement("strong");
      n.textContent = porCategoria[c.id];
      li.append(n, ` ${c.etiqueta}`);
      return li;
    })
  );
}

function celda(label, ...hijos) {
  const td = document.createElement("td");
  td.dataset.label = label;
  td.append(...hijos);
  return td;
}

function badge(texto, variante) {
  const span = document.createElement("span");
  span.className = `badge badge--${variante}`;
  span.textContent = texto;
  return span;
}

function botonAccion(texto, clase, alHacerClic, ariaLabel) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = `btn btn--sm ${clase}`;
  btn.textContent = texto;
  if (ariaLabel) btn.setAttribute("aria-label", ariaLabel);
  btn.addEventListener("click", () => alHacerClic(btn));
  return btn;
}

function filaProducto(p) {
  const tr = document.createElement("tr");
  if (esStockBajo(p)) tr.classList.add("fila--bajo");

  // Producto: nombre, etiqueta y descripción corta
  const info = document.createElement("div");
  const nombre = document.createElement("div");
  nombre.className = "persona__nombre";
  nombre.textContent = p.nombre;
  info.append(nombre);
  if (p.etiqueta) {
    const etiqueta = document.createElement("span");
    etiqueta.className = "producto__etiqueta";
    etiqueta.textContent = p.etiqueta;
    nombre.append(" ", etiqueta);
  }
  if (p.descripcion) {
    const desc = document.createElement("div");
    desc.className = "persona__email";
    desc.textContent = p.descripcion;
    info.append(desc);
  }

  // Precio
  const precio = document.createElement("span");
  precio.className = "mono";
  precio.textContent = formatearMoneda(p.precio);

  // Stock con marca de "bajo" o "agotado"
  const stock = document.createElement("div");
  stock.className = "stock";
  const cantidad = document.createElement("span");
  cantidad.className = "mono";
  cantidad.textContent = p.stock;
  const minimo = document.createElement("span");
  minimo.className = "stock__minimo";
  minimo.textContent = `mín. ${p.stockMinimo}`;
  stock.append(cantidad, minimo);
  if (Number(p.stock) === 0) stock.append(badge("Agotado", "bajo"));
  else if (esStockBajo(p)) stock.append(badge("Stock bajo", "bajo"));

  // Estado
  const estado = p.disponible ? badge("Disponible", "activo") : badge("No disponible", "inactivo");

  // Acciones
  const acciones = document.createElement("div");
  acciones.className = "tabla__acciones";
  acciones.append(
    botonAccion("Editar", "btn--light", () => abrirProducto(p), `Editar ${p.nombre}`),
    botonAccion("Entrada", "btn--light", () => abrirEntrada(p), `Registrar entrada de ${p.nombre}`),
    botonAccion(
      p.disponible ? "Ocultar" : "Mostrar",
      "btn--light",
      (btn) => onCambiarDisponibilidad(p, btn),
      `${p.disponible ? "Ocultar" : "Mostrar"} ${p.nombre} en el menú`
    ),
    botonAccion("Eliminar", "btn--danger", () => onEliminar(p), `Eliminar ${p.nombre}`)
  );

  tr.append(
    celda("Producto", info),
    celda("Categoría", etiquetaCategoria(p.categoria)),
    celda("Precio", precio),
    celda("Stock", stock),
    celda("Estado", estado),
    celda("Acciones", acciones)
  );
  return tr;
}

// ───────── Acciones directas ─────────
async function onCambiarDisponibilidad(producto, boton) {
  const nuevo = !producto.disponible;
  boton.disabled = true;
  try {
    await cambiarDisponibilidad(producto.id, nuevo);
    producto.disponible = nuevo;
    toastExito(`${producto.nombre} ${nuevo ? "ya está disponible en el menú" : "se ocultó del menú"}.`);
  } catch (error) {
    console.error(error);
    toastError(traducirError(error));
  }
  render();
}

async function onEliminar(producto) {
  const ok = await confirmar({
    titulo: "Eliminar producto",
    mensaje: `¿Eliminar "${producto.nombre}"? Esta acción no se puede deshacer. Si solo quieres quitarlo del menú, usa "Ocultar".`,
    textoConfirmar: "Eliminar",
    peligro: true,
  });
  if (!ok) return;
  try {
    await eliminarProducto(producto.id);
    productos = productos.filter((p) => p.id !== producto.id);
    toastExito(`"${producto.nombre}" se eliminó del catálogo.`);
  } catch (error) {
    console.error(error);
    toastError(traducirError(error));
  }
  render();
}

async function onCargarIniciales(boton) {
  try {
    const n = await conCargando(boton, cargarProductosIniciales, "Cargando…");
    toastExito(`Se cargaron ${n} productos iniciales.`);
    await cargar();
  } catch (error) {
    console.error(error);
    toastError(traducirError(error));
  }
}

// ───────── Crear / editar ─────────
const dlgProducto = document.getElementById("dlg-producto");
const formProducto = document.getElementById("form-producto");
/** Producto que se está editando; `null` cuando se está creando uno nuevo. */
let enEdicion = null;

function abrirProducto(producto = null) {
  enEdicion = producto;
  formProducto.reset();
  limpiarErrores(formProducto);
  document.getElementById("dlg-producto-eyebrow").textContent = producto ? "Editar producto" : "Nuevo producto";
  document.getElementById("dlg-producto-titulo").textContent = producto ? producto.nombre : "Crear producto";
  if (producto) {
    formProducto.nombre.value = producto.nombre;
    formProducto.descripcion.value = producto.descripcion ?? "";
    formProducto.etiqueta.value = producto.etiqueta ?? "";
    formProducto.categoria.value = producto.categoria;
    formProducto.precio.value = producto.precio;
    formProducto.stock.value = producto.stock;
    formProducto.stockMinimo.value = producto.stockMinimo;
    formProducto.disponible.checked = producto.disponible === true;
  }
  dlgProducto.showModal();
  formProducto.nombre.focus();
}

formProducto.addEventListener("submit", async (evento) => {
  evento.preventDefault();
  const datos = validarFormulario(formProducto, esquemaProducto);
  if (!datos) return;
  const producto = datosAProducto(datos);

  // Regla de negocio: no repetir el mismo nombre dentro de una categoría.
  const repetido = productos.some(
    (p) =>
      p.id !== enEdicion?.id &&
      p.categoria === producto.categoria &&
      normalizar(p.nombre) === normalizar(producto.nombre)
  );
  if (repetido) {
    mostrarErrores(formProducto, { nombre: "Ya existe un producto con ese nombre en esa categoría." });
    return;
  }

  const boton = document.getElementById("btn-guardar-producto");
  try {
    if (enEdicion) {
      await conCargando(boton, () => actualizarProducto(enEdicion.id, producto), "Guardando…");
      Object.assign(enEdicion, producto);
      toastExito(`"${producto.nombre}" se actualizó.`);
    } else {
      const nuevo = await conCargando(boton, () => crearProducto(producto), "Guardando…");
      productos.push(nuevo);
      toastExito(`"${producto.nombre}" se agregó al catálogo.`);
    }
    dlgProducto.close();
    render();
  } catch (error) {
    console.error(error);
    toastError(traducirError(error));
  }
});

// ───────── Entrada de mercadería ─────────
const dlgEntrada = document.getElementById("dlg-entrada");
const formEntrada = document.getElementById("form-entrada");
let productoEntrada = null;

function abrirEntrada(producto) {
  productoEntrada = producto;
  formEntrada.reset();
  limpiarErrores(formEntrada);
  document.getElementById("entrada-detalle").textContent =
    `${producto.nombre} · stock actual: ${producto.stock}. La cantidad se suma al stock existente.`;
  dlgEntrada.showModal();
  formEntrada.cantidad.focus();
}

formEntrada.addEventListener("submit", async (evento) => {
  evento.preventDefault();
  const datos = validarFormulario(formEntrada, esquemaEntrada);
  if (!datos) return;
  const cantidad = Number(datos.cantidad);

  const boton = formEntrada.querySelector('button[type="submit"]');
  try {
    await conCargando(boton, () => registrarEntrada(productoEntrada.id, cantidad), "Guardando…");
    productoEntrada.stock = sumarStock(productoEntrada, cantidad);
    dlgEntrada.close();
    toastExito(`Entrada registrada: ${productoEntrada.nombre} ahora tiene ${productoEntrada.stock} en stock.`);
    render();
  } catch (error) {
    console.error(error);
    toastError(traducirError(error));
  }
});

// ───────── Eventos ─────────
document.getElementById("btn-crear").addEventListener("click", () => abrirProducto());
document.getElementById("btn-cancelar-producto").addEventListener("click", () => dlgProducto.close());
document.getElementById("btn-cancelar-entrada").addEventListener("click", () => dlgEntrada.close());
document.getElementById("btn-recargar").addEventListener("click", cargar);
filtros.addEventListener("input", render);
filtros.addEventListener("change", render);

llenarSelects();
cargar();
