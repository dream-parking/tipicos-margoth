// Pruebas de las reglas de Firestore con el emulador.
// Ejecutar con: npm run test:rules
import { readFileSync } from "node:fs";
import { describe, it, before, beforeEach, after } from "node:test";
import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
} from "@firebase/rules-unit-testing";
import {
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  serverTimestamp,
} from "firebase/firestore";

const PROJECT_ID = "demo-cafe-santa-cruz";
let env;

// Usuarios de prueba: uid → perfil
const PERFILES = {
  admin: { nombre: "Ana Admin", email: "admin@test.com", rol: "admin", activo: true },
  admin2: { nombre: "Beto Admin", email: "admin2@test.com", rol: "admin", activo: true },
  cajero: { nombre: "Carla Cajera", email: "cajero@test.com", rol: "cajero", activo: true },
  cajero2: { nombre: "Diego Cajero", email: "cajero2@test.com", rol: "cajero", activo: true },
  inactivo: { nombre: "Iván Inactivo", email: "inactivo@test.com", rol: "cajero", activo: false },
};

const db = (uid) =>
  uid
    ? env.authenticatedContext(uid, { email: PERFILES[uid]?.email ?? `${uid}@test.com` }).firestore()
    : env.unauthenticatedContext().firestore();

const venta = (cajeroId, extra = {}) => ({
  cajeroId,
  cajeroNombre: "X",
  items: [{ productoId: "cafe", nombre: "Café", precio: 2.5, cantidad: 2, subtotal: 5 }],
  subtotal: 5,
  descuento: 0,
  total: 5,
  metodoPago: "efectivo",
  efectivoRecibido: 10,
  cambio: 5,
  estado: "pagada",
  creado: serverTimestamp(),
  ...extra,
});

const productoBase = {
  nombre: "Café de olla",
  descripcion: "Con canela",
  precio: 2.5,
  categoria: "bebidas-calientes",
  imagen: "img/cafeolla.jpg",
  disponible: true,
  controlaStock: true,
  stock: 10,
  stockMinimo: 2,
};

before(async () => {
  env = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: { rules: readFileSync("firestore.rules", "utf8") },
  });
});

after(async () => {
  await env?.cleanup();
});

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const fs = ctx.firestore();
    for (const [uid, perfil] of Object.entries(PERFILES)) {
      await setDoc(doc(fs, "usuarios", uid), { ...perfil, creado: new Date() });
    }
    await setDoc(doc(fs, "productos", "cafe"), productoBase);
    await setDoc(doc(fs, "productos", "sinStock"), { ...productoBase, nombre: "Pupusa", controlaStock: false });
    await setDoc(doc(fs, "ventas", "v-cajero"), venta("cajero"));
    await setDoc(doc(fs, "ventas", "v-cajero2"), venta("cajero2"));
    await setDoc(doc(fs, "cierres", "cajero_2026-11-01"), {
      cajeroId: "cajero", fecha: "2026-11-01", efectivoContado: 50, diferencia: 0,
    });
  });
});

