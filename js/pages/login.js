// login.js — Comportamiento de la página de inicio de sesión.
import { iniciarSesion, usuarioActual, obtenerPerfil } from "../services/auth.js";
import { traducirError } from "../services/auth-errores.js";
import { validarFormulario, esquemaLogin, conCargando } from "../ui/index.js";
import { irA, destinoSeguro } from "../core/rutas.js";

const MOTIVOS = {
  inactivo: ["aviso", "Tu cuenta está pendiente de activación. Un administrador debe activarla."],
  "sin-perfil": ["error", "Tu cuenta no tiene perfil de empleado. Contacta al administrador."],
  registrado: ["exito", "¡Cuenta creada! Cuando un administrador la active podrás iniciar sesión."],
  salida: ["info", "Cerraste sesión correctamente."],
};

const form = document.getElementById("form-login");
const aviso = document.getElementById("aviso");
const params = new URLSearchParams(window.location.search);
const destino = destinoSeguro(params.get("next"));

function mostrarAviso(tipo, mensaje) {
  aviso.className = `alerta alerta--${tipo}`;
  aviso.textContent = mensaje;
  aviso.hidden = false;
}

const motivo = MOTIVOS[params.get("motivo")];
if (motivo) mostrarAviso(...motivo);

// Si ya hay una sesión activa, no tiene sentido volver a pedir credenciales.
const user = await usuarioActual();
if (user) {
  const perfil = await obtenerPerfil(user.uid).catch(() => null);
  if (perfil?.activo) irA(destino);
}

form.addEventListener("submit", async (evento) => {
  evento.preventDefault();
  aviso.hidden = true;
  const datos = validarFormulario(form, esquemaLogin);
  if (!datos) return;

  const boton = form.querySelector('button[type="submit"]');
  try {
    const perfil = await conCargando(boton, () => iniciarSesion(datos), "Ingresando…");
    mostrarAviso("exito", `¡Bienvenido, ${perfil.nombre}! Redirigiendo…`);
    irA(destino);
  } catch (error) {
    console.error(error);
    mostrarAviso(error.code === "app/inactivo" ? "aviso" : "error", traducirError(error));
    form.password.value = "";
    form.password.focus();
  }
});
