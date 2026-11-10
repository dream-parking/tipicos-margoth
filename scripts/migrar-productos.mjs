#!/usr/bin/env node
// migrar-productos.mjs — Carga en Firestore los productos iniciales (los que
// estaban escritos a mano en menu.html) usando el Admin SDK.
// El Admin SDK ignora las reglas de seguridad, igual que crear-usuarios-prueba.mjs.
//
// Uso (cualquiera de las dos credenciales):
//   gcloud auth application-default login && node scripts/migrar-productos.mjs
//   GOOGLE_APPLICATION_CREDENTIALS=/ruta/cuenta-servicio.json node scripts/migrar-productos.mjs
//
// Con emuladores: FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 node scripts/migrar-productos.mjs
//
// Es seguro ejecutarlo varias veces: cada producto tiene un id fijo, así que
// se sobrescribe en lugar de duplicarse. (Alternativa sin terminal: el botón
// "Cargar datos iniciales" del panel de catálogo hace lo mismo.)
import { existsSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { initializeApp, applicationDefault } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { PRODUCTOS_INICIALES } from "../js/data/productos-iniciales.js";

const PROJECT_ID = "cafe-santa-cruz";

async function main() {
  const enEmulador = Boolean(process.env.FIRESTORE_EMULATOR_HOST);
  const adcGcloud = join(homedir(), ".config", "gcloud", "application_default_credentials.json");
  const credencial = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  const hayCredencial = credencial ? existsSync(credencial) : existsSync(adcGcloud);
  if (!enEmulador && !hayCredencial) {
    console.error("✕ No se encontraron credenciales de Google. Opciones:");
    console.error("  a) gcloud auth application-default login");
    console.error("     gcloud auth application-default set-quota-project cafe-santa-cruz");
    console.error("  b) GOOGLE_APPLICATION_CREDENTIALS=/ruta/cuenta-servicio.json");
    process.exit(1);
  }

  initializeApp(
    enEmulador
      ? { projectId: process.env.GCLOUD_PROJECT ?? `demo-${PROJECT_ID}` }
      : { credential: applicationDefault(), projectId: PROJECT_ID }
  );
  const db = getFirestore();

  const lote = db.batch();
  for (const { id, ...datos } of PRODUCTOS_INICIALES) {
    lote.set(db.doc(`productos/${id}`), {
      ...datos,
      creado: FieldValue.serverTimestamp(),
      actualizado: FieldValue.serverTimestamp(),
    });
  }
  await lote.commit();

  console.log(`✓ ${PRODUCTOS_INICIALES.length} productos cargados en ${enEmulador ? "el emulador" : PROJECT_ID}.`);
}

main().catch((error) => {
  console.error("✕ Error:", error.message);
  process.exit(1);
});
