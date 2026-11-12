import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  calcularCierre,
  calcularDiferencia,
  tipoDiferencia,
  idCierre,
  validarEfectivoContado,
} from "../../js/utils/caja.js";

const VENTAS = [
  { total: 10.5, metodoPago: "efectivo", estado: "pagada" },
  { total: 4.25, metodoPago: "efectivo", estado: "pagada" },
  { total: 8, metodoPago: "tarjeta", estado: "pagada" },
  { total: 99, metodoPago: "efectivo", estado: "anulada" },
];

describe("calcularCierre", () => {
  it("separa lo esperado en efectivo y en tarjeta", () => {
    assert.deepEqual(calcularCierre(VENTAS), { ventasCount: 3, totalEfectivo: 14.75, totalTarjeta: 8 });
  });
  it("no cuenta las ventas anuladas", () => {
    const soloAnulada = [{ total: 50, metodoPago: "efectivo", estado: "anulada" }];
    assert.deepEqual(calcularCierre(soloAnulada), { ventasCount: 0, totalEfectivo: 0, totalTarjeta: 0 });
  });
  it("sin ventas todo queda en cero", () => {
    assert.deepEqual(calcularCierre([]), { ventasCount: 0, totalEfectivo: 0, totalTarjeta: 0 });
  });
  it("no acumula errores de coma flotante", () => {
    const ventas = [0.1, 0.2].map((total) => ({ total, metodoPago: "efectivo", estado: "pagada" }));
    assert.equal(calcularCierre(ventas).totalEfectivo, 0.3);
  });
});

describe("calcularDiferencia y tipoDiferencia", () => {
  it("la caja cuadra cuando lo contado es igual a lo esperado", () => {
    const diferencia = calcularDiferencia(14.75, 14.75);
    assert.equal(diferencia, 0);
    assert.equal(tipoDiferencia(diferencia), "cuadra");
  });
  it("es faltante (negativa) cuando se contó menos", () => {
    const diferencia = calcularDiferencia(14.5, 14.75);
    assert.equal(diferencia, -0.25);
    assert.equal(tipoDiferencia(diferencia), "faltante");
  });
  it("es sobrante (positiva) cuando se contó más", () => {
    const diferencia = calcularDiferencia(20, 14.75);
    assert.equal(diferencia, 5.25);
    assert.equal(tipoDiferencia(diferencia), "sobrante");
  });
  it("redondea para que una diferencia de coma flotante no rompa el cuadre", () => {
    assert.equal(calcularDiferencia(0.3, 0.1 + 0.2), 0);
  });
});

describe("idCierre", () => {
  it("une cajero y fecha: es lo que impide dos cierres el mismo día", () => {
    assert.equal(idCierre("abc123", "2026-11-11"), "abc123_2026-11-11");
  });
  it("cambia con la fecha o con el cajero", () => {
    assert.notEqual(idCierre("abc", "2026-11-11"), idCierre("abc", "2026-11-12"));
    assert.notEqual(idCierre("abc", "2026-11-11"), idCierre("xyz", "2026-11-11"));
  });
});

describe("validarEfectivoContado", () => {
  it("acepta cero y montos positivos", () => {
    for (const valor of ["0", "14.75", 20, "100"]) {
      assert.equal(validarEfectivoContado(valor), null, `valor ${valor}`);
    }
  });
  it("rechaza vacío", () => {
    for (const valor of ["", null, undefined]) {
      assert.match(validarEfectivoContado(valor), /Ingresa/);
    }
  });
  it("rechaza texto y negativos", () => {
    assert.match(validarEfectivoContado("abc"), /número/);
    assert.match(validarEfectivoContado("-1"), /negativo/);
  });
});
