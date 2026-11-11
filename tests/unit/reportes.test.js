import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  claveDia,
  fechaDesdeClave,
  rangoDeFechas,
  ultimosDias,
  ventasPagadas,
  filtrarPorRango,
  totalVentas,
  ticketPromedio,
  ventasPorDia,
  ventasPorMetodoPago,
  ventasPorCajero,
  topProductos,
  ventasPorCategoria,
  resumenVentas,
  generarReporte,
} from "../../js/utils/reportes.js";

// Fechas locales (new Date(año, mes-1, día, hora)) para no depender de la zona horaria.
const f = (d, h = 10) => new Date(2026, 4, d, h);

const VENTAS = [
  { id: "1", cajeroId: "u1", cajeroNombre: "Ana", total: 10, metodoPago: "efectivo", estado: "pagada", creado: f(1),
    items: [{ productoId: "a", nombre: "Café", categoria: "cafe-caliente", precio: 2.5, cantidad: 2 }, { productoId: "b", nombre: "Flan", categoria: "postres", precio: 5, cantidad: 1 }] },
  { id: "2", cajeroId: "u2", cajeroNombre: "Luis", total: 7.5, metodoPago: "tarjeta", estado: "pagada", creado: f(1, 15),
    items: [{ productoId: "a", nombre: "Café", categoria: "cafe-caliente", precio: 2.5, cantidad: 3 }] },
  { id: "3", cajeroId: "u1", cajeroNombre: "Ana", total: 6, metodoPago: "efectivo", estado: "pagada", creado: f(3),
    items: [{ productoId: "c", nombre: "Bellini", precio: 6, cantidad: 1 }] },
  { id: "4", cajeroId: "u1", cajeroNombre: "Ana", total: 99, metodoPago: "efectivo", estado: "anulada", creado: f(3, 12),
    items: [{ productoId: "a", nombre: "Café", categoria: "cafe-caliente", precio: 2.5, cantidad: 40 }] },
];

describe("fechas", () => {
  it("claveDia y fechaDesdeClave son inversas", () => {
    assert.equal(claveDia(f(7)), "2026-05-07");
    assert.equal(claveDia(fechaDesdeClave("2026-05-07")), "2026-05-07");
  });
  it("fechaDesdeClave rechaza formatos y fechas imposibles", () => {
    for (const x of ["", null, "07/05/2026", "2026-02-31", "2026-13-01"]) assert.equal(fechaDesdeClave(x), null, String(x));
  });
  it("rangoDeFechas deja el día final dentro y el siguiente fuera", () => {
    const { desde, hasta } = rangoDeFechas("2026-05-01", "2026-05-03");
    assert.equal(claveDia(desde), "2026-05-01");
    assert.equal(claveDia(hasta), "2026-05-04");
  });
  it("rangoDeFechas valida", () => {
    assert.ok(rangoDeFechas("", "2026-05-03").error);
    assert.match(rangoDeFechas("2026-05-05", "2026-05-03").error, /anterior/);
    assert.equal(rangoDeFechas("2026-05-03", "2026-05-03").error, undefined);
  });
  it("ultimosDias cuenta hoy como el último día", () => {
    assert.deepEqual(ultimosDias(7, f(10)), { desde: "2026-05-04", hasta: "2026-05-10" });
    assert.deepEqual(ultimosDias(1, f(10)), { desde: "2026-05-10", hasta: "2026-05-10" });
  });
});

describe("base de cálculo", () => {
  it("ventasPagadas descarta las anuladas", () => {
    assert.deepEqual(ventasPagadas(VENTAS).map((v) => v.id), ["1", "2", "3"]);
  });
  it("filtrarPorRango incluye desde y excluye hasta", () => {
    const { desde, hasta } = rangoDeFechas("2026-05-01", "2026-05-01");
    assert.deepEqual(filtrarPorRango(VENTAS, desde, hasta).map((v) => v.id), ["1", "2"]);
  });
  it("totalVentas y ticketPromedio", () => {
    const pagadas = ventasPagadas(VENTAS);
    assert.equal(totalVentas(pagadas), 23.5);
    assert.equal(ticketPromedio(pagadas), 7.83);
    assert.equal(ticketPromedio([]), 0);
  });
  it("totalVentas evita errores de coma flotante", () => {
    assert.equal(totalVentas([{ total: 0.1 }, { total: 0.2 }]), 0.3);
  });
});

