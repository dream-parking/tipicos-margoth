# Café Santa Cruz · Punto de Venta

Aplicación web para **Café Santa Cruz** (Km 24 Carretera Panorámica, frente al Lago de Ilopango) que amplía el sitio del Desafío Práctico I con un **punto de venta (POS)** con usuarios, roles y datos en la nube.

🌐 **Sitio publicado:** https://cafesantacruz.alambritos.online
🔐 **Acceso de empleados:** https://cafesantacruz.alambritos.online/login.html

## El problema

El café cobra a mano. No lleva control de lo que vende ni de cuánto efectivo debería haber al cerrar caja, y el menú del sitio se actualiza editando HTML. La aplicación resuelve esto con tres procesos conectados:

1. **Gestión de catálogo e inventario** (admin): productos, precios, disponibilidad y stock.
2. **Venta en caja** (cajero): armar el ticket, cobrar, calcular el cambio y descontar el stock.
3. **Cierre de caja y reportes**: cuadrar el efectivo del turno y ver indicadores de venta.

El catálogo alimenta al POS, cada venta descuenta inventario y las ventas alimentan el cierre y los reportes.

## Roles

| Rol | Puede |
|---|---|
| **Cajero** | Iniciar sesión (si está activo), registrar ventas a su nombre, ver sus ventas, hacer su cierre de caja diario. |
| **Admin** | Todo lo anterior, más gestionar productos e inventario, **activar empleados y asignar roles**, anular ventas y ver todos los reportes. |

**Nadie puede darse privilegios por su cuenta:** quien se registra queda como `cajero` con `activo: false` y no puede operar hasta que un admin lo active. Esto lo impone `firestore.rules`, no solo la interfaz.

## Tecnología

- HTML5, CSS3 (CSS propio sobre los tokens de `css/global.css`) y **JavaScript nativo con módulos ES**. No hay frameworks ni proceso de build.
- **Firebase Authentication** (correo y contraseña) y **Cloud Firestore**, con el SDK modular v11 desde el CDN de `gstatic`.
- **Reglas de seguridad de Firestore** para la autorización por rol.
- **GitHub Pages** con dominio propio (`CNAME`) para el hosting.
- Node.js **solo para desarrollo**: pruebas (`node:test`, `@firebase/rules-unit-testing`, Firestore Emulator) y el script de usuarios de prueba.

## Estructura

```
├── index.html, menu.html, gallery.html, contacto.html   ← sitio público (DP I)
├── login.html, registro.html                            ← acceso de empleados
├── panel.html                                           ← inicio interno según el rol
├── pos.html, historial.html, caja.html                  ← punto de venta, historial de ventas y cierre de caja
├── admin/                                               ← catalogo, empleados y reportes (solo admin)
├── css/
│   ├── reset.css, global.css                            ← tokens y estilos base
│   └── app.css                                          ← componentes del sistema interno
├── js/
│   ├── config/firebase.js     ← inicialización de Firebase (config web pública)
│   ├── core/                  ← guards de sesión/rol y rutas
│   ├── services/              ← acceso a datos (auth, usuarios, …)
│   ├── ui/                    ← módulo de UI compartido (ver abajo)
│   ├── utils/                 ← lógica de negocio pura (filtros, reglas)
│   └── pages/                 ← comportamiento de cada página
├── firestore.rules            ← autorización por rol
├── firebase.json, .firebaserc ← emuladores y deploy de reglas
├── scripts/                   ← usuarios de prueba, productos iniciales y ventas de ejemplo
└── tests/
    ├── unit/                  ← validaciones y lógica de negocio
    └── rules/                 ← reglas de Firestore contra el emulador
```

La separación es: **config** (plataforma) → **services** (datos en Firestore) → **utils** (reglas de negocio puras) → **ui / pages** (DOM y eventos).

## Modelo de datos

