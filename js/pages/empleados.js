// empleados.js — Gestión de empleados (solo admin): lista, búsqueda, filtros,
// alta de cuentas, activar/desactivar y cambio de rol.
import { requireRole } from "../core/guards.js";
import { listarUsuarios, cambiarRol, cambiarEstado, crearEmpleado } from "../services/usuarios.js";
import { traducirError } from "../services/auth-errores.js";
import {
  filtrarEmpleados,
  ordenarEmpleados,
  resumenEmpleados,
  validarCambioEmpleado,
} from "../utils/empleados.js";
import {
  mostrarCargando,
  mostrarVacio,
  mostrarError,
  finCargando,
  confirmar,
  toastExito,
  toastError,
  leerFormulario,
  validarFormulario,
  mostrarErrores,
  limpiarErrores,
  conCargando,
  esquemaNuevoEmpleado,
  generarPasswordTemporal,
  formatearFecha,
  iniciales,
} from "../ui/index.js";

const { perfil: yo } = await requireRole("admin");

const lista = document.getElementById("lista");
const resumen = document.getElementById("resumen");
const conteo = document.getElementById("conteo");
const filtros = document.getElementById("filtros");

let empleados = [];

// ───────── Carga de datos ─────────
async function cargar() {
  mostrarCargando(lista, "Cargando empleados…");
  conteo.textContent = "";
  try {
    empleados = await listarUsuarios();
    render();
  } catch (error) {
    console.error(error);
    resumen.replaceChildren();
    mostrarError(lista, {
      titulo: "No se pudo cargar la lista",
      mensaje: traducirError(error),
      reintentar: cargar,
    });
  }
}

// ───────── Render ─────────
function render() {
  renderResumen();
  const criterios = leerFormulario(filtros);
  const visibles = ordenarEmpleados(filtrarEmpleados(empleados, criterios));
  conteo.textContent = `Mostrando ${visibles.length} de ${empleados.length} empleados`;

  if (empleados.length === 0) {
    mostrarVacio(lista, { titulo: "Aún no hay empleados", mensaje: "Los registros nuevos aparecerán aquí." });
    return;
  }
  if (visibles.length === 0) {
    mostrarVacio(lista, { icono: ICONO_BUSCAR, titulo: "Sin resultados", mensaje: "Prueba con otra búsqueda o quita los filtros." });
    return;
  }

  const tabla = document.createElement("table");
  tabla.className = "tabla tabla--responsive";
  tabla.innerHTML = `
    <thead><tr>
      <th scope="col">Empleado</th><th scope="col">Rol</th><th scope="col">Estado</th>
      <th scope="col">Registro</th><th scope="col">Acciones</th>
    </tr></thead>`;
  const tbody = document.createElement("tbody");
  visibles.forEach((e) => tbody.append(filaEmpleado(e)));
  tabla.append(tbody);
  lista.replaceChildren(tabla);
  finCargando(lista);
}

function renderResumen() {
  const r = resumenEmpleados(empleados);
  const datos = [
    ["Empleados", r.total],
    ["Activos", r.activos],
    ["Pendientes", r.pendientes],
    ["Administradores", r.admins],
  ];
  resumen.replaceChildren(
    ...datos.map(([label, valor]) => {
      const card = document.createElement("div");
      card.className = label === "Pendientes" && valor > 0 ? "stat stat--alerta" : "stat";
      card.innerHTML = `<div class="stat__label"></div><div class="stat__valor"></div>`;
      card.querySelector(".stat__valor").textContent = valor;
      card.querySelector(".stat__label").textContent = label;
      return card;
    })
  );
}

const ICONO_BUSCAR =
  '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2"/></svg>';

function fechaRegistro(valor) {
  const span = document.createElement("span");
  span.className = "fecha";
  span.textContent = formatearFecha(valor);
  return span;
}

function celda(label, ...hijos) {
  const td = document.createElement("td");
  td.dataset.label = label;
  td.append(...hijos);
  return td;
}

function badge(texto, variante) {
  const span = document.createElement("span");
  span.className = `badge badge--${variante}`;
  span.textContent = texto;
  return span;
}

function filaEmpleado(e) {
  const tr = document.createElement("tr");
  const esYo = e.uid === yo.uid;

  // Persona
  const persona = document.createElement("div");
  persona.className = "persona";
  const avatar = document.createElement("span");
  avatar.className = "persona__avatar";
  avatar.setAttribute("aria-hidden", "true");
  avatar.textContent = iniciales(e.nombre);
  const datos = document.createElement("div");
  const nombre = document.createElement("div");
  nombre.className = "persona__nombre";
  nombre.textContent = esYo ? `${e.nombre} (tú)` : e.nombre;
  const email = document.createElement("div");
  email.className = "persona__email";
  email.textContent = e.email;
  datos.append(nombre, email);
  persona.append(avatar, datos);

  // Rol (select editable salvo para uno mismo)
  const selectRol = document.createElement("select");
  selectRol.className = "select";
  selectRol.setAttribute("aria-label", `Rol de ${e.nombre}`);
  selectRol.innerHTML = `<option value="cajero">Cajero</option><option value="admin">Administrador</option>`;
  selectRol.value = e.rol;
  selectRol.disabled = esYo;
  selectRol.addEventListener("change", () => onCambiarRol(e, selectRol));

  // Estado
  const estado = e.activo ? badge("Activo", "activo") : badge("Pendiente", "inactivo");

  // Acciones
  const acciones = document.createElement("div");
  acciones.className = "tabla__acciones";
  const btnEstado = document.createElement("button");
  btnEstado.type = "button";
  btnEstado.className = `btn btn--sm ${e.activo ? "btn--light" : "btn--secondary"}`;
  btnEstado.textContent = e.activo ? "Desactivar" : "Activar";
  btnEstado.disabled = esYo;
  if (esYo) btnEstado.title = "No puedes desactivar tu propia cuenta";
  btnEstado.addEventListener("click", () => onCambiarEstado(e, btnEstado));
  acciones.append(btnEstado);

  tr.append(
    celda("Empleado", persona),
    celda("Rol", selectRol),
    celda("Estado", estado),
    celda("Registro", fechaRegistro(e.creado)),
    celda("Acciones", acciones)
  );
  return tr;
}

