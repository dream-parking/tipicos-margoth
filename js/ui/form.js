// form.js — Helpers de DOM para formularios: leer valores y mostrar errores
// por campo de forma accesible (aria-invalid + aria-describedby).
import { validar } from "./validation.js";

/** Devuelve un objeto { name: valor } con los campos del formulario. */
export function leerFormulario(form) {
  const datos = {};
  for (const [nombre, valor] of new FormData(form).entries()) {
    datos[nombre] = typeof valor === "string" ? valor.trim() : valor;
  }
  // Los checkboxes desmarcados no aparecen en FormData.
  form.querySelectorAll('input[type="checkbox"][name]').forEach((cb) => {
    datos[cb.name] = cb.checked;
  });
  return datos;
}

export function limpiarErrores(form) {
  form.querySelectorAll("[aria-invalid]").forEach((el) => el.removeAttribute("aria-invalid"));
  form.querySelectorAll(".field__error").forEach((el) => {
    el.textContent = "";
    el.hidden = true;
  });
}

/** Muestra { campo: mensaje } junto a cada input y enfoca el primero. */
export function mostrarErrores(form, errores) {
  limpiarErrores(form);
  let primero = null;
  for (const [campo, mensaje] of Object.entries(errores)) {
    const input = form.elements[campo];
    if (!input) continue;
    const idError = `${input.id || campo}-error`;
    let nodo = form.querySelector(`#${CSS.escape(idError)}`);
    if (!nodo) {
      nodo = document.createElement("p");
      nodo.id = idError;
      nodo.className = "field__error";
      input.insertAdjacentElement("afterend", nodo);
    }
    nodo.textContent = mensaje;
    nodo.hidden = false;
    input.setAttribute("aria-invalid", "true");
    input.setAttribute("aria-describedby", idError);
    primero ??= input;
  }
  primero?.focus();
}

/**
 * Lee y valida un formulario. Si hay errores los pinta y devuelve null;
 * si es válido devuelve los datos.
 */
export function validarFormulario(form, esquema) {
  const datos = leerFormulario(form);
  const { valido, errores } = validar(datos, esquema);
  if (!valido) {
    mostrarErrores(form, errores);
    return null;
  }
  limpiarErrores(form);
  return datos;
}
