#!/usr/bin/env node
// generar-ventas-demo.mjs — Crea ventas de EJEMPLO de los últimos 14 días para
// poder ver el panel de reportes mientras no exista el punto de venta.
// Cada venta lleva `demo: true` y un id que empieza con "demo-", así se pueden
// borrar con:  node scripts/generar-ventas-demo.mjs --borrar
// Usa el Admin SDK (ignora las reglas); mismas credenciales que migrar-productos.mjs.
// Con emuladores: FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 node scripts/generar-ventas-demo.mjs
import { initializeApp, applicationDefault } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { PRODUCTOS_INICIALES } from "../js/data/productos-iniciales.js";

const DIAS = 14;
const CAJEROS = [
  { id: "demo-cajero-1", nombre: "Ana (demo)" },
  { id: "demo-cajero-2", nombre: "Luis (demo)" },
];

// Generador pseudoaleatorio con semilla: siempre produce las mismas ventas.
let semilla = 42;
const azar = () => ((semilla = (semilla * 1664525 + 1013904223) % 4294967296) / 4294967296);
const entre = (a, b) => a + Math.floor(azar() * (b - a + 1));

function crearVenta(indice, diasAtras) {
  const lineas = entre(1, 4);
  const items = Array.from({ length: lineas }, () => {
    const p = PRODUCTOS_INICIALES[entre(0, PRODUCTOS_INICIALES.length - 1)];
    return { productoId: p.id, nombre: p.nombre, categoria: p.categoria, precio: p.precio, cantidad: entre(1, 3) };
  });
  const total = Math.round(items.reduce((s, i) => s + i.precio * i.cantidad, 0) * 100) / 100;
  const fecha = new Date();
  fecha.setDate(fecha.getDate() - diasAtras);
  fecha.setHours(entre(8, 20), entre(0, 59), 0, 0);
  const cajero = CAJEROS[entre(0, CAJEROS.length - 1)];
  return {
    id: `demo-${String(indice).padStart(3, "0")}`,
    cajeroId: cajero.id,
    cajeroNombre: cajero.nombre,
    items,
    subtotal: total,
    descuento: 0,
    total,
    metodoPago: azar() < 0.6 ? "efectivo" : "tarjeta",
    estado: azar() < 0.05 ? "anulada" : "pagada",
    demo: true,
    creado: Timestamp.fromDate(fecha),
  };
}

async function main() {
  initializeApp({ projectId: "cafe-santa-cruz", ...(process.env.FIRESTORE_EMULATOR_HOST ? {} : { credential: applicationDefault() }) });
  const db = getFirestore();
  const lote = db.batch();
  if (process.argv.includes("--borrar")) {
    const snap = await db.collection("ventas").where("demo", "==", true).get();
    snap.docs.forEach((d) => lote.delete(d.ref));
    await lote.commit();
    console.log(`✓ ${snap.size} ventas de ejemplo borradas.`);
    return;
  }
  let n = 0;
  for (let dia = DIAS - 1; dia >= 0; dia--) {
    for (let i = entre(3, 9); i > 0; i--) {
      const { id, ...venta } = crearVenta(++n, dia);
      lote.set(db.collection("ventas").doc(id), venta);
    }
  }
  await lote.commit();
  console.log(`✓ ${n} ventas de ejemplo creadas (últimos ${DIAS} días).`);
}

main().catch((e) => { console.error("✕", e.message); process.exit(1); });
