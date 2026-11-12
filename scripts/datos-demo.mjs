// datos-demo.mjs — Genera las ventas y cierres de EJEMPLO, sin tocar Firebase.
// Es determinista: siempre produce los mismos datos (semilla fija), así los
// reportes se ven igual en cada demo. Lo usa scripts/generar-ventas-demo.mjs.
//
// Resultado: ~30 ventas en 12 días distintos, algunas con descuento, algunas
// anuladas, y 2 cierres de caja (uno que cuadra y uno con faltante).
import { PRODUCTOS_INICIALES } from "../js/data/productos-iniciales.js";
import { redondear } from "../js/utils/pos.js";
import { calcularCierre, calcularDiferencia, idCierre } from "../js/utils/caja.js";
import { claveDia } from "../js/utils/reportes.js";

export const DIAS = 12;
export const CAJEROS = [
  { id: "demo-cajero-1", nombre: "Ana (demo)" },
  { id: "demo-cajero-2", nombre: "Luis (demo)" },
];

export function generarDatos(hoy = new Date()) {
  // Generador pseudoaleatorio con semilla fija.
  let semilla = 42;
  const azar = () => ((semilla = (semilla * 1664525 + 1013904223) % 4294967296) / 4294967296);
  const entre = (a, b) => a + Math.floor(azar() * (b - a + 1));

  function crearVenta(indice, diasAtras) {
    // Líneas del ticket; si sale el mismo producto dos veces, se juntan.
    const lineas = new Map();
    for (let i = entre(1, 4); i > 0; i--) {
      const p = PRODUCTOS_INICIALES[entre(0, PRODUCTOS_INICIALES.length - 1)];
      const cantidad = entre(1, 3);
      const previa = lineas.get(p.id);
      lineas.set(p.id, previa
        ? { ...previa, cantidad: previa.cantidad + cantidad }
        : { productoId: p.id, nombre: p.nombre, categoria: p.categoria, precio: p.precio, cantidad });
    }
    const items = [...lineas.values()];

    const subtotal = redondear(items.reduce((suma, i) => suma + i.precio * i.cantidad, 0));
    const porcentaje = indice % 5 === 0 ? 10 : 0;
    const descuento = redondear((subtotal * porcentaje) / 100);
    const total = redondear(subtotal - descuento);

    const creado = new Date(hoy);
    creado.setDate(creado.getDate() - diasAtras);
    creado.setHours(entre(8, 20), entre(0, 59), 0, 0);

    const cajero = CAJEROS[entre(0, CAJEROS.length - 1)];
    const metodoPago = azar() < 0.6 ? "efectivo" : "tarjeta";
    // En efectivo el cliente paga con billetes de $5.
    const efectivoRecibido = metodoPago === "efectivo" ? Math.ceil(total / 5) * 5 : 0;
    const anulada = indice % 7 === 0;

    return {
      id: `demo-${String(indice).padStart(3, "0")}`,
      cajeroId: cajero.id,
      cajeroNombre: cajero.nombre,
      items,
      subtotal,
      descuento,
      descuentoPorcentaje: porcentaje,
      motivoDescuento: porcentaje > 0 ? "Cliente frecuente" : "",
      total,
      metodoPago,
      efectivoRecibido,
      cambio: metodoPago === "efectivo" ? redondear(efectivoRecibido - total) : 0,
      estado: anulada ? "anulada" : "pagada",
      ...(anulada && {
        motivoAnulacion: "Error al digitar el pedido",
        anuladoPor: "demo-admin",
        anuladoEn: new Date(creado.getTime() + 10 * 60 * 1000),
      }),
      demo: true,
      creado,
    };
  }

  const ventas = [];
  let n = 0;
  for (let diasAtras = DIAS - 1; diasAtras >= 0; diasAtras--) {
    for (let i = entre(2, 3); i > 0; i--) ventas.push(crearVenta(++n, diasAtras));
  }

  // ───────── Cierres: dos cajeros distintos, en días anteriores a hoy ─────────
  const grupos = new Map(); // "cajeroId|fecha" → ventas de ese cajero ese día
  for (const v of ventas) {
    const fecha = claveDia(v.creado);
    if (fecha === claveDia(hoy)) continue;
    const clave = `${v.cajeroId}|${fecha}`;
    grupos.set(clave, [...(grupos.get(clave) ?? []), v]);
  }
  const candidatos = [...grupos.entries()]
    .map(([clave, lista]) => ({ cajeroId: lista[0].cajeroId, cajeroNombre: lista[0].cajeroNombre, fecha: clave.split("|")[1], ...calcularCierre(lista) }))
    .filter((g) => g.totalEfectivo > 0)
    .sort((a, b) => b.ventasCount - a.ventasCount || a.fecha.localeCompare(b.fecha));

  const primero = candidatos[0];
  const segundo = candidatos.find((g) => g.cajeroId !== primero?.cajeroId);
  const elegidos = [primero, segundo].filter(Boolean);

  const cierres = elegidos.map((g, posicion) => {
    // El primero cuadra exacto; el segundo tiene un faltante de $1.50.
    const efectivoContado = posicion === 0 ? g.totalEfectivo : redondear(Math.max(0, g.totalEfectivo - 1.5));
    const creado = new Date(`${g.fecha}T21:00:00`);
    return {
      id: idCierre(g.cajeroId, g.fecha),
      cajeroId: g.cajeroId,
      cajeroNombre: g.cajeroNombre,
      fecha: g.fecha,
      ventasCount: g.ventasCount,
      totalEfectivo: g.totalEfectivo,
      totalTarjeta: g.totalTarjeta,
      efectivoContado,
      diferencia: calcularDiferencia(efectivoContado, g.totalEfectivo),
      demo: true,
      creado,
    };
  });

  return { ventas, cierres };
}
