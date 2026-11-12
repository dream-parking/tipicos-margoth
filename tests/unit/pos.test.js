import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  DESCUENTO_MAXIMO,
  redondear,
  puedeVenderse,
  stockMaximo,
  cantidadEnTicket,
  puedeAgregar,
  agregarAlTicket,
  cambiarCantidad,
  quitarDelTicket,
  calcularTotales,
  validarDescuento,
  calcularCobro,
  problemasDeStock,
  filtrarVentas,
  cajerosDe,
  resumenItems,
  stockTrasAnular,
} from "../../js/utils/pos.js";

const FLAN = { id: "flan", nombre: "Flan", categoria: "postres", precio: 3.5, stock: 2, controlaStock: true, disponible: true };
const CAFE = { id: "cafe", nombre: "Café", categoria: "cafe-caliente", precio: 2.5, stock: 40, controlaStock: true, disponible: true };
const AGUA = { id: "agua", nombre: "Agua", categoria: "bebidas-frias", precio: 1, stock: 0, controlaStock: false, disponible: true };

describe("redondear", () => {
  it("evita los errores de coma flotante", () => {
    assert.equal(redondear(0.1 + 0.2), 0.3);
    assert.equal(redondear(1.005), 1.01);
  });
});

describe("puedeVenderse y stockMaximo", () => {
  it("vende un producto disponible con stock", () => {
    assert.equal(puedeVenderse(FLAN), true);
  });
  it("no vende un producto no disponible", () => {
    assert.equal(puedeVenderse({ ...FLAN, disponible: false }), false);
  });
  it("no vende un producto agotado que controla stock", () => {
    assert.equal(puedeVenderse({ ...FLAN, stock: 0 }), false);
  });
  it("vende un producto que no controla stock aunque el stock sea 0", () => {
    assert.equal(puedeVenderse(AGUA), true);
  });
  it("el máximo es el stock, o ilimitado si no controla stock", () => {
    assert.equal(stockMaximo(FLAN), 2);
    assert.equal(stockMaximo(AGUA), Infinity);
  });
});

describe("agregarAlTicket", () => {
  it("agrega una línea nueva con cantidad 1", () => {
    const ticket = agregarAlTicket([], FLAN);
    assert.deepEqual(ticket, [
      { productoId: "flan", nombre: "Flan", categoria: "postres", precio: 3.5, cantidad: 1 },
    ]);
  });
  it("suma cantidad si el producto ya está en el ticket", () => {
    const ticket = agregarAlTicket(agregarAlTicket([], CAFE), CAFE);
    assert.equal(ticket.length, 1);
    assert.equal(ticket[0].cantidad, 2);
  });
  it("no se pasa del stock", () => {
    let ticket = [];
    for (let i = 0; i < 5; i++) ticket = agregarAlTicket(ticket, FLAN);
    assert.equal(cantidadEnTicket(ticket, "flan"), 2);
    assert.equal(puedeAgregar(ticket, FLAN), false);
  });
  it("no agrega productos agotados ni no disponibles", () => {
    assert.deepEqual(agregarAlTicket([], { ...FLAN, stock: 0 }), []);
    assert.deepEqual(agregarAlTicket([], { ...FLAN, disponible: false }), []);
  });
  it("no modifica el ticket original", () => {
    const original = agregarAlTicket([], CAFE);
    agregarAlTicket(original, CAFE);
    assert.equal(original[0].cantidad, 1);
  });
});

describe("cambiarCantidad y quitarDelTicket", () => {
  const ticket = [{ productoId: "cafe", nombre: "Café", categoria: "cafe-caliente", precio: 2.5, cantidad: 1 }];

  it("cambia la cantidad de una línea", () => {
    assert.equal(cambiarCantidad(ticket, "cafe", 4)[0].cantidad, 4);
  });
  it("recorta la cantidad al máximo permitido", () => {
    assert.equal(cambiarCantidad(ticket, "cafe", 99, 5)[0].cantidad, 5);
  });
  it("ignora cantidades inválidas", () => {
    for (const invalida of [0, -1, 1.5, NaN]) {
      assert.equal(cambiarCantidad(ticket, "cafe", invalida)[0].cantidad, 1, `cantidad ${invalida}`);
    }
  });
  it("quita una línea del ticket", () => {
    assert.deepEqual(quitarDelTicket(ticket, "cafe"), []);
  });
});

describe("calcularTotales", () => {
  const ticket = [
    { productoId: "flan", precio: 3.5, cantidad: 2 },
    { productoId: "cafe", precio: 2.5, cantidad: 1 },
  ];
  it("calcula subtotal y total sin descuento", () => {
    assert.deepEqual(calcularTotales(ticket), { subtotal: 9.5, descuento: 0, total: 9.5 });
  });
  it("aplica el descuento en porcentaje", () => {
    assert.deepEqual(calcularTotales(ticket, 10), { subtotal: 9.5, descuento: 0.95, total: 8.55 });
  });
  it("un ticket vacío da cero", () => {
    assert.deepEqual(calcularTotales([]), { subtotal: 0, descuento: 0, total: 0 });
  });
  it("no acumula errores de coma flotante", () => {
    assert.equal(calcularTotales([{ precio: 0.1, cantidad: 3 }]).total, 0.3);
  });
});

