import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  esEmailValido,
  reglas,
  validar,
  validarLogin,
  validarRegistro,
} from "../../js/ui/validation.js";

describe("esEmailValido", () => {
  it("acepta correos con formato válido", () => {
    assert.equal(esEmailValido("ana@cafe.com"), true);
    assert.equal(esEmailValido("  ana.lopez@cafe.com.sv "), true);
  });
  it("rechaza correos inválidos", () => {
    for (const malo of ["", "ana", "ana@", "ana@cafe", "a b@cafe.com", null, 42]) {
      assert.equal(esEmailValido(malo), false, `debería rechazar ${malo}`);
    }
  });
});

describe("reglas", () => {
  it("requerido detecta vacíos y espacios", () => {
    const r = reglas.requerido();
    assert.ok(r(""));
    assert.ok(r("   "));
    assert.ok(r(undefined));
    assert.equal(r("x"), null);
    assert.equal(r(0), null);
  });
  it("minLongitud y maxLongitud", () => {
    assert.ok(reglas.minLongitud(3)("ab"));
    assert.equal(reglas.minLongitud(3)("abc"), null);
    assert.ok(reglas.maxLongitud(3)("abcd"));
    assert.equal(reglas.maxLongitud(3)("abc"), null);
  });
  it("coincideCon compara con otro campo", () => {
    const r = reglas.coincideCon("password");
    assert.equal(r("123456", { password: "123456" }), null);
    assert.ok(r("123457", { password: "123456" }));
  });
  it("reglas numéricas", () => {
    assert.ok(reglas.numero()("abc"));
    assert.equal(reglas.numero()("2.5"), null);
    assert.ok(reglas.entero()("2.5"));
    assert.equal(reglas.entero()("3"), null);
    assert.ok(reglas.mayorQue(0)("0"));
    assert.equal(reglas.mayorQue(0)("0.01"), null);
    assert.ok(reglas.minimo(0)("-1"));
    assert.ok(reglas.maximo(20)("21"));
    assert.equal(reglas.maximo(20)("20"), null);
  });
  it("enLista", () => {
    assert.equal(reglas.enLista(["a", "b"])("a"), null);
    assert.ok(reglas.enLista(["a", "b"])("c"));
  });
});

describe("validar", () => {
  it("devuelve solo el primer error de cada campo", () => {
    const { valido, errores } = validar(
      { nombre: "" },
      { nombre: [reglas.requerido("vacío"), reglas.minLongitud(2, "corto")] }
    );
    assert.equal(valido, false);
    assert.deepEqual(errores, { nombre: "vacío" });
  });
});

describe("validarLogin", () => {
  it("exige correo válido y contraseña", () => {
    const r = validarLogin({ email: "no-es-correo", password: "" });
    assert.equal(r.valido, false);
    assert.ok(r.errores.email);
    assert.ok(r.errores.password);
  });
  it("acepta credenciales con formato correcto", () => {
    assert.equal(validarLogin({ email: "a@b.com", password: "x" }).valido, true);
  });
});

describe("validarRegistro", () => {
  const base = { nombre: "Ana López", email: "ana@cafe.com", password: "secreto1", confirmacion: "secreto1" };

  it("acepta un registro válido", () => {
    assert.deepEqual(validarRegistro(base), { valido: true, errores: {} });
  });
  it("exige nombre de al menos 2 caracteres", () => {
    assert.ok(validarRegistro({ ...base, nombre: "" }).errores.nombre);
    assert.ok(validarRegistro({ ...base, nombre: "A" }).errores.nombre);
  });
  it("exige contraseña de 6+ caracteres", () => {
    const r = validarRegistro({ ...base, password: "12345", confirmacion: "12345" });
    assert.match(r.errores.password, /6/);
  });
  it("exige que la confirmación coincida", () => {
    const r = validarRegistro({ ...base, confirmacion: "otra-cosa" });
    assert.equal(r.errores.confirmacion, "Las contraseñas no coinciden.");
  });
});

describe("esquemaNuevoEmpleado (alta hecha por un admin)", async () => {
  const { validar, esquemaNuevoEmpleado } = await import("../../js/ui/validation.js");
  const base = { nombre: "Ana López", email: "ana@cafe.com", password: "Temp2345", rol: "cajero" };

  it("acepta un alta válida", () => {
    assert.equal(validar(base, esquemaNuevoEmpleado).valido, true);
  });
  it("rechaza roles fuera de la lista", () => {
    assert.ok(validar({ ...base, rol: "dueño" }, esquemaNuevoEmpleado).errores.rol);
  });
  it("exige contraseña temporal de 6+ caracteres", () => {
    assert.ok(validar({ ...base, password: "abc" }, esquemaNuevoEmpleado).errores.password);
  });
  it("exige nombre y correo válidos", () => {
    const { errores } = validar({ ...base, nombre: "", email: "x" }, esquemaNuevoEmpleado);
    assert.ok(errores.nombre);
    assert.ok(errores.email);
  });
});

describe("generarPasswordTemporal", async () => {
  const { generarPasswordTemporal, PASSWORD_MIN } = await import("../../js/ui/validation.js");

  it("genera el largo pedido y cumple el mínimo de Firebase", () => {
    const p = generarPasswordTemporal();
    assert.equal(p.length, 10);
    assert.ok(p.length >= PASSWORD_MIN);
    assert.equal(generarPasswordTemporal(14).length, 14);
  });
  it("incluye mayúscula, minúscula y dígito, sin caracteres ambiguos", () => {
    for (let i = 0; i < 50; i++) {
      const p = generarPasswordTemporal();
      assert.match(p, /[A-Z]/);
      assert.match(p, /[a-z]/);
      assert.match(p, /[2-9]/);
      assert.doesNotMatch(p, /[0O1lIo]/);
    }
  });
  it("es determinista con un generador inyectado", () => {
    const fijo = () => 0;
    assert.equal(generarPasswordTemporal(6, fijo), generarPasswordTemporal(6, fijo));
  });
});
