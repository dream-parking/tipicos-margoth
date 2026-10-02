# Café Santa Cruz

Sitio web estático (HTML y CSS) de Café Santa Cruz, un café con comida típica salvadoreña y vista al Lago de Ilopango, en el Km 24 de la Carretera Panorámica.

Proyecto del curso Web 2 (ESEN).

**Sitio publicado:** https://cafesantacruz.alambritos.online/

## Páginas

| Archivo | Contenido |
|---|---|
| `index.html` | Inicio: hero, nuestra historia, lo que encontrarás, recomendaciones y llamado final |
| `menu.html` | Menú por categorías: bebidas calientes, bebidas frías, comida típica y postres |
| `galeria.html` | Galería de la carta y del mirador a lo largo del día |
| `contacto.html` | Datos de contacto, horarios, formulario de reserva y mapa |
| `404.html` | Página que GitHub Pages muestra cuando una URL no existe |

## Estructura

```
├── index.html, menu.html, galeria.html, contacto.html, 404.html
├── css/
│   ├── reset.css      Reset y normalización
│   ├── global.css     Tokens (colores, tipografía, espaciado), header, footer,
│   │                  botones y componentes compartidos
│   ├── index.css      Estilos solo del inicio
│   ├── menu.css       Estilos solo del menú
│   ├── galeria.css    Estilos solo de la galería
│   └── contacto.css   Estilos solo de contacto
├── img/               Fotos en WebP con nombres en kebab-case
│   └── miniaturas/    Miniaturas de 128px para los iconos del menú
└── CNAME              Dominio propio para GitHub Pages
```

## Convenciones

- Cada página carga `reset.css`, `global.css` y, si la tiene, su propia hoja. Una página nunca carga la hoja de otra. `404.html` solo usa `reset.css` y `global.css`, con rutas absolutas (`/css/...`) porque GitHub Pages la muestra en cualquier URL inexistente.
- Los colores, tamaños de fuente y espacios se definen como variables en `:root` (`global.css`) y se usan con `var(--...)`.
- La mayoría de las clases siguen el estilo BEM, `bloque__elemento--modificador` (por ejemplo `site-header__logo`, `btn--primary`, `menu-item__tag`).
- Puntos de quiebre: **820px** (tablet: grillas a 1–2 columnas, se oculta el botón Reservar), **560px** (móvil) y **480px** (header en dos filas).
- Maquetación: Grid para las grillas (ofertas, recomendaciones, galería, menú, contacto) y Flexbox para alinear elementos en una fila (header, nav, listas).

## Ver el sitio en local

```bash
python3 -m http.server 8000
```

Luego abrir http://localhost:8000.

## Equipo

| Integrante | GitHub | Partes principales |
|---|---|---|
| Alan | desedasalan06-bit | Página de contacto y formulario |
| Nayeli Santacruz | NayeSantacruz | Inicio, footer y galería |
| Víctor López | vicrenlopez14 (algunos commits aparecen como vicrenlopezh14) | Estructura inicial y estilos globales, menú y publicación |
