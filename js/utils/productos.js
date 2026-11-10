// productos.js — Lógica de negocio pura sobre el catálogo: categorías, validación,
// búsqueda, filtros, orden, conteos e indicadores de inventario.
// No depende del DOM ni de Firebase, por eso se prueba con `node --test`.
import { normalizar } from "./empleados.js";
import { reglas } from "../ui/validation.js";

// ───────── Categorías ─────────
// El `id` es lo que se guarda en Firestore; `etiqueta` es lo que ve la persona.
export const CATEGORIAS = [
  { id: "cafe-caliente", etiqueta: "Café & bebidas calientes", pista: "Con grano salvadoreño de altura", imagen: "img/cafeolla.jpg" },
  { id: "bebidas-frias", etiqueta: "Bebidas frías & cocteles", pista: "Para acompañar la vista", imagen: "img/horchata.jpeg" },
  { id: "comida", etiqueta: "Comida típica & carnes", pista: "Platillos fuertes para disfrutar", imagen: "img/comida3.jpg" },
  { id: "postres", etiqueta: "Postres artesanales", pista: "Para cerrar con dulce", imagen: "img/tresLeches.jpg" },
];

export const IDS_CATEGORIAS = CATEGORIAS.map((c) => c.id);

/** Devuelve la categoría completa a partir de su id (o undefined). */
export function categoriaPorId(id) {
  return CATEGORIAS.find((c) => c.id === id);
}

/** Texto legible de una categoría; si el id no existe devuelve el id tal cual. */
export function etiquetaCategoria(id) {
  return categoriaPorId(id)?.etiqueta ?? id ?? "—";
}

// ───────── Validación del formulario ─────────

/** Regla entre campos: el stock mínimo no puede ser mayor que el stock actual. */
export const stockMinimoNoMayorQueStock =
  (mensaje = "El stock mínimo no puede ser mayor que el stock actual.") =>
  (valor, valores) => {
    const minimo = Number(valor);
    const stock = Number(valores.stock);
    if (valor === "" || valores.stock === "" || !Number.isFinite(minimo) || !Number.isFinite(stock)) return null;
    return minimo <= stock ? null : mensaje;
  };

/** Esquema del formulario de producto: { campo: [reglas...] } (ver ui/validation.js). */
export const esquemaProducto = {
  nombre: [
    reglas.requerido("Ingresa el nombre del producto."),
    reglas.minLongitud(2, "El nombre debe tener al menos 2 caracteres."),
    reglas.maxLongitud(80, "El nombre debe tener como máximo 80 caracteres."),
  ],
  descripcion: [reglas.maxLongitud(200, "La descripción debe tener como máximo 200 caracteres.")],
  etiqueta: [reglas.maxLongitud(30, "La etiqueta debe tener como máximo 30 caracteres.")],
  categoria: [reglas.requerido("Elige una categoría."), reglas.enLista(IDS_CATEGORIAS, "Elige una categoría válida.")],
  precio: [
    reglas.requerido("Ingresa el precio."),
    reglas.numero("El precio debe ser un número."),
    reglas.mayorQue(0, "El precio debe ser mayor que 0."),
    reglas.maximo(999.99, "El precio no puede superar $999.99."),
  ],
  stock: [
    reglas.requerido("Ingresa el stock."),
    reglas.entero("El stock debe ser un número entero."),
    reglas.minimo(0, "El stock no puede ser negativo."),
  ],
  stockMinimo: [
    reglas.requerido("Ingresa el stock mínimo."),
    reglas.entero("El stock mínimo debe ser un número entero."),
    reglas.minimo(0, "El stock mínimo no puede ser negativo."),
    stockMinimoNoMayorQueStock(),
  ],
};

/** Esquema del formulario de entrada de mercadería. */
export const esquemaEntrada = {
  cantidad: [
    reglas.requerido("Ingresa la cantidad que entra."),
    reglas.entero("La cantidad debe ser un número entero."),
    reglas.mayorQue(0, "La cantidad debe ser mayor que 0."),
    reglas.maximo(10000, "La cantidad no puede superar 10,000."),
  ],
};

/**
 * Convierte lo que devuelve el formulario (todo texto) en un producto listo
 * para guardar, con los tipos correctos (números y booleanos).
 */
export function datosAProducto(datos) {
  return {
    nombre: datos.nombre.trim(),
    descripcion: (datos.descripcion ?? "").trim(),
    etiqueta: (datos.etiqueta ?? "").trim(),
    categoria: datos.categoria,
    precio: Math.round(Number(datos.precio) * 100) / 100,
    stock: Number(datos.stock),
    stockMinimo: Number(datos.stockMinimo),
    disponible: datos.disponible === true,
    controlaStock: true,
  };
}

