// productos.js — Acceso a datos de la colección `productos` (CRUD completo).
// Aquí NO hay nada de interfaz: solo hablar con Firestore. Las reglas de
// seguridad (firestore.rules) dejan leer a cualquiera, pero solo un admin
// activo puede crear, editar o borrar.
import { db } from "../config/firebase.js";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  increment,
  query,
  orderBy,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";
import { PRODUCTOS_INICIALES } from "../data/productos-iniciales.js";

const coleccion = collection(db, "productos");

/** Convierte un documento de Firestore en un objeto normal con su `id`. */
const aProducto = (d) => ({ id: d.id, ...d.data() });

// ───────── Leer ─────────

/** Lista todos los productos ordenados por nombre. */
export async function listarProductos() {
  const snap = await getDocs(query(coleccion, orderBy("nombre")));
  return snap.docs.map(aProducto);
}

/** Obtiene un producto por su id, o `null` si no existe. */
export async function obtenerProducto(id) {
  const snap = await getDoc(doc(db, "productos", id));
  return snap.exists() ? aProducto(snap) : null;
}

// ───────── Crear ─────────

/**
 * Crea un producto nuevo (solo admin). Firestore le asigna un id automático.
 * @returns {Promise<object>} el producto creado, con su `id`
 */
export async function crearProducto(datos) {
  const ref = await addDoc(coleccion, { ...datos, creado: serverTimestamp(), actualizado: serverTimestamp() });
  return { id: ref.id, ...datos };
}

// ───────── Actualizar ─────────

/** Reemplaza los campos indicados de un producto (solo admin). */
export async function actualizarProducto(id, cambios) {
  await updateDoc(doc(db, "productos", id), { ...cambios, actualizado: serverTimestamp() });
}

/** Activa o desactiva un producto en el menú público. */
export async function cambiarDisponibilidad(id, disponible) {
  await actualizarProducto(id, { disponible });
}

/**
 * Registra una entrada de mercadería: suma `cantidad` al stock.
 * Usa `increment`, que suma EN el servidor: si dos personas registran entradas
 * a la vez, no se pisan entre sí (a diferencia de leer, sumar y guardar).
 */
export async function registrarEntrada(id, cantidad) {
  await updateDoc(doc(db, "productos", id), { stock: increment(cantidad), actualizado: serverTimestamp() });
}

// ───────── Eliminar ─────────

/** Elimina un producto de forma permanente (solo admin). */
export async function eliminarProducto(id) {
  await deleteDoc(doc(db, "productos", id));
}

// ───────── Datos iniciales ─────────

/**
 * Carga los productos de `js/data/productos-iniciales.js` en Firestore con un
 * lote (`writeBatch`): o se guardan todos o no se guarda ninguno.
 * Como cada producto tiene un id fijo, repetir la carga no duplica nada.
 * @returns {Promise<number>} cuántos productos se cargaron
 */
export async function cargarProductosIniciales() {
  const lote = writeBatch(db);
  for (const { id, ...datos } of PRODUCTOS_INICIALES) {
    lote.set(doc(db, "productos", id), { ...datos, creado: serverTimestamp(), actualizado: serverTimestamp() });
  }
  await lote.commit();
  return PRODUCTOS_INICIALES.length;
}
