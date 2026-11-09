// registro.js — Comportamiento de la página de registro de empleados.
import { registrar } from "../services/auth.js";
import { traducirError } from "../services/auth-errores.js";
import { validarFormulario, mostrarErrores, esquemaRegistro, conCargando, toastError } from "../ui/index.js";
import { irA } from "../core/rutas.js";

const form = document.getElementById("form-registro");

form.addEventListener("submit", async (evento) => {
  evento.preventDefault();
  const datos = validarFormulario(form, esquemaRegistro);
  if (!datos) return;

  const boton = form.querySelector('button[type="submit"]');
  try {
    await conCargando(boton, () => registrar(datos), "Creando cuenta…");
    irA("login.html", { motivo: "registrado" });
  } catch (error) {
    console.error(error);
    const mensaje = traducirError(error);
    // Los errores asociados a un campo se muestran junto a él.
    if (error.code === "auth/email-already-in-use" || error.code === "auth/invalid-email") {
      mostrarErrores(form, { email: mensaje });
    } else if (error.code === "auth/weak-password") {
      mostrarErrores(form, { password: mensaje });
    } else {
      toastError(mensaje);
    }
  }
});