| Colección | Campos | Quién escribe |
|---|---|---|
| `usuarios/{uid}` | `nombre, email, rol, activo, creado` | El propio usuario al registrarse (solo como cajero inactivo); el admin cambia `rol` y `activo`. |
| `productos/{id}` | `nombre, descripcion, precio, categoria, imagen, disponible, controlaStock, stock, stockMinimo` | El admin. El cajero solo puede **bajar** `stock` al vender. |
| `ventas/{id}` | `cajeroId, cajeroNombre, items[], subtotal, descuento, descuentoPorcentaje, motivoDescuento, total, metodoPago, efectivoRecibido, cambio, estado, motivoAnulacion, anuladoPor, anuladoEn, creado` | Cualquier empleado activo, a su nombre y con `estado: "pagada"`. Solo el admin anula. Nadie borra. |
| `cierres/{uid_fecha}` | `cajeroId, cajeroNombre, fecha (YYYY-MM-DD), ventasCount, totalEfectivo, totalTarjeta, efectivoContado, diferencia, creado` | El cajero, uno por día: el ID `uid_fecha` impide duplicados. |

Cada línea de `items[]` guarda `productoId, nombre, categoria, precio, cantidad`, para que una venta conserve el precio y el nombre del momento aunque el producto cambie después.

> **Reglas que respeta el código:**
> - Un cajero que consulte `ventas` o `cierres` **debe filtrar** con `where("cajeroId", "==", uid)`, o Firestore rechaza la consulta completa. Por eso el historial y el cierre piden las ventas del cajero y recortan "hoy" en JavaScript: así no hace falta un índice compuesto.
> - Los productos deben incluir `nombre`, `precio > 0`, `categoria` y `disponible`.
> - La venta y el descuento de stock van en un `runTransaction` (`registrarVenta`). La anulación y la devolución de stock también (`anularVenta`).
> - Al vender, el cajero solo escribe el campo `stock` del producto (las reglas no le dejan tocar nada más).

## Punto de venta y cierre de caja

| Proceso | Página | Lógica |
|---|---|---|
| Venta en caja | `pos.html` | `js/utils/pos.js` (ticket, descuento, cobro, stock) y `registrarVenta` en `js/services/ventas.js` |
| Historial y anulación | `historial.html` | `filtrarVentas` en `js/utils/pos.js` y `anularVenta` en `js/services/ventas.js` |
| Cierre de caja | `caja.html` | `js/utils/caja.js` y `js/services/cierres.js` |

**Venta en caja.** La cuadrícula de productos sale de Firestore, con pestañas por categoría y búsqueda rápida. Los productos agotados o no disponibles se muestran deshabilitados. El ticket permite agregar, quitar y cambiar cantidades, sin pasar del stock. El subtotal, el descuento (máximo 20% y con motivo) y el total se calculan en JavaScript. Con efectivo, el monto recibido debe ser igual o mayor al total y el cambio se calcula solo; con tarjeta no se pide monto.

**Guardar la venta (`runTransaction`).** Al cobrar, la transacción relee el stock actual de cada producto, valida, descuenta el stock y crea la venta en una sola operación. Si dos cajas venden el último producto a la vez, solo una lo logra: la otra recibe el aviso de que ya no hay stock y conserva su ticket para ajustarlo.

**Historial y anulación.** El cajero ve sus ventas del día. El admin ve todas, en un rango de fechas, y las filtra por cajero, método de pago y estado. El admin puede anular una venta con un motivo de al menos 3 caracteres: la venta queda como `anulada` y el stock se devuelve en la misma transacción. Las ventas nunca se borran.

**Cierre de caja.** El sistema suma las ventas pagadas del día del cajero (las anuladas no cuentan) y calcula lo esperado en efectivo y en tarjeta. El cajero ingresa el efectivo contado y se guarda la diferencia, con una alerta si es distinta de 0 (sobrante o faltante). Solo se permite un cierre por cajero y por día: la pantalla oculta el formulario y las reglas de Firestore rechazan un segundo cierre.

## Módulo de UI compartido (`js/ui/`)