describe("ventasPorDia", () => {
  it("agrupa por día e incluye los días vacíos en 0", () => {
    const { desde, hasta } = rangoDeFechas("2026-05-01", "2026-05-04");
    assert.deepEqual(ventasPorDia(ventasPagadas(VENTAS), desde, hasta), [
      { dia: "2026-05-01", ventas: 2, total: 17.5 },
      { dia: "2026-05-02", ventas: 0, total: 0 },
      { dia: "2026-05-03", ventas: 1, total: 6 },
      { dia: "2026-05-04", ventas: 0, total: 0 },
    ]);
  });
});

describe("otras agrupaciones", () => {
  const pagadas = ventasPagadas(VENTAS);
  it("por método de pago, de mayor a menor", () => {
    assert.deepEqual(ventasPorMetodoPago(pagadas), [
      { metodo: "efectivo", ventas: 2, total: 16 },
      { metodo: "tarjeta", ventas: 1, total: 7.5 },
    ]);
  });
  it("por cajero, de mayor a menor", () => {
    assert.deepEqual(ventasPorCajero(pagadas), [
      { cajeroId: "u1", cajero: "Ana", ventas: 2, total: 16 },
      { cajeroId: "u2", cajero: "Luis", ventas: 1, total: 7.5 },
    ]);
  });
});

describe("topProductos", () => {
  const pagadas = ventasPagadas(VENTAS);
  it("suma unidades entre ventas y ordena de mayor a menor", () => {
    assert.deepEqual(topProductos(pagadas), [
      { productoId: "a", nombre: "Café", unidades: 5, importe: 12.5 },
      { productoId: "c", nombre: "Bellini", unidades: 1, importe: 6 },
      { productoId: "b", nombre: "Flan", unidades: 1, importe: 5 },
    ]);
  });
  it("a igualdad de unidades gana el de mayor importe", () => {
    assert.deepEqual(topProductos(pagadas).map((p) => p.productoId), ["a", "c", "b"]);
  });
  it("respeta el límite y tolera ventas sin items", () => {
    assert.equal(topProductos(pagadas, 2).length, 2);
    assert.deepEqual(topProductos([{ total: 1 }]), []);
  });
});

describe("ventasPorCategoria", () => {
  it("usa la categoría del item o la del mapa de productos", () => {
    const r = ventasPorCategoria(ventasPagadas(VENTAS), { c: "bebidas-frias" });
    assert.deepEqual(r.map((c) => [c.categoria, c.unidades, c.importe]), [
      ["cafe-caliente", 5, 12.5],
      ["bebidas-frias", 1, 6],
      ["postres", 1, 5],
    ]);
    assert.equal(r[0].etiqueta, "Café & bebidas calientes");
  });
  it("sin categoría conocida va a «Sin categoría»", () => {
    const r = ventasPorCategoria(ventasPagadas(VENTAS));
    assert.ok(r.some((c) => c.categoria === "sin-categoria" && c.etiqueta === "Sin categoría"));
  });
});

describe("resumen y reporte completo", () => {
  it("resumenVentas cuenta anuladas aparte", () => {
    assert.deepEqual(resumenVentas(VENTAS), { totalVendido: 23.5, cantidadVentas: 3, ticketPromedio: 7.83, anuladas: 1 });
  });
  it("generarReporte ignora ventas fuera del rango y las anuladas", () => {
    const { desde, hasta } = rangoDeFechas("2026-05-01", "2026-05-01");
    const r = generarReporte(VENTAS, desde, hasta);
    assert.equal(r.resumen.totalVendido, 17.5);
    assert.equal(r.resumen.anuladas, 0);
    assert.equal(r.porDia.length, 1);
    assert.equal(r.topProductos[0].productoId, "a");
  });
});
