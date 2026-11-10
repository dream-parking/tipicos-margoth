// menu.js — Menú público: lee los productos de Firestore y los dibuja por categoría.
// No requiere sesión: las reglas de seguridad permiten leer `productos` a cualquiera.
import { listarProductos } from "../services/productos.js";
import { agruparParaMenu } from "../utils/productos.js";
import { mostrarCargando, mostrarVacio, mostrarError, finCargando } from "../ui/estados.js";
import { formatearMoneda } from "../ui/formato.js";

const contenedor = document.getElementById("menu-contenido");

function crearProducto(p) {
  const item = document.createElement("article");
  item.className = "menu-item";

  const cabeza = document.createElement("div");
  cabeza.className = "menu-item__head";
  const nombre = document.createElement("h3");
  nombre.textContent = p.nombre;
  cabeza.append(nombre);
  if (p.etiqueta) {
    const tag = document.createElement("span");
    tag.className = "menu-item__tag";
    tag.textContent = p.etiqueta;
    cabeza.append(tag);
  }

  const precio = document.createElement("span");
  precio.className = "menu-item__precio";
  precio.textContent = formatearMoneda(p.precio);

  item.append(cabeza);
  if (p.descripcion) {
    const desc = document.createElement("p");
    desc.textContent = p.descripcion;
    item.append(desc);
  }
  if (Number(p.stock) === 0) {
    const agotado = document.createElement("p");
    agotado.className = "menu-item__agotado";
    agotado.textContent = "Agotado por hoy";
    item.append(agotado);
  }
  item.append(precio);
  return item;
}

function crearCategoria({ categoria, productos }) {
  const seccion = document.createElement("div");
  seccion.className = "menu-category";

  const cabeza = document.createElement("div");
  cabeza.className = "menu-category__head";
  const icono = document.createElement("img");
  icono.className = "menu-category__icon";
  icono.src = categoria.imagen;
  icono.alt = categoria.etiqueta;
  const titulos = document.createElement("div");
  titulos.className = "menu-category__heading";
  const h2 = document.createElement("h2");
  h2.textContent = categoria.etiqueta;
  const pista = document.createElement("p");
  pista.className = "menu-category__hint";
  pista.textContent = categoria.pista;
  titulos.append(h2, pista);
  cabeza.append(icono, titulos);

  const grupo = document.createElement("div");
  grupo.className = "menu-list";
  grupo.append(...productos.map(crearProducto));

  seccion.append(cabeza, grupo);
  return seccion;
}

async function cargar() {
  mostrarCargando(contenedor, "Cargando el menú…");
  try {
    const grupos = agruparParaMenu(await listarProductos());
    if (grupos.length === 0) {
      mostrarVacio(contenedor, {
        titulo: "El menú no está disponible por ahora",
        mensaje: "Estamos actualizando la carta. Vuelve a visitarnos en unos minutos.",
      });
      return;
    }
    contenedor.replaceChildren(...grupos.map(crearCategoria));
    finCargando(contenedor);
  } catch (error) {
    console.error(error);
    mostrarError(contenedor, {
      titulo: "No pudimos cargar el menú",
      mensaje: "Revisa tu conexión e inténtalo de nuevo.",
      reintentar: cargar,
    });
  }
}

cargar();
