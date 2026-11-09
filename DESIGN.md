# DESIGN.md — Área privada (POS)

> Alcance: `login.html`, `registro.html`, `panel.html`, `admin/*` y toda página interna que agreguen las Secciones 2 y 3. El sitio público (`index`, `menu`, `gallery`, `contacto`) conserva su propio estilo en `css/global.css`.

**Dirección:** rieles de pago en un estudio de dibujo técnico, con los **colores oficiales de Café Santa Cruz** (los mismos de `css/global.css`). Papel blanco, tinta azul marino, líneas finas de construcción y **una sola señal cerúleo** (el Lago de Ilopango) para lo que está activo o es la acción principal. Es una herramienta de trabajo (modo *Operate*): la marca vive en los detalles precisos, no en la decoración.

Implementación: `css/app.css` (independiente de `global.css`). Fuentes: Google Fonts `Inter`, `Inter Tight` y `Chivo Mono`.

## Color

| Token | Valor | Origen de marca | Uso |
|---|---|---|---|
| `--paper` | `#ffffff` | Blanco puro | Fondo, tarjetas, header |
| `--cloud` | `#f8f9fa` | Marfil | Superficies tenues, encabezado de tabla, módulos "en desarrollo" |
| `--steel` | `#d9dfe6` | Azul marino al 12% | Líneas finas, bordes, separadores |
| `--slate` | `#5a6b7a` | Muted | Texto secundario, navegación inactiva, etiquetas mono |
| `--ink` / `--graphite` | `#0d2240` | Azul Marino Real | Texto principal, botón secundario, módulo disponible, toasts, ticket |
| `--graphite-dark` | `#081729` | Azul Marino oscuro | Hover de los elementos marinos |
| `--signal` | `#00a3e0` | Azul Cerúleo / Lago de Ilopango | **Solo** la acción principal de la vista, el ítem de navegación activo y marcadores "en vivo" |
| `--accent` / `--notice` | `#8b5a2b` / `#f6ede3` | Madera / Café Tostado | Avisos, cuentas pendientes y puntos de alerta |
| `--green` | `#2e5b38` | Verde Bosque / Palma | Estado "activo" |
| `--sweep` | cerúleo → verde | Lago → palma | Línea de acento rara (ticket de la ilustración) |
| `--danger` | `#b42318` | — | Errores y acciones destructivas |

**Reglas**
- El botón principal es cerúleo con **texto azul marino** (contraste 5.5:1). El blanco sobre cerúleo da 2.9:1 y no cumple AA en texto de 14px.
- El cerúleo no se usa como fondo de secciones ni en más de una acción principal por vista. En tablas, las acciones de fila son marinas o claras.
- Sin color saturado en texto, navegación ni superficies grandes.

## Tipografía

| Rol | Familia | Tamaño | Notas |
|---|---|---|---|
| Display de acceso | Inter Tight 500 | 44–64px | `line-height: 0.92`, `letter-spacing: -0.04em` |
| Título de página | Inter Tight 500 | 40–56px | `line-height: 1`, `-0.04em` |
| Título de módulo/modal | Inter Tight 500 | 24–28px | `-0.03em` |
| Cuerpo/UI | Inter 500 | 14px | Navegación, botones y formularios |
| Técnica | Chivo Mono 400 | 11–12px | Eyebrows, fechas, correos, roles, conteos (mayúsculas + `0.04em`) |

Neo Grotesk (referencia original) se sustituye por **Inter Tight**. Nunca usar Inter para títulos display.

## Forma y elevación

- Radios: tarjetas y módulos **16px**, botones **12px**, inputs **10px**, etiquetas **6px**, links **4px**. Solo los avatares son circulares; las etiquetas no son píldoras.
- Tarjeta: `--elev-card` (anillo de 1px + sombra suave). Panel oscuro: `--elev-dark` + borde interior `--inset-edge`.
- Espaciado en múltiplos de 4/8: `8, 12, 16, 24, 32, 40, 56, 72`.

## Componentes (clases)

| Componente | Clase | Notas |
|---|---|---|
| Botón principal | `.btn.btn--primary` | Cerúleo con texto marino. Usar `.btn--lg` en formularios de acceso |
| Botón secundario | `.btn.btn--secondary` | Azul marino con borde interior; "Salir", "Activar" |
| Botón claro | `.btn.btn--light` | Blanco con anillo steel |
| Header | `.app-header` (lo genera `js/ui/header.js`) | El ítem activo lleva un cuadrito cerúleo |
| Título de página | `.app-title` con `.eyebrow` + `h1` + `p` | Termina con una línea steel |
| Indicadores | `.stats > .stat` | Celdas unidas por líneas finas; `.stat--alerta` agrega un punto madera |
| Módulo del panel | `.modulo` + `--activo` / `--pronto` | Disponible = azul marino; en desarrollo = marfil |
| Datos | `.panel-datos` > `.toolbar` + `.conteo` + `.tabla` | La tabla se apila en móvil (`.tabla--responsive`) |
| Etiqueta de estado | `.badge` + `--activo` / `--inactivo` | Mono, mayúsculas, cuadrito de color |
| Aviso | `.franja` (madera clara) · `.alerta` + `--exito/--error/--aviso` | |
| Estados | `mostrarCargando / mostrarVacio / mostrarError` | Íconos de trazo, nunca emojis |
| Acceso | `.acceso` = formulario + `.acceso__visual` | Ilustración técnica: hojas superpuestas + ticket azul marino |

## Imágenes

No hay fotografía en el área privada. Se usan ilustraciones técnicas en CSS: hojas blancas con líneas steel sobre una retícula de 48px, un ticket azul marino al centro y señales diminutas en cerúleo y madera.

## Accesibilidad

- El foco visible es un anillo doble (papel + tinta). En inputs, el anillo es cerúleo.
- Contraste del texto: tinta sobre papel y slate sobre papel (texto secundario). En las etiquetas, el color nunca es el único indicador: siempre llevan texto.
- Se respeta `prefers-reduced-motion`.