// ─────────────────────────── usuarios ───────────────────────────
describe("usuarios", () => {
  const nuevoPerfil = (extra = {}) => ({
    nombre: "Nuevo Empleado",
    email: "nuevo@test.com",
    rol: "cajero",
    activo: false,
    creado: serverTimestamp(),
    ...extra,
  });

  it("un usuario nuevo puede crear su perfil como cajero inactivo", async () => {
    await assertSucceeds(setDoc(doc(db("nuevo"), "usuarios", "nuevo"), nuevoPerfil()));
  });

  it("un usuario nuevo NO puede registrarse como admin", async () => {
    await assertFails(setDoc(doc(db("nuevo"), "usuarios", "nuevo"), nuevoPerfil({ rol: "admin" })));
  });

  it("un usuario nuevo NO puede registrarse ya activo", async () => {
    await assertFails(setDoc(doc(db("nuevo"), "usuarios", "nuevo"), nuevoPerfil({ activo: true })));
  });

  it("no se puede crear el perfil de otra persona", async () => {
    await assertFails(setDoc(doc(db("nuevo"), "usuarios", "otro"), nuevoPerfil()));
  });

  it("no se puede registrar con un correo distinto al de la cuenta", async () => {
    await assertFails(
      setDoc(doc(db("nuevo"), "usuarios", "nuevo"), nuevoPerfil({ email: "falso@test.com" }))
    );
  });

  it("no se pueden agregar campos extra al registrarse", async () => {
    await assertFails(setDoc(doc(db("nuevo"), "usuarios", "nuevo"), nuevoPerfil({ permisos: "todos" })));
  });

  it("un visitante sin sesión no puede crear perfiles", async () => {
    await assertFails(setDoc(doc(db(null), "usuarios", "nuevo"), nuevoPerfil()));
  });

  it("un cajero intenta hacerse admin y es rechazado", async () => {
    await assertFails(updateDoc(doc(db("cajero"), "usuarios", "cajero"), { rol: "admin" }));
  });

  it("un cajero inactivo intenta activarse a sí mismo y es rechazado", async () => {
    await assertFails(updateDoc(doc(db("inactivo"), "usuarios", "inactivo"), { activo: true }));
  });

  it("un usuario puede cambiar su propio nombre", async () => {
    await assertSucceeds(updateDoc(doc(db("cajero"), "usuarios", "cajero"), { nombre: "Carla M." }));
  });

  it("el admin puede activar a un empleado", async () => {
    await assertSucceeds(updateDoc(doc(db("admin"), "usuarios", "inactivo"), { activo: true }));
  });

  it("el admin puede cambiar el rol de otro empleado", async () => {
    await assertSucceeds(updateDoc(doc(db("admin"), "usuarios", "cajero"), { rol: "admin" }));
  });

  it("el admin NO puede asignar un rol inexistente", async () => {
    await assertFails(updateDoc(doc(db("admin"), "usuarios", "cajero"), { rol: "superadmin" }));
  });

  it("el admin NO puede quitarse su propio rol ni desactivarse", async () => {
    await assertFails(updateDoc(doc(db("admin"), "usuarios", "admin"), { rol: "cajero" }));
    await assertFails(updateDoc(doc(db("admin"), "usuarios", "admin"), { activo: false }));
  });

  it("el admin NO puede cambiar el correo de otro empleado", async () => {
    await assertFails(updateDoc(doc(db("admin"), "usuarios", "cajero"), { email: "x@test.com" }));
  });

  it("un admin desactivado pierde sus privilegios", async () => {
    await env.withSecurityRulesDisabled((ctx) =>
      updateDoc(doc(ctx.firestore(), "usuarios", "admin2"), { activo: false })
    );
    await assertFails(updateDoc(doc(db("admin2"), "usuarios", "cajero"), { activo: false }));
  });

  it("cada quien puede leer su propio perfil, incluso inactivo", async () => {
    await assertSucceeds(getDoc(doc(db("inactivo"), "usuarios", "inactivo")));
  });

  it("un cajero NO puede leer el perfil de otro ni listar usuarios", async () => {
    await assertFails(getDoc(doc(db("cajero"), "usuarios", "cajero2")));
    await assertFails(getDocs(collection(db("cajero"), "usuarios")));
  });

  it("el admin puede listar todos los usuarios", async () => {
    await assertSucceeds(getDocs(collection(db("admin"), "usuarios")));
  });

  it("nadie puede borrar perfiles", async () => {
    await assertFails(deleteDoc(doc(db("admin"), "usuarios", "cajero")));
    await assertFails(deleteDoc(doc(db("cajero"), "usuarios", "cajero")));
  });
});