Se importa todo desde `js/ui/index.js`:

```js
import { toast, toastExito, toastError, confirmar, mostrarCargando, mostrarVacio,
         mostrarError, conCargando, validarFormulario, reglas, formatearMoneda } from "../ui/index.js";
```

| Función | Uso |
|---|---|
| `toast(msg, tipo?, ms?)` / `toastExito` / `toastError` / `toastAviso` | Notificación breve. Tipos: `info`, `exito`, `error`, `aviso`. |
| `confirmar({ titulo, mensaje, textoConfirmar, peligro })` | Modal nativo (`<dialog>`). Devuelve `Promise<boolean>`. |
| `mostrarCargando(el, texto)` / `finCargando(el)` | Spinner dentro de un contenedor. |
| `mostrarVacio(el, { titulo, mensaje, icono })` | Estado "no hay datos". |
| `mostrarError(el, { titulo, mensaje, reintentar })` | Estado de error con botón opcional para reintentar. |
| `conCargando(boton, asyncFn, texto)` | Deshabilita el botón y muestra un spinner mientras corre la promesa. |
| `validar(valores, esquema)` + `reglas.*` | Validación pura. Reglas: `requerido`, `email`, `minLongitud`, `maxLongitud`, `coincideCon`, `numero`, `entero`, `minimo`, `mayorQue`, `maximo`, `enLista`. |
| `validarFormulario(form, esquema)` | Lee el formulario, pinta los errores junto a cada campo (accesible) y devuelve los datos o `null`. |
| `formatearMoneda`, `formatearFecha`, `formatearFechaHora`, `iniciales` | Formato para mostrar en la interfaz. |

**Proteger una página nueva:**

```html
<body data-auth="pendiente">
  <header data-app-header></header>
  <div class="auth-check" aria-hidden="true"><span class="spinner"></span></div>
  <main class="app-main">…</main>
```

```js
import { requireAuth, requireRole } from "../core/guards.js";
const { user, perfil } = await requireRole("admin");   // o await requireAuth();
```

Para agregar la página al menú, añade una entrada a `NAVEGACION` en `js/ui/header.js` y activa su tarjeta en `ACCESOS` de `js/pages/panel.js`.

## Cómo probar la aplicación

1. Entra a **/login.html**. Las credenciales de prueba (un admin, dos cajeros activos y uno pendiente) se entregan **por Moodle**. No están en el repositorio.
2. **Como admin:** en *Empleados*, busca y filtra. Activa la cuenta pendiente o cambia el rol de un cajero. Intenta modificarte a ti mismo y verás que no se permite. Con **Crear cuenta** das de alta a un empleado nuevo: le pones contraseña temporal, rol y si queda activo, y tu sesión no se cierra.
3. **Como cajero:** comprueba que no aparece *Empleados* y que al abrir `/admin/empleados.html` directamente te redirige al panel.
4. **Como el usuario pendiente:** el login avisa "pendiente de activación" y no da acceso.
5. **Registro:** en */registro.html* crea una cuenta. Queda pendiente hasta que un admin la active.
6. **Vender (`/pos.html`):** agrega productos, prueba el descuento (con más de 20% o sin motivo no deja cobrar) y cobra en efectivo con un monto menor al total (no deja) y luego uno mayor (muestra el cambio). Cobra otra venta con tarjeta y revisa en *Catálogo* que el stock bajó. Un producto con stock 0 aparece deshabilitado.
7. **Venta simultánea:** con un producto de stock 1, agrégalo en dos pestañas y cobra en ambas casi al mismo tiempo. Solo una venta se guarda; la otra muestra que ya no queda stock.
8. **Historial (`/historial.html`):** como **cajero** ves solo tus ventas de hoy y no aparece *Anular*. Como **admin** ves todas, usas los filtros y anulas una venta con motivo; después comprueba en *Catálogo* que el stock subió.
9. **Cierre (`/caja.html`):** compara el efectivo y la tarjeta esperados con tus ventas del día, ingresa el efectivo contado y cierra. Aparece la diferencia con su alerta; al recargar ya no se puede cerrar otra vez el mismo día.