describe("validarDescuento", () => {
  it("acepta 0 sin motivo", () => {
    assert.equal(validarDescuento(0), null);
  });
  it("acepta hasta el máximo con motivo", () => {
    assert.equal(DESCUENTO_MAXIMO, 20);
    assert.equal(validarDescuento(20, "Cliente frecuente"), null);
  });
  it("rechaza más del 20%", () => {
    assert.match(validarDescuento(21, "Motivo válido"), /máximo/);
  });
  it("rechaza valores negativos o que no son números", () => {
    assert.ok(validarDescuento(-5, "Motivo"));
    assert.ok(validarDescuento(NaN, "Motivo"));
  });
  it("exige motivo cuando hay descuento", () => {
    assert.match(validarDescuento(10, ""), /motivo/i);
    assert.match(validarDescuento(10, "   "), /motivo/i);
    assert.match(validarDescuento(10, "ab"), /motivo/i);
  });
});

describe("calcularCobro", () => {
  it("con tarjeta no pide monto ni da cambio", () => {
    assert.deepEqual(calcularCobro("tarjeta", 8.55), { valido: true, efectivoRecibido: 0, cambio: 0 });
  });
  it("en efectivo calcula el cambio", () => {
    assert.deepEqual(calcularCobro("efectivo", 8.55, 10), { valido: true, efectivoRecibido: 10, cambio: 1.45 });
  });
  it("acepta el monto exacto", () => {
    assert.equal(calcularCobro("efectivo", 5, "5").cambio, 0);
  });
  it("rechaza efectivo menor al total", () => {
    const cobro = calcularCobro("efectivo", 8.55, 8);
    assert.equal(cobro.valido, false);
    assert.ok(cobro.error);
  });
  it("rechaza un monto vacío o que no es número", () => {
    assert.equal(calcularCobro("efectivo", 5, "abc").valido, false);
    assert.equal(calcularCobro("efectivo", 5, undefined).valido, false);
  });
  it("rechaza un método de pago desconocido", () => {
    assert.equal(calcularCobro("cheque", 5, 5).valido, false);
  });
});

describe("problemasDeStock", () => {
  const ticket = [{ productoId: "flan", nombre: "Flan", cantidad: 2 }];

  it("no hay problemas si alcanza el stock", () => {
    assert.deepEqual(problemasDeStock(ticket, { flan: FLAN }), []);
  });
  it("avisa cuando quedan menos unidades de las pedidas", () => {
    const problemas = problemasDeStock(ticket, { flan: { ...FLAN, stock: 1 } });
    assert.equal(problemas.length, 1);
    assert.match(problemas[0], /quedan 1 y pides 2/);
  });
  it("avisa si el producto ya no está disponible o fue borrado", () => {
    assert.match(problemasDeStock(ticket, { flan: { ...FLAN, disponible: false } })[0], /ya no está disponible/);
    assert.match(problemasDeStock(ticket, {})[0], /ya no está disponible/);
  });
  it("ignora el stock de productos que no lo controlan", () => {
    const aguas = [{ productoId: "agua", nombre: "Agua", cantidad: 50 }];
    assert.deepEqual(problemasDeStock(aguas, { agua: AGUA }), []);
  });
});

describe("historial de ventas", () => {
  const VENTAS = [
    { id: "1", cajeroId: "u1", cajeroNombre: "Luis", metodoPago: "efectivo", estado: "pagada", items: [{ nombre: "Café de olla", cantidad: 2 }, { nombre: "Flan", cantidad: 1 }] },
    { id: "2", cajeroId: "u2", cajeroNombre: "Ana", metodoPago: "tarjeta", estado: "pagada", items: [] },
    { id: "3", cajeroId: "u1", cajeroNombre: "Luis", metodoPago: "tarjeta", estado: "anulada", items: [] },
  ];

  it("filtrarVentas sin criterios devuelve todas", () => {
    assert.equal(filtrarVentas(VENTAS).length, 3);
    assert.equal(filtrarVentas(VENTAS, { cajeroId: "", metodoPago: "todos" }).length, 3);
  });
  it("filtrarVentas combina cajero, método y estado", () => {
    assert.deepEqual(filtrarVentas(VENTAS, { cajeroId: "u1" }).map((v) => v.id), ["1", "3"]);
    assert.deepEqual(filtrarVentas(VENTAS, { metodoPago: "tarjeta", estado: "anulada" }).map((v) => v.id), ["3"]);
    assert.deepEqual(filtrarVentas(VENTAS, { cajeroId: "u2", estado: "anulada" }), []);
  });
  it("cajerosDe lista cada cajero una vez, ordenado por nombre", () => {
    assert.deepEqual(cajerosDe(VENTAS), [
      { id: "u2", nombre: "Ana" },
      { id: "u1", nombre: "Luis" },
    ]);
  });
  it("resumenItems arma el texto del detalle", () => {
    assert.equal(resumenItems(VENTAS[0].items), "2× Café de olla, 1× Flan");
    assert.equal(resumenItems(), "");
  });
});

describe("stockTrasAnular", () => {
  const items = [
    { productoId: "flan", cantidad: 2 },
    { productoId: "agua", cantidad: 3 },
    { productoId: "borrado", cantidad: 1 },
  ];
  it("suma lo vendido al stock actual de cada producto", () => {
    const productos = { flan: { ...FLAN, stock: 5 }, agua: AGUA };
    assert.deepEqual(stockTrasAnular(items, productos), [{ productoId: "flan", stock: 7 }]);
  });
  it("omite los productos que no controlan stock o ya no existen", () => {
    assert.deepEqual(stockTrasAnular(items, { agua: AGUA }), []);
  });
});
