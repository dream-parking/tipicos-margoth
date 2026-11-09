// validation.js — Validaciones puras (sin DOM ni Firebase), reutilizables por
// todas las secciones y probadas con `node --test`.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const PASSWORD_MIN = 6;

export function esEmailValido(valor) {
  return typeof valor === "string" && EMAIL_RE.test(valor.trim());
}

/**
 * Reglas reutilizables. Cada regla recibe (valor, valores) y devuelve
 * un mensaje de error (string) o null si el valor es válido.
 */
export const reglas = {
  requerido: (mensaje = "Este campo es obligatorio.") => (valor) =>
    valor === undefined || valor === null || String(valor).trim() === "" ? mensaje : null,

  email: (mensaje = "Ingresa un correo válido.") => (valor) =>
    !valor || esEmailValido(valor) ? null : mensaje,

  minLongitud: (n, mensaje = `Debe tener al menos ${n} caracteres.`) => (valor) =>
    !valor || String(valor).trim().length >= n ? null : mensaje,

  maxLongitud: (n, mensaje = `Debe tener como máximo ${n} caracteres.`) => (valor) =>
    !valor || String(valor).trim().length <= n ? null : mensaje,

  coincideCon: (campo, mensaje = "Los valores no coinciden.") => (valor, valores) =>
    valor === valores[campo] ? null : mensaje,

  numero: (mensaje = "Debe ser un número válido.") => (valor) =>
    valor === "" || valor === null || valor === undefined || Number.isFinite(Number(valor))
      ? null
      : mensaje,

  entero: (mensaje = "Debe ser un número entero.") => (valor) =>
    valor === "" || valor === null || valor === undefined || Number.isInteger(Number(valor))
      ? null
      : mensaje,

  minimo: (min, mensaje = `Debe ser mayor o igual a ${min}.`) => (valor) =>
    valor === "" || valor === null || valor === undefined || Number(valor) >= min ? null : mensaje,

  mayorQue: (min, mensaje = `Debe ser mayor que ${min}.`) => (valor) =>
    valor === "" || valor === null || valor === undefined || Number(valor) > min ? null : mensaje,

  maximo: (max, mensaje = `Debe ser menor o igual a ${max}.`) => (valor) =>
    valor === "" || valor === null || valor === undefined || Number(valor) <= max ? null : mensaje,

  enLista: (opciones, mensaje = "Selecciona una opción válida.") => (valor) =>
    !valor || opciones.includes(valor) ? null : mensaje,
};

/**
 * Valida un objeto de valores contra un esquema { campo: [regla, ...] }.
 * Se detiene en la primera regla que falla para cada campo.
 * @returns {{ valido: boolean, errores: Record<string,string> }}
 */
export function validar(valores, esquema) {
  const errores = {};
  for (const [campo, reglasCampo] of Object.entries(esquema)) {
    for (const regla of reglasCampo) {
      const error = regla(valores[campo], valores);
      if (error) {
        errores[campo] = error;
        break;
      }
    }
  }
  return { valido: Object.keys(errores).length === 0, errores };
}

export const esquemaLogin = {
  email: [reglas.requerido("Ingresa tu correo."), reglas.email()],
  password: [reglas.requerido("Ingresa tu contraseña.")],
};

export const esquemaRegistro = {
  nombre: [
    reglas.requerido("Ingresa tu nombre."),
    reglas.minLongitud(2, "El nombre debe tener al menos 2 caracteres."),
    reglas.maxLongitud(80, "El nombre debe tener como máximo 80 caracteres."),
  ],
  email: [reglas.requerido("Ingresa tu correo."), reglas.email()],
  password: [
    reglas.requerido("Ingresa una contraseña."),
    reglas.minLongitud(PASSWORD_MIN, `La contraseña debe tener al menos ${PASSWORD_MIN} caracteres.`),
  ],
  confirmacion: [
    reglas.requerido("Confirma tu contraseña."),
    reglas.coincideCon("password", "Las contraseñas no coinciden."),
  ],
};

export const validarLogin = (valores) => validar(valores, esquemaLogin);
export const validarRegistro = (valores) => validar(valores, esquemaRegistro);
