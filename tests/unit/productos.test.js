import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  CATEGORIAS,
  esquemaProducto,
  esquemaEntrada,
  datosAProducto,
  esStockBajo,
  sumarStock,
  resumenInventario,
  filtrarProductos,
  ordenarProductos,
  contarPorCategoria,
  agruparParaMenu,
  etiquetaCategoria,
} from "../../js/utils/productos.js";
import { validar } from "../../js/ui/validation.js";
import { PRODUCTOS_INICIALES } from "../../js/data/productos-iniciales.js";

const LISTA = [
  { id: "1", nombre: "Café de olla", descripcion: "Con canela", categoria: "cafe-caliente", precio: 2.5, stock: 40, stockMinimo: 10, disponible: true, controlaStock: true },
  { id: "2", nombre: "Bellini", descripcion: "Coctel de durazno", categoria: "bebidas-frias", precio: 6, stock: 5, stockMinimo: 5, disponible: true, controlaStock: true },
  { id: "3", nombre: "Ceviche", descripcion: "Fresco", categoria: "comida", precio: 8, stock: 0, stockMinimo: 3, disponible: false, controlaStock: true },
  { id: "4", nombre: "Flan de queso", descripcion: "Con caramelo", categoria: "postres", precio: 3.5, stock: 20, stockMinimo: 6, disponible: true, controlaStock: true },
];

const valido = {
  nombre: "Capuchino", descripcion: "", etiqueta: "", categoria: "cafe-caliente",
  precio: "3.25", stock: "12", stockMinimo: "4", disponible: true,
};

describe("esquemaProducto", () => {
  it("acepta un producto correcto", () => {
    assert.equal(validar(valido, esquemaProducto).valido, true);
  });
  it("exige precio mayor que 0", () => {
    for (const precio of ["0", "-1", "", "abc"]) {
      assert.ok(validar({ ...valido, precio }, esquemaProducto).errores.precio, `precio ${precio}`);
    }
  });
  it("exige stock entero mayor o igual a 0", () => {
    for (const stock of ["-1", "2.5", "", "x"]) {
      assert.ok(validar({ ...valido, stock }, esquemaProducto).errores.stock, `stock ${stock}`);
    }
    assert.equal(validar({ ...valido, stock: "0", stockMinimo: "0" }, esquemaProducto).valido, true);
  });
  it("rechaza stock mínimo mayor que el stock", () => {
    const r = validar({ ...valido, stock: "3", stockMinimo: "4" }, esquemaProducto);
    assert.match(r.errores.stockMinimo, /no puede ser mayor/);
  });
  it("acepta stock mínimo igual al stock", () => {
    assert.equal(validar({ ...valido, stock: "4", stockMinimo: "4" }, esquemaProducto).valido, true);
  });
  it("exige una categoría válida", () => {
    assert.ok(validar({ ...valido, categoria: "" }, esquemaProducto).errores.categoria);
    assert.ok(validar({ ...valido, categoria: "sopas" }, esquemaProducto).errores.categoria);
  });
  it("exige nombre de 2 a 80 caracteres", () => {
    assert.ok(validar({ ...valido, nombre: "" }, esquemaProducto).errores.nombre);
    assert.ok(validar({ ...valido, nombre: "A" }, esquemaProducto).errores.nombre);
    assert.ok(validar({ ...valido, nombre: "x".repeat(81) }, esquemaProducto).errores.nombre);
  });
});

describe("esquemaEntrada", () => {
  it("acepta enteros positivos", () => {
    assert.equal(validar({ cantidad: "10" }, esquemaEntrada).valido, true);
  });
  it("rechaza cero, negativos, decimales y vacío", () => {
    for (const cantidad of ["0", "-5", "1.5", ""]) {
      assert.ok(validar({ cantidad }, esquemaEntrada).errores.cantidad, `cantidad ${cantidad}`);
    }
  });
});

describe("datosAProducto", () => {
  it("convierte el texto del formulario a los tipos correctos", () => {
    const p = datosAProducto({ ...valido, nombre: "  Capuchino  ", precio: "3.255" });
    assert.equal(p.nombre, "Capuchino");
    assert.equal(p.precio, 3.26);
    assert.equal(p.stock, 12);
    assert.equal(p.stockMinimo, 4);
    assert.equal(p.disponible, true);
    assert.equal(p.controlaStock, true);
  });
});

describe("inventario", () => {
  it("marca stock bajo cuando stock <= stockMinimo", () => {
    assert.equal(esStockBajo(LISTA[0]), false);
    assert.equal(esStockBajo(LISTA[1]), true); // 5 <= 5
    assert.equal(esStockBajo(LISTA[2]), true); // 0 <= 3
  });
  it("no marca stock bajo si el producto no controla stock", () => {
    assert.equal(esStockBajo({ ...LISTA[2], controlaStock: false }), false);
  });
  it("sumarStock suma sin modificar el producto", () => {
    const copia = { ...LISTA[1] };
    assert.equal(sumarStock(LISTA[1], 10), 15);
    assert.deepEqual(LISTA[1], copia);
  });
  it("sumarStock rechaza cantidades inválidas", () => {
    for (const n of [0, -1, 1.5, "abc"]) assert.throws(() => sumarStock(LISTA[0], n), RangeError);
  });
  it("resumenInventario calcula los indicadores", () => {
    assert.deepEqual(resumenInventario(LISTA), {
      total: 4, disponibles: 3, bajoStock: 2, agotados: 1,
      valorInventario: 2.5 * 40 + 6 * 5 + 0 + 3.5 * 20,
    });
  });
});