// ───────── Acciones ─────────
async function onCambiarRol(empleado, select) {
  const nuevoRol = select.value;
  const validacion = validarCambioEmpleado(yo.uid, empleado, { rol: nuevoRol }, empleados);
  if (!validacion.permitido) {
    toastError(validacion.motivo);
    select.value = empleado.rol;
    return;
  }
  const ok = await confirmar({
    titulo: "Cambiar rol",
    mensaje: `¿Cambiar a ${empleado.nombre} de ${empleado.rol} a ${nuevoRol}?`,
    textoConfirmar: "Cambiar rol",
    peligro: nuevoRol === "admin",
  });
  if (!ok) {
    select.value = empleado.rol;
    return;
  }
  select.disabled = true;
  try {
    await cambiarRol(empleado.uid, nuevoRol);
    empleado.rol = nuevoRol;
    toastExito(`${empleado.nombre} ahora es ${nuevoRol}.`);
    render();
  } catch (error) {
    console.error(error);
    select.value = empleado.rol;
    select.disabled = false;
    toastError(traducirError(error));
  }
}

async function onCambiarEstado(empleado, boton) {
  const activar = !empleado.activo;
  const validacion = validarCambioEmpleado(yo.uid, empleado, { activo: activar }, empleados);
  if (!validacion.permitido) {
    toastError(validacion.motivo);
    return;
  }
  const ok = await confirmar({
    titulo: activar ? "Activar cuenta" : "Desactivar cuenta",
    mensaje: activar
      ? `${empleado.nombre} podrá iniciar sesión y operar como ${empleado.rol}.`
      : `${empleado.nombre} ya no podrá iniciar sesión ni registrar ventas.`,
    textoConfirmar: activar ? "Activar" : "Desactivar",
    peligro: !activar,
  });
  if (!ok) return;

  boton.disabled = true;
  boton.textContent = "Guardando…";
  try {
    await cambiarEstado(empleado.uid, activar);
    empleado.activo = activar;
    toastExito(`Cuenta de ${empleado.nombre} ${activar ? "activada" : "desactivada"}.`);
    render();
  } catch (error) {
    console.error(error);
    toastError(traducirError(error));
    render();
  }
}

// ───────── Crear cuenta ─────────
const dlgCrear = document.getElementById("dlg-crear");
const formCrear = document.getElementById("form-crear");

function abrirCrear() {
  formCrear.reset();
  limpiarErrores(formCrear);
  formCrear.password.value = generarPasswordTemporal();
  dlgCrear.showModal();
  formCrear.nombre.focus();
}

function cerrarCrear() {
  dlgCrear.close();
}

formCrear.addEventListener("submit", async (evento) => {
  evento.preventDefault();
  const datos = validarFormulario(formCrear, esquemaNuevoEmpleado);
  if (!datos) return;

  // Regla de negocio: el correo no puede repetirse en el equipo.
  const correo = datos.email.toLowerCase();
  if (empleados.some((e) => e.email?.toLowerCase() === correo)) {
    mostrarErrores(formCrear, { email: "Ya hay un empleado con ese correo." });
    return;
  }

  const boton = formCrear.querySelector('button[type="submit"]');
  try {
    const nuevo = await conCargando(
      boton,
      () => crearEmpleado({ ...datos, email: correo, activo: datos.activo === true }),
      "Creando…"
    );
    empleados.push(nuevo);
    cerrarCrear();
    render();
    toastExito(
      nuevo.activo
        ? `Cuenta de ${nuevo.nombre} creada y activa.`
        : `Cuenta de ${nuevo.nombre} creada. Queda pendiente de activación.`,
      6000
    );
  } catch (error) {
    console.error(error);
    if (error.parcial) {
      // La cuenta existe, pero no se pudo aplicar el rol/estado.
      cerrarCrear();
      toastError("La cuenta se creó, pero quedó como cajero pendiente. Ajusta su rol y estado en la lista.");
      cargar();
    } else if (error.code === "auth/email-already-in-use" || error.code === "auth/invalid-email") {
      mostrarErrores(formCrear, { email: traducirError(error) });
    } else if (error.code === "auth/weak-password") {
      mostrarErrores(formCrear, { password: traducirError(error) });
    } else {
      toastError(traducirError(error));
    }
  }
});

document.getElementById("btn-crear").addEventListener("click", abrirCrear);
document.getElementById("btn-cancelar-crear").addEventListener("click", cerrarCrear);
document.getElementById("btn-generar").addEventListener("click", () => {
  formCrear.password.value = generarPasswordTemporal();
  formCrear.password.select();
});

// ───────── Eventos ─────────
filtros.addEventListener("input", render);
filtros.addEventListener("change", render);
document.getElementById("btn-recargar").addEventListener("click", cargar);

cargar();
