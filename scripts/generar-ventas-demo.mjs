#!/usr/bin/env node
// generar-ventas-demo.mjs — Carga ventas y cierres de EJEMPLO en Firestore: ~30
// ventas de 12 días distintos (algunas con descuento, algunas anuladas) y 2
// cierres de caja, para que el historial y los reportes tengan qué mostrar.
// Los datos los genera scripts/datos-demo.mjs.
// Cada documento lleva `demo: true` y un id que empieza con "demo-" (las ventas)
// o con "demo-cajero" (los cierres), así se pueden borrar con:
//   node scripts/generar-ventas-demo.mjs --borrar
// Usa el Admin SDK (ignora las reglas); mismas credenciales que migrar-productos.mjs.
// Con emuladores: FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 node scripts/generar-ventas-demo.mjs
import { initializeApp, applicationDefault } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { generarDatos } from "./datos-demo.mjs";

/** Cambia los `Date` del generador por `Timestamp` de Firestore. */
const conTimestamps = ({ creado, anuladoEn, ...resto }) => ({
  ...resto,
  creado: Timestamp.fromDate(creado),
  ...(anuladoEn && { anuladoEn: Timestamp.fromDate(anuladoEn) }),
});

async function main() {
  initializeApp({ projectId: "cafe-santa-cruz", ...(process.env.FIRESTORE_EMULATOR_HOST ? {} : { credential: applicationDefault() }) });
  const db = getFirestore();
  const lote = db.batch();

  if (process.argv.includes("--borrar")) {
    let borrados = 0;
    for (const coleccion of ["ventas", "cierres"]) {
      const snap = await db.collection(coleccion).where("demo", "==", true).get();
      snap.docs.forEach((d) => lote.delete(d.ref));
      borrados += snap.size;
    }
    await lote.commit();
    console.log(`✓ ${borrados} documentos de ejemplo borrados (ventas y cierres).`);
    return;
  }

  const { ventas, cierres } = generarDatos();
  for (const { id, ...venta } of ventas) lote.set(db.collection("ventas").doc(id), conTimestamps(venta));
  for (const { id, ...cierre } of cierres) lote.set(db.collection("cierres").doc(id), conTimestamps(cierre));
  await lote.commit();

  const anuladas = ventas.filter((v) => v.estado === "anulada").length;
  console.log(`✓ ${ventas.length} ventas (${anuladas} anuladas) y ${cierres.length} cierres de ejemplo creados.`);
}

main().catch((e) => { console.error("✕", e.message); process.exit(1); });
