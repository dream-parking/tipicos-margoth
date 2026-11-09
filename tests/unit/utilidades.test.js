import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { traducirError, errorApp, MENSAJE_GENERICO } from "../../js/services/auth-errores.js";
import { iniciales, aFecha, formatearMoneda } from "../../js/ui/formato.js";

describe("traducirError", () => {
  it("traduce códigos de Firebase Auth", () => {
    assert.equal(traducirError({ code: "auth/invalid-credential" }), "Correo o contraseña incorrectos.");
    assert.equal(traducirError({ code: "auth/email-already-in-use" }), "Ya existe una cuenta con ese correo.");
  });
  it("traduce errores de Firestore con o sin prefijo", () => {
    const esperado = "No tienes permiso para realizar esta operación.";
    assert.equal(traducirError({ code: "permission-denied" }), esperado);
    assert.equal(traducirError({ code: "firestore/permission-denied" }), esperado);
  });
  it("usa un mensaje genérico para códigos desconocidos o errores sin código", () => {
    assert.equal(traducirError({ code: "auth/algo-raro" }), MENSAJE_GENERICO);
    assert.equal(traducirError(new Error("x")), MENSAJE_GENERICO);
    assert.equal(traducirError(undefined), MENSAJE_GENERICO);
  });
  it("errorApp crea errores propios con código y mensaje", () => {
    const e = errorApp("app/inactivo");
    assert.equal(e.code, "app/inactivo");
    assert.match(e.message, /pendiente de activación/);
    assert.equal(traducirError(e), e.message);
  });
});

describe("formato", () => {
  it("iniciales", () => {
    assert.equal(iniciales("Ana María López"), "AL");
    assert.equal(iniciales("carlos"), "C");
    assert.equal(iniciales("  "), "?");
  });
  it("aFecha acepta Timestamp de Firestore, Date y números", () => {
    const d = new Date(2026, 10, 8);
    assert.equal(aFecha({ toDate: () => d }), d);
    assert.equal(aFecha(d), d);
    assert.equal(aFecha(d.getTime()).getTime(), d.getTime());
    assert.equal(aFecha(null), null);
  });
  it("formatearMoneda usa dólares", () => {
    assert.match(formatearMoneda(2.5), /2[.,]50/);
    assert.match(formatearMoneda("x"), /0[.,]00/);
  });
});
