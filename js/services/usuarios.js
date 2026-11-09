// usuarios.js — Acceso a datos de la colección `usuarios` (perfiles de empleados).
// Las reglas de Firestore solo permiten listar y modificar a un admin activo.
import { db } from "../config/firebase.js";
import {
  collection,
  doc,
  getDocs,
  updateDoc,
  query,
  orderBy,
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

const coleccion = collection(db, "usuarios");

/** Lista todos los empleados ordenados por nombre (solo admin). */
export async function listarUsuarios() {
  const snap = await getDocs(query(coleccion, orderBy("nombre")));
  return snap.docs.map((d) => ({ uid: d.id, ...d.data() }));
}

/** Cambia el rol de un empleado (solo admin, nunca a sí mismo). */
export async function cambiarRol(uid, rol) {
  await updateDoc(doc(db, "usuarios", uid), { rol });
}

/** Activa o desactiva un empleado (solo admin, nunca a sí mismo). */
export async function cambiarEstado(uid, activo) {
  await updateDoc(doc(db, "usuarios", uid), { activo });
}
