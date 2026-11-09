// usuarios.js — Acceso a datos de la colección `usuarios` (perfiles de empleados).
// Las reglas de Firestore solo permiten listar y modificar a un admin activo.
import { db, crearInstanciaTemporal } from "../config/firebase.js";
import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  orderBy,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";
import {
  createUserWithEmailAndPassword,
  updateProfile,
  signOut,
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";

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

/**
 * El admin crea la cuenta de un empleado nuevo sin perder su propia sesión.
 *
 * 1. Una instancia temporal de Firebase (sesión en memoria) crea el usuario en
 *    Authentication y su perfil como cajero inactivo: es lo único que las reglas
 *    permiten a una cuenta nueva, igual que en el registro normal.
 * 2. Con la sesión del admin se aplican el rol y el estado elegidos (las reglas
 *    solo dejan a un admin activo cambiar `rol` y `activo` de otros).
 *
 * @returns {Promise<object>} el perfil creado, con su `uid`
 */
export async function crearEmpleado({ nombre, email, password, rol, activo }) {
  const temporal = crearInstanciaTemporal();
  let uid;
  try {
    const { user } = await createUserWithEmailAndPassword(temporal.auth, email, password);
    uid = user.uid;
    try {
      await updateProfile(user, { displayName: nombre });
      await setDoc(doc(temporal.db, "usuarios", uid), {
        nombre,
        email: user.email,
        rol: "cajero",
        activo: false,
        creado: serverTimestamp(),
      });
    } catch (error) {
      // Sin perfil la cuenta quedaría huérfana: se elimina.
      await user.delete().catch(() => {});
      throw error;
    }
    await signOut(temporal.auth);
  } finally {
    await temporal.cerrar().catch(() => {});
  }

  // Paso 2: rol y estado con la sesión del admin.
  if (rol !== "cajero" || activo) {
    try {
      await updateDoc(doc(db, "usuarios", uid), { rol, activo });
    } catch (error) {
      error.parcial = true; // la cuenta existe, pero quedó como cajero pendiente
      error.uid = uid;
      throw error;
    }
  }
  return { uid, nombre, email, rol, activo, creado: new Date() };
}