describe("filtrarProductos", () => {
  it("sin criterios devuelve todos", () => {
    assert.equal(filtrarProductos(LISTA).length, 4);
  });
  it("busca por nombre o descripción ignorando tildes y mayúsculas", () => {
    assert.deepEqual(filtrarProductos(LISTA, { texto: "CAFE" }).map((p) => p.id), ["1"]);
    assert.deepEqual(filtrarProductos(LISTA, { texto: "durazno" }).map((p) => p.id), ["2"]);
  });
  it("filtra por categoría", () => {
    assert.deepEqual(filtrarProductos(LISTA, { categoria: "postres" }).map((p) => p.id), ["4"]);
  });
  it("filtra solo bajo stock", () => {
    assert.deepEqual(filtrarProductos(LISTA, { soloBajoStock: true }).map((p) => p.id), ["2", "3"]);
  });
  it("combina criterios", () => {
    const r = filtrarProductos(LISTA, { soloBajoStock: true, disponibilidad: "si" });
    assert.deepEqual(r.map((p) => p.id), ["2"]);
  });
});

describe("ordenarProductos", () => {
  it("ordena por nombre sin tildes y no muta la lista", () => {
    const copia = [...LISTA];
    assert.deepEqual(ordenarProductos(LISTA, "nombre-asc").map((p) => p.id), ["2", "1", "3", "4"]);
    assert.deepEqual(LISTA, copia);
  });
  it("ordena por precio en ambos sentidos", () => {
    assert.deepEqual(ordenarProductos(LISTA, "precio-asc").map((p) => p.id), ["1", "4", "2", "3"]);
    assert.deepEqual(ordenarProductos(LISTA, "precio-desc").map((p) => p.id), ["3", "2", "4", "1"]);
  });
  it("ordena por stock en ambos sentidos", () => {
    assert.deepEqual(ordenarProductos(LISTA, "stock-asc").map((p) => p.id), ["3", "2", "4", "1"]);
    assert.deepEqual(ordenarProductos(LISTA, "stock-desc").map((p) => p.id), ["1", "4", "2", "3"]);
  });
  it("un criterio desconocido ordena por nombre", () => {
    assert.deepEqual(ordenarProductos(LISTA, "xyz").map((p) => p.id), ["2", "1", "3", "4"]);
  });
});

describe("contarPorCategoria", () => {
  it("cuenta por categoría e incluye las vacías en 0", () => {
    assert.deepEqual(contarPorCategoria(LISTA.slice(0, 2)), {
      "cafe-caliente": 1, "bebidas-frias": 1, comida: 0, postres: 0,
    });
  });
});

describe("agruparParaMenu", () => {
  it("agrupa solo disponibles, en orden de categoría y por `orden`", () => {
    const lista = [
      { ...LISTA[3], orden: 2 },
      { ...LISTA[2] }, // no disponible: no aparece
      { ...LISTA[0], id: "z", nombre: "Zeta", orden: 1 },
      { ...LISTA[0], id: "a", nombre: "Alfa", orden: 2 },
      { ...LISTA[3], id: "p", nombre: "Pastel", orden: 1 },
    ];
    const grupos = agruparParaMenu(lista);
    assert.deepEqual(grupos.map((g) => g.categoria.id), ["cafe-caliente", "postres"]);
    assert.deepEqual(grupos[0].productos.map((p) => p.id), ["z", "a"]);
    assert.deepEqual(grupos[1].productos.map((p) => p.id), ["p", "4"]);
  });
  it("lista vacía no da grupos", () => {
    assert.deepEqual(agruparParaMenu([]), []);
  });
});

describe("etiquetaCategoria", () => {
  it("devuelve la etiqueta o el id si no existe", () => {
    assert.equal(etiquetaCategoria("postres"), "Postres artesanales");
    assert.equal(etiquetaCategoria("otra"), "otra");
  });
});

describe("PRODUCTOS_INICIALES", () => {
  it("tiene ids únicos", () => {
    const ids = PRODUCTOS_INICIALES.map((p) => p.id);
    assert.equal(new Set(ids).size, ids.length);
  });
  it("cada producto pasa las mismas validaciones del formulario", () => {
    for (const p of PRODUCTOS_INICIALES) {
      const r = validar(
        { ...p, precio: String(p.precio), stock: String(p.stock), stockMinimo: String(p.stockMinimo) },
        esquemaProducto
      );
      assert.equal(r.valido, true, `${p.id}: ${JSON.stringify(r.errores)}`);
    }
  });
  it("usa solo categorías que existen y deja al menos un producto en stock bajo", () => {
    const ids = CATEGORIAS.map((c) => c.id);
    assert.ok(PRODUCTOS_INICIALES.every((p) => ids.includes(p.categoria)));
    assert.ok(PRODUCTOS_INICIALES.some(esStockBajo));
  });
});
