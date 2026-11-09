#!/usr/bin/env node
// crear-usuarios-prueba.mjs — Crea (o actualiza) los usuarios de prueba en
// Firebase Authentication y su perfil en `usuarios/{uid}` usando el Admin SDK.
// El Admin SDK ignora las reglas de seguridad, por eso es la única forma de
// crear el PRIMER administrador sin pasar por la consola.
//
// Uso:
//   GOOGLE_APPLICATION_CREDENTIALS=/ruta/cuenta-servicio.json \
//     node scripts/crear-usuarios-prueba.mjs [ruta-salida.csv]
//
// Genera contraseñas aleatorias y las escribe SOLO en el CSV de salida
// (ignorado por git). Nunca subas el CSV ni la cuenta de servicio al repo.
import { randomInt } from "node:crypto";
import { writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { initializeApp, applicationDefault } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

const PROJECT_ID = "cafe-santa-cruz";
const DOMINIO = "cafesantacruz.test";

const USUARIOS = [
  { email: `admin@${DOMINIO}`, nombre: "Administración Santa Cruz", rol: "admin", activo: true },
  { email: `cajero1@${DOMINIO}`, nombre: "Carla Martínez", rol: "cajero", activo: true },
  { email: `cajero2@${DOMINIO}`, nombre: "Diego Hernández", rol: "cajero", activo: true },
  { email: `pendiente@${DOMINIO}`, nombre: "Iván Pendiente", rol: "cajero", activo: false },
];

/** Contraseña robusta de 14 caracteres con mayúsculas, minúsculas, dígitos y símbolos. */
function generarPassword(largo = 14) {
  const grupos = ["ABCDEFGHJKLMNPQRSTUVWXYZ", "abcdefghijkmnpqrstuvwxyz", "23456789", "!#$%*+-=?@"];
  const todos = grupos.join("");
  const chars = grupos.map((g) => g[randomInt(g.length)]);
  while (chars.length < largo) chars.push(todos[randomInt(todos.length)]);
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
}

const csvCampo = (v) => (/[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));

async function main() {
  // Con emuladores (FIREBASE_AUTH_EMULATOR_HOST + FIRESTORE_EMULATOR_HOST) no hace falta credencial.
  const enEmulador = Boolean(process.env.FIREBASE_AUTH_EMULATOR_HOST && process.env.FIRESTORE_EMULATOR_HOST);
  const credencial = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!enEmulador && (!credencial || !existsSync(credencial))) {
    console.error("✕ Define GOOGLE_APPLICATION_CREDENTIALS con la ruta a la cuenta de servicio (.json).");
    console.error("  Consola de Firebase → Configuración del proyecto → Cuentas de servicio → Generar nueva clave privada.");
    process.exit(1);
  }

  const salida = resolve(process.argv[2] ?? "usuarios-prueba.csv");
  initializeApp(
    enEmulador
      ? { projectId: process.env.GCLOUD_PROJECT ?? `demo-${PROJECT_ID}` }
      : { credential: applicationDefault(), projectId: PROJECT_ID }
  );
  const auth = getAuth();
  const db = getFirestore();

  const filas = [["email", "password", "rol", "activo", "nombre"]];

  for (const u of USUARIOS) {
    const password = generarPassword();
    let registro;
    try {
      registro = await auth.getUserByEmail(u.email);
      await auth.updateUser(registro.uid, { password, displayName: u.nombre, disabled: false });
      console.log(`↻ Actualizado ${u.email}`);
    } catch (error) {
      if (error.code !== "auth/user-not-found") throw error;
      registro = await auth.createUser({ email: u.email, password, displayName: u.nombre, emailVerified: true });
      console.log(`✓ Creado ${u.email}`);
    }

    await db.doc(`usuarios/${registro.uid}`).set(
      {
        nombre: u.nombre,
        email: u.email,
        rol: u.rol,
        activo: u.activo,
        creado: FieldValue.serverTimestamp(),
      },
      { merge: false }
    );

    filas.push([u.email, password, u.rol, String(u.activo), u.nombre]);
  }

  writeFileSync(salida, filas.map((f) => f.map(csvCampo).join(",")).join("\n") + "\n", { mode: 0o600 });
  console.log(`\n✓ ${USUARIOS.length} usuarios listos. Credenciales en: ${salida}`);
  console.log("  (Este archivo está en .gitignore: entrégalo por Moodle, no lo subas al repositorio.)");
}

main().catch((error) => {
  console.error("✕ Error:", error.message);
  process.exit(1);
});
