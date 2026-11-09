// modal.js — Diálogo de confirmación basado en <dialog> nativo.
// Uso: if (await confirmar({ titulo: "¿Eliminar?", mensaje: "...", peligro: true })) { ... }

export function confirmar({
  titulo = "¿Confirmar acción?",
  mensaje = "",
  textoConfirmar = "Confirmar",
  textoCancelar = "Cancelar",
  peligro = false,
} = {}) {
  return new Promise((resolve) => {
    const dialog = document.createElement("dialog");
    dialog.className = "modal";
    dialog.setAttribute("aria-labelledby", "modal-titulo");

    const h = document.createElement("h2");
    h.id = "modal-titulo";
    h.className = "modal__titulo";
    h.textContent = titulo;

    const p = document.createElement("p");
    p.className = "modal__mensaje";
    p.textContent = mensaje;

    const acciones = document.createElement("div");
    acciones.className = "modal__acciones";

    const cancelar = document.createElement("button");
    cancelar.type = "button";
    cancelar.className = "btn btn--light";
    cancelar.textContent = textoCancelar;

    const aceptar = document.createElement("button");
    aceptar.type = "button";
    aceptar.className = `btn ${peligro ? "btn--danger" : "btn--primary"}`;
    aceptar.textContent = textoConfirmar;

    acciones.append(cancelar, aceptar);
    dialog.append(h, p, acciones);
    document.body.append(dialog);

    const cerrar = (resultado) => {
      dialog.close();
      dialog.remove();
      resolve(resultado);
    };
    cancelar.addEventListener("click", () => cerrar(false));
    aceptar.addEventListener("click", () => cerrar(true));
    dialog.addEventListener("cancel", (e) => {
      e.preventDefault();
      cerrar(false);
    });

    dialog.showModal();
    cancelar.focus();
  });
}