// ───────── Inventario ─────────

/** Un producto está en "stock bajo" cuando su stock llegó al mínimo o por debajo. */
export function esStockBajo(producto) {
  if (!producto || producto.controlaStock === false) return false;
  return Number(producto.stock) <= Number(producto.stockMinimo);
}

/** Suma una entrada de mercadería al stock actual (no modifica el producto). */
export function sumarStock(producto, cantidad) {
  const n = Number(cantidad);
  if (!Number.isInteger(n) || n <= 0) throw new RangeError("La cantidad debe ser un entero mayor que 0.");
  return Number(producto.stock) + n;
}

/** Indicadores para las tarjetas de resumen. */
export function resumenInventario(lista) {
  return lista.reduce(
    (acc, p) => {
      acc.total += 1;
      if (p.disponible) acc.disponibles += 1;
      if (esStockBajo(p)) acc.bajoStock += 1;
      if (Number(p.stock) === 0) acc.agotados += 1;
      acc.valorInventario += (Number(p.precio) || 0) * (Number(p.stock) || 0);
      return acc;
    },
    { total: 0, disponibles: 0, bajoStock: 0, agotados: 0, valorInventario: 0 }
  );
}

// ───────── Búsqueda, filtros, orden y conteos ─────────

/**
 * Filtra por texto (nombre o descripción, sin tildes ni mayúsculas), categoría
 * ("todas" o un id), disponibilidad ("todas" | "si" | "no") y "solo bajo stock".
 */
export function filtrarProductos(
  lista,
  { texto = "", categoria = "todas", disponibilidad = "todas", soloBajoStock = false } = {}
) {
  const busqueda = normalizar(texto);
  return lista.filter((p) => {
    const coincideTexto =
      !busqueda || normalizar(p.nombre).includes(busqueda) || normalizar(p.descripcion).includes(busqueda);
    const coincideCategoria = categoria === "todas" || p.categoria === categoria;
    const coincideDisp =
      disponibilidad === "todas" || (disponibilidad === "si" ? p.disponible === true : p.disponible !== true);
    const coincideStock = !soloBajoStock || esStockBajo(p);
    return coincideTexto && coincideCategoria && coincideDisp && coincideStock;
  });
}

const porNombre = (a, b) => normalizar(a.nombre).localeCompare(normalizar(b.nombre), "es");

/** Criterios de orden disponibles en la interfaz. */
export const CRITERIOS_ORDEN = {
  "nombre-asc": { etiqueta: "Nombre (A-Z)", comparar: porNombre },
  "precio-asc": { etiqueta: "Precio (menor a mayor)", comparar: (a, b) => a.precio - b.precio || porNombre(a, b) },
  "precio-desc": { etiqueta: "Precio (mayor a menor)", comparar: (a, b) => b.precio - a.precio || porNombre(a, b) },
  "stock-asc": { etiqueta: "Stock (menor a mayor)", comparar: (a, b) => a.stock - b.stock || porNombre(a, b) },
  "stock-desc": { etiqueta: "Stock (mayor a menor)", comparar: (a, b) => b.stock - a.stock || porNombre(a, b) },
};

/** Ordena una copia de la lista según el criterio; no muta la original. */
export function ordenarProductos(lista, criterio = "nombre-asc") {
  const { comparar } = CRITERIOS_ORDEN[criterio] ?? CRITERIOS_ORDEN["nombre-asc"];
  return [...lista].sort(comparar);
}

/** Cuenta productos por categoría: { "postres": 4, ... } (incluye categorías en 0). */
export function contarPorCategoria(lista) {
  const conteo = Object.fromEntries(IDS_CATEGORIAS.map((id) => [id, 0]));
  for (const p of lista) conteo[p.categoria] = (conteo[p.categoria] ?? 0) + 1;
  return conteo;
}

// ───────── Menú público ─────────

/**
 * Agrupa los productos disponibles por categoría, en el orden de CATEGORIAS.
 * Dentro de cada categoría respeta `orden` (si existe) y luego el nombre.
 * Las categorías sin productos no aparecen.
 * @returns {{ categoria: object, productos: object[] }[]}
 */
export function agruparParaMenu(lista) {
  const orden = (p) => (Number.isFinite(p.orden) ? p.orden : Infinity);
  return CATEGORIAS.map((categoria) => ({
    categoria,
    productos: lista
      .filter((p) => p.categoria === categoria.id && p.disponible === true)
      .sort((a, b) => orden(a) - orden(b) || porNombre(a, b)),
  })).filter((g) => g.productos.length > 0);
}