// ─────────────────────────── productos ───────────────────────────
describe("productos", () => {
  it("cualquiera (incluso sin sesión) puede leer el catálogo", async () => {
    await assertSucceeds(getDocs(collection(db(null), "productos")));
  });

  it("el admin puede crear, editar y eliminar productos", async () => {
    const fs = db("admin");
    await assertSucceeds(setDoc(doc(fs, "productos", "nuevo"), { ...productoBase, nombre: "Horchata" }));
    await assertSucceeds(updateDoc(doc(fs, "productos", "nuevo"), { precio: 3 }));
    await assertSucceeds(deleteDoc(doc(fs, "productos", "nuevo")));
  });

  it("el admin NO puede guardar un producto con precio inválido", async () => {
    await assertFails(setDoc(doc(db("admin"), "productos", "malo"), { ...productoBase, precio: 0 }));
    await assertFails(setDoc(doc(db("admin"), "productos", "malo"), { ...productoBase, precio: "dos" }));
  });

  it("un cajero NO puede crear, eliminar ni cambiar precios", async () => {
    const fs = db("cajero");
    await assertFails(setDoc(doc(fs, "productos", "nuevo"), productoBase));
    await assertFails(deleteDoc(doc(fs, "productos", "cafe")));
    await assertFails(updateDoc(doc(fs, "productos", "cafe"), { precio: 0.01 }));
  });

  it("un cajero activo puede BAJAR el stock (al vender)", async () => {
    await assertSucceeds(updateDoc(doc(db("cajero"), "productos", "cafe"), { stock: 8 }));
  });

  it("un cajero NO puede subir el stock ni dejarlo negativo", async () => {
    await assertFails(updateDoc(doc(db("cajero"), "productos", "cafe"), { stock: 50 }));
    await assertFails(updateDoc(doc(db("cajero"), "productos", "cafe"), { stock: -1 }));
  });

  it("un cajero NO puede tocar stock y otro campo a la vez", async () => {
    await assertFails(updateDoc(doc(db("cajero"), "productos", "cafe"), { stock: 8, precio: 1 }));
  });

  it("un cajero NO puede cambiar stock de un producto que no controla stock", async () => {
    await assertFails(updateDoc(doc(db("cajero"), "productos", "sinStock"), { stock: 5 }));
  });

  it("un cajero inactivo NO puede bajar el stock", async () => {
    await assertFails(updateDoc(doc(db("inactivo"), "productos", "cafe"), { stock: 8 }));
  });
});

// ─────────────────────────── ventas ───────────────────────────
describe("ventas", () => {
  it("un cajero activo registra una venta a su nombre", async () => {
    await assertSucceeds(setDoc(doc(db("cajero"), "ventas", "nueva"), venta("cajero")));
  });

  it("el admin también puede registrar ventas a su nombre", async () => {
    await assertSucceeds(setDoc(doc(db("admin"), "ventas", "nueva"), venta("admin")));
  });

  it("un cajero inactivo intenta vender y es rechazado", async () => {
    await assertFails(setDoc(doc(db("inactivo"), "ventas", "nueva"), venta("inactivo")));
  });

  it("un visitante sin sesión no puede vender", async () => {
    await assertFails(setDoc(doc(db(null), "ventas", "nueva"), venta("nadie")));
  });

  it("no se puede registrar una venta a nombre de otro cajero", async () => {
    await assertFails(setDoc(doc(db("cajero"), "ventas", "nueva"), venta("cajero2")));
  });

  it("no se puede crear una venta ya anulada, vacía, negativa o con método inválido", async () => {
    const fs = db("cajero");
    await assertFails(setDoc(doc(fs, "ventas", "a"), venta("cajero", { estado: "anulada" })));
    await assertFails(setDoc(doc(fs, "ventas", "b"), venta("cajero", { items: [] })));
    await assertFails(setDoc(doc(fs, "ventas", "c"), venta("cajero", { total: -5 })));
    await assertFails(setDoc(doc(fs, "ventas", "d"), venta("cajero", { metodoPago: "bitcoin" })));
  });

  it("el cajero lee sus ventas y consulta solo las suyas", async () => {
    const fs = db("cajero");
    await assertSucceeds(getDoc(doc(fs, "ventas", "v-cajero")));
    await assertSucceeds(getDocs(query(collection(fs, "ventas"), where("cajeroId", "==", "cajero"))));
  });

  it("el cajero NO puede leer ventas de otro ni listar todas", async () => {
    const fs = db("cajero");
    await assertFails(getDoc(doc(fs, "ventas", "v-cajero2")));
    await assertFails(getDocs(collection(fs, "ventas")));
  });

  it("el admin lee todas las ventas", async () => {
    await assertSucceeds(getDocs(collection(db("admin"), "ventas")));
  });

  it("el cajero NO puede anular ni modificar su venta", async () => {
    const fs = db("cajero");
    await assertFails(
      updateDoc(doc(fs, "ventas", "v-cajero"), { estado: "anulada", motivoAnulacion: "error" })
    );
    await assertFails(updateDoc(doc(fs, "ventas", "v-cajero"), { total: 1 }));
  });

  it("el admin anula una venta con motivo", async () => {
    await assertSucceeds(
      updateDoc(doc(db("admin"), "ventas", "v-cajero"), {
        estado: "anulada",
        motivoAnulacion: "Cobro duplicado",
        anuladoPor: "admin",
        anuladoEn: serverTimestamp(),
      })
    );
  });

  it("el admin NO puede anular sin motivo ni cambiar montos", async () => {
    const fs = db("admin");
    await assertFails(updateDoc(doc(fs, "ventas", "v-cajero"), { estado: "anulada" }));
    await assertFails(updateDoc(doc(fs, "ventas", "v-cajero"), { total: 0 }));
  });

  it("nadie puede borrar ventas", async () => {
    await assertFails(deleteDoc(doc(db("admin"), "ventas", "v-cajero")));
    await assertFails(deleteDoc(doc(db("cajero"), "ventas", "v-cajero")));
  });
});