### Correr en local

Los módulos ES necesitan un servidor HTTP (no funcionan con `file://`):

```bash
npm run serve        # http://localhost:5500
```

`localhost` ya está autorizado en Firebase Auth por defecto.

**Modo emulador (sin tocar los datos reales):** corre `npm run emuladores` en otra terminal y, en la consola del navegador en `localhost`, ejecuta `localStorage.emulador = "1"` y recarga la página. Para volver al proyecto real: `localStorage.removeItem("emulador")`. Para crear usuarios en el emulador: `FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 GCLOUD_PROJECT=cafe-santa-cruz npm run seed:usuarios -- emulador.csv`.

### Diseño del área privada

El sistema visual del POS (tokens, tipografía y componentes) está en [DESIGN.md](DESIGN.md). Las páginas nuevas deben cargar `css/reset.css` y `css/app.css` (no `global.css`).

## Pruebas

```bash
npm install
npm test             # pruebas unitarias: validaciones, filtros, reglas de negocio, errores
npm run test:rules   # reglas de Firestore en el emulador (necesita Java 11+)
npm run test:all     # ambas
```

- **`tests/unit/`** (155 pruebas): validación de formularios, filtrado, orden e indicadores de empleados, regla de "al menos un admin", traducción de errores y formato, catálogo y reportes, las reglas del punto de venta (`pos.test.js`: ticket, descuento, cobro, stock, filtros del historial y devolución de stock), el cierre de caja (`caja.test.js`) y los datos de ejemplo (`datos-demo.test.js`).
- **`tests/rules/`** (50 pruebas): casos permitidos y denegados por colección y rol. Por ejemplo, un cajero que intenta hacerse admin, un cajero inactivo que intenta vender, ventas a nombre de otro, subir stock, borrar ventas y un segundo cierre el mismo día.

## Configuración y despliegue

- **Reglas:** `npm run deploy:rules` (requiere `firebase login`).
- **Hosting:** GitHub Pages publica la rama `main` con el dominio de `CNAME`. Ese dominio debe estar en *Firebase Console → Authentication → Settings → Authorized domains*.
- **Usuarios de prueba:** `npm run seed:usuarios -- ruta/salida.csv`. El script crea o actualiza los usuarios y genera contraseñas nuevas en el CSV. Necesita credenciales de Google:
  - **Opción recomendada:** tu sesión de gcloud. Funciona aunque la organización bloquee las claves de cuentas de servicio:
    ```bash
    gcloud auth application-default login
    gcloud auth application-default set-quota-project cafe-santa-cruz
    ```
  - **Alternativa:** `GOOGLE_APPLICATION_CREDENTIALS=/ruta/cuenta-servicio.json`.

### Seguridad

- `js/config/firebase.js` contiene solo la **configuración web pública** de Firebase. No es un secreto: la protección real está en las reglas.
- La cuenta de servicio, los CSV y los `.env` están en `.gitignore` y **nunca** se suben al repositorio.
- Todas las colecciones no declaradas en las reglas están cerradas.

## Equipo

Desarrollo Web I · ESEN · 2026
- **Productos iniciales:** `npm run seed:productos` carga el catálogo del menú en Firestore (o usa el botón «Cargar datos iniciales» en `admin/catalogo.html`). Es seguro repetirlo.
- **Ventas y cierres de ejemplo:** `npm run seed:ventas-demo` carga unas 30 ventas de 12 días distintos (algunas con descuento y varias anuladas) y 2 cierres de caja (uno cuadra y otro tiene faltante), para que el historial y los reportes tengan qué mostrar. Todo queda marcado `demo: true`. `npm run seed:ventas-demo -- --borrar` elimina las ventas y los cierres de ejemplo. Los datos los define `scripts/datos-demo.mjs` y necesita las mismas credenciales de Google que los otros scripts.
