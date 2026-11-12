import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { generarDatos, DIAS } from "../../scripts/datos-demo.mjs";
import { claveDia } from "../../js/utils/reportes.js";
import { calcularCierre } from "../../js/utils/caja.js";

// Fecha fija (local) para que la prueba no dependa del día en que se corra.
const HOY = new Date(2026, 10, 11, 12);
const { ventas, cierres } = generarDatos(HOY);

describe("datos de ejemplo (datos-demo)", () => {
  it("genera unas 30 ventas repartidas en días distintos", () => {
    assert.ok(ventas.length >= 25 && ventas.length <= 40, `hay ${ventas.length} ventas`);
    const dias = new Set(ventas.map((v) => claveDia(v.creado)));
    assert.equal(dias.size, DIAS);
  });
  it("incluye ventas anuladas con motivo y quién las anuló", () => {
    const anuladas = ventas.filter((v) => v.estado === "anulada");
    assert.ok(anuladas.length >= 2);
    for (const v of anuladas) {
      assert.ok(v.motivoAnulacion && v.anuladoPor && v.anuladoEn);
    }
  });
  it("incluye efectivo, tarjeta y ventas con descuento", () => {
    assert.ok(ventas.some((v) => v.metodoPago === "efectivo"));
    assert.ok(ventas.some((v) => v.metodoPago === "tarjeta"));
    assert.ok(ventas.some((v) => v.descuento > 0 && v.motivoDescuento));
  });
  it("cada venta es coherente: total, cambio y líneas sin repetir", () => {
    for (const v of ventas) {
      assert.ok(Math.abs(v.subtotal - v.descuento - v.total) < 0.005, v.id);
      assert.ok(v.cambio >= 0, v.id);
      assert.equal(new Set(v.items.map((i) => i.productoId)).size, v.items.length, v.id);
    }
  });
  it("los ids son únicos y ningún campo queda en undefined", () => {
    assert.equal(new Set(ventas.map((v) => v.id)).size, ventas.length);
    for (const doc of [...ventas, ...cierres]) {
      assert.ok(!Object.values(doc).includes(undefined), doc.id);
    }
  });
  it("genera 2 cierres de cajeros distintos: uno cuadra y otro tiene faltante", () => {
    assert.equal(cierres.length, 2);
    assert.notEqual(cierres[0].cajeroId, cierres[1].cajeroId);
    assert.equal(cierres[0].diferencia, 0);
    assert.ok(cierres[1].diferencia < 0);
  });
  it("los cierres coinciden con las ventas de ese cajero ese día", () => {
    for (const c of cierres) {
      const delDia = ventas.filter((v) => v.cajeroId === c.cajeroId && claveDia(v.creado) === c.fecha);
      const esperado = calcularCierre(delDia);
      assert.equal(c.ventasCount, esperado.ventasCount);
      assert.equal(c.totalEfectivo, esperado.totalEfectivo);
      assert.equal(c.totalTarjeta, esperado.totalTarjeta);
      assert.equal(c.id, `${c.cajeroId}_${c.fecha}`);
    }
  });
  it("es determinista: siempre produce los mismos datos", () => {
    assert.deepEqual(generarDatos(HOY), generarDatos(HOY));
  });
});
