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
├── admin/empleados.html                                 ← gestión de empleados (admin)
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
├── scripts/                   ← script de usuarios de prueba
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
| `ventas/{id}` | `cajeroId, cajeroNombre, items[], subtotal, descuento, total, metodoPago, efectivoRecibido, cambio, estado, motivoAnulacion, creado` | Cualquier empleado activo, a su nombre y con `estado: "pagada"`. Solo el admin anula. Nadie borra. |
| `cierres/{uid_fecha}` | `cajeroId, fecha (YYYY-MM-DD), ventasCount, totalEfectivo, totalTarjeta, efectivoContado, diferencia, creado` | El cajero, uno por día: el ID `uid_fecha` impide duplicados. |

> **Para las Secciones 2 y 3:**
> - Un cajero que consulte `ventas` o `cierres` **debe filtrar** con `where("cajeroId", "==", uid)`, o Firestore rechaza la consulta completa.
> - Los productos deben incluir `nombre`, `precio > 0`, `categoria` y `disponible`.
> - La venta y el descuento de stock deben ir en un `runTransaction`.

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
2. **Como admin:** en *Empleados*, busca y filtra. Activa la cuenta pendiente o cambia el rol de un cajero. Intenta modificarte a ti mismo y verás que no se permite.
3. **Como cajero:** comprueba que no aparece *Empleados* y que al abrir `/admin/empleados.html` directamente te redirige al panel.
4. **Como el usuario pendiente:** el login avisa "pendiente de activación" y no da acceso.
5. **Registro:** en */registro.html* crea una cuenta. Queda pendiente hasta que un admin la active.

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

- **`tests/unit/`** (37 pruebas): validación de formularios, filtrado, orden e indicadores de empleados, regla de "al menos un admin", traducción de errores y formato.
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