// ─────────────────────────── cierres ───────────────────────────
describe("cierres", () => {
  const cierre = (cajeroId, fecha, extra = {}) => ({
    cajeroId,
    fecha,
    ventasCount: 3,
    totalEfectivo: 40,
    totalTarjeta: 10,
    efectivoContado: 40,
    diferencia: 0,
    creado: serverTimestamp(),
    ...extra,
  });

  it("un cajero crea su cierre del día", async () => {
    await assertSucceeds(
      setDoc(doc(db("cajero"), "cierres", "cajero_2026-11-08"), cierre("cajero", "2026-11-08"))
    );
  });

  it("no se puede hacer un segundo cierre el mismo día", async () => {
    await assertFails(
      setDoc(doc(db("cajero"), "cierres", "cajero_2026-11-01"), cierre("cajero", "2026-11-01"))
    );
  });

  it("el ID del cierre debe corresponder al cajero y la fecha", async () => {
    await assertFails(
      setDoc(doc(db("cajero"), "cierres", "cualquier-id"), cierre("cajero", "2026-11-08"))
    );
  });

  it("no se puede crear un cierre a nombre de otro ni con efectivo negativo", async () => {
    await assertFails(
      setDoc(doc(db("cajero"), "cierres", "cajero2_2026-11-08"), cierre("cajero2", "2026-11-08"))
    );
    await assertFails(
      setDoc(
        doc(db("cajero"), "cierres", "cajero_2026-11-09"),
        cierre("cajero", "2026-11-09", { efectivoContado: -1 })
      )
    );
  });

  it("un cajero inactivo no puede cerrar caja", async () => {
    await assertFails(
      setDoc(doc(db("inactivo"), "cierres", "inactivo_2026-11-08"), cierre("inactivo", "2026-11-08"))
    );
  });

  it("el cajero lee sus cierres pero no los de otros; el admin lee todos", async () => {
    await assertSucceeds(getDoc(doc(db("cajero"), "cierres", "cajero_2026-11-01")));
    await assertFails(getDoc(doc(db("cajero2"), "cierres", "cajero_2026-11-01")));
    await assertSucceeds(getDocs(collection(db("admin"), "cierres")));
  });

  it("los cierres no se modifican ni se borran", async () => {
    await assertFails(
      updateDoc(doc(db("admin"), "cierres", "cajero_2026-11-01"), { efectivoContado: 999 })
    );
    await assertFails(deleteDoc(doc(db("admin"), "cierres", "cajero_2026-11-01")));
  });
});

// ─────────────────────────── otras colecciones ───────────────────────────
describe("colecciones no declaradas", () => {
  it("están cerradas incluso para el admin", async () => {
    await assertFails(setDoc(doc(db("admin"), "secretos", "x"), { a: 1 }));
    await assertFails(getDoc(doc(db("admin"), "secretos", "x")));
  });
});
