import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  normalizar,
  filtrarEmpleados,
  ordenarEmpleados,
  resumenEmpleados,
  validarCambioEmpleado,
} from "../../js/utils/empleados.js";

const LISTA = [
  { uid: "a1", nombre: "Ana Ramírez", email: "ana@cafe.com", rol: "admin", activo: true },
  { uid: "c1", nombre: "Carlos Pérez", email: "carlos@cafe.com", rol: "cajero", activo: true },
  { uid: "c2", nombre: "Beatriz Núñez", email: "bea@cafe.com", rol: "cajero", activo: false },
  { uid: "c3", nombre: "Óscar Díaz", email: "oscar@cafe.com", rol: "cajero", activo: true },
];

describe("normalizar", () => {
  it("quita tildes y mayúsculas", () => {
    assert.equal(normalizar("  Óscar NÚÑEZ "), "oscar nunez");
  });
});

describe("filtrarEmpleados", () => {
  it("sin criterios devuelve todos", () => {
    assert.equal(filtrarEmpleados(LISTA).length, 4);
  });
  it("busca por nombre ignorando tildes", () => {
    assert.deepEqual(filtrarEmpleados(LISTA, { texto: "nunez" }).map((e) => e.uid), ["c2"]);
  });
  it("busca por correo", () => {
    assert.deepEqual(filtrarEmpleados(LISTA, { texto: "carlos@" }).map((e) => e.uid), ["c1"]);
  });
  it("filtra por rol y estado combinados", () => {
    const r = filtrarEmpleados(LISTA, { rol: "cajero", estado: "activo" });
    assert.deepEqual(r.map((e) => e.uid), ["c1", "c3"]);
    assert.deepEqual(filtrarEmpleados(LISTA, { estado: "inactivo" }).map((e) => e.uid), ["c2"]);
  });
});

describe("ordenarEmpleados", () => {
  it("pone primero a los pendientes y luego ordena por nombre sin mutar", () => {
    const copia = [...LISTA];
    const r = ordenarEmpleados(LISTA).map((e) => e.uid);
    assert.deepEqual(r, ["c2", "a1", "c1", "c3"]);
    assert.deepEqual(LISTA, copia);
  });
});

describe("resumenEmpleados", () => {
  it("cuenta totales, activos, pendientes y roles", () => {
    assert.deepEqual(resumenEmpleados(LISTA), {
      total: 4, activos: 3, pendientes: 1, admins: 1, cajeros: 3,
    });
  });
  it("lista vacía da ceros", () => {
    assert.equal(resumenEmpleados([]).total, 0);
  });
});

describe("validarCambioEmpleado", () => {
  const [ana, carlos, bea] = LISTA;

  it("permite activar a un cajero pendiente", () => {
    assert.equal(validarCambioEmpleado("a1", bea, { activo: true }, LISTA).permitido, true);
  });
  it("permite ascender a un cajero", () => {
    assert.equal(validarCambioEmpleado("a1", carlos, { rol: "admin" }, LISTA).permitido, true);
  });
  it("impide modificarse a uno mismo", () => {
    const r = validarCambioEmpleado("a1", ana, { rol: "cajero" }, LISTA);
    assert.equal(r.permitido, false);
    assert.match(r.motivo, /propio/);
  });
  it("rechaza roles inválidos", () => {
    assert.equal(validarCambioEmpleado("a1", carlos, { rol: "dueño" }, LISTA).permitido, false);
  });
  it("rechaza estados no booleanos", () => {
    assert.equal(validarCambioEmpleado("a1", carlos, { activo: "sí" }, LISTA).permitido, false);
  });
  it("impide dejar el sistema sin administradores activos", () => {
    const soloUnAdmin = [ana, { ...carlos, rol: "admin", activo: false }];
    // otro admin (inactivo) intenta degradar al único admin activo
    const r = validarCambioEmpleado("c1", ana, { rol: "cajero" }, soloUnAdmin);
    assert.equal(r.permitido, false);
    assert.match(r.motivo, /al menos un administrador/);
  });
  it("permite degradar a un admin si queda otro activo", () => {
    const dosAdmins = [ana, { ...carlos, rol: "admin" }];
    assert.equal(validarCambioEmpleado("c1", ana, { rol: "cajero" }, dosAdmins).permitido, true);
  });
  it("rechaza un empleado inexistente", () => {
    assert.equal(validarCambioEmpleado("a1", undefined, { activo: true }).permitido, false);
  });
});
