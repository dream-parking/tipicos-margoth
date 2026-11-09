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

/** Alta de un empleado hecha por un admin (contraseña temporal + rol). */
export const esquemaNuevoEmpleado = {
  nombre: [
    reglas.requerido("Ingresa el nombre del empleado."),
    reglas.minLongitud(2, "El nombre debe tener al menos 2 caracteres."),
    reglas.maxLongitud(80, "El nombre debe tener como máximo 80 caracteres."),
  ],
  email: [reglas.requerido("Ingresa el correo del empleado."), reglas.email()],
  password: [
    reglas.requerido("Define una contraseña temporal."),
    reglas.minLongitud(PASSWORD_MIN, `La contraseña debe tener al menos ${PASSWORD_MIN} caracteres.`),
  ],
  rol: [reglas.requerido("Elige un rol."), reglas.enLista(["admin", "cajero"], "Rol no válido.")],
};

/**
 * Contraseña temporal legible para dictar o copiar: sin caracteres ambiguos
 * (0/O, 1/l/I). `aleatorio(n)` devuelve un entero en [0, n) (inyectable en pruebas).
 */
export function generarPasswordTemporal(largo = 10, aleatorio = (n) => crypto.getRandomValues(new Uint32Array(1))[0] % n) {
  const grupos = ["ABCDEFGHJKMNPQRSTUVWXYZ", "abcdefghjkmnpqrstuvwxyz", "23456789"];
  const todos = grupos.join("");
  const chars = grupos.map((g) => g[aleatorio(g.length)]);
  while (chars.length < largo) chars.push(todos[aleatorio(todos.length)]);
  for (let i = chars.length - 1; i > 0; i--) {
    const j = aleatorio(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
}

export const validarLogin = (valores) => validar(valores, esquemaLogin);
export const validarRegistro = (valores) => validar(valores, esquemaRegistro);
