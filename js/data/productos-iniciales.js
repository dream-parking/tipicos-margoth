// productos-iniciales.js — Datos iniciales del catálogo: los 17 productos que
// estaban escritos a mano en menu.html. Los precios y el stock son valores de
// ejemplo para poder demostrar el sistema (el menú original no traía precios).
//
// Este archivo lo usan dos cosas:
//   · scripts/migrar-productos.mjs  (desde la terminal, con Node)
//   · el botón "Cargar datos iniciales" del panel de catálogo (desde el navegador)
//
// `id` es un identificador fijo: si se carga dos veces, el producto se
// sobrescribe en lugar de duplicarse.
//
// Dos productos quedan a propósito justo en su stock mínimo (Bellini y Costilla)
// para que el aviso de "stock bajo" se vea desde el primer momento.

const p = (id, categoria, orden, nombre, descripcion, precio, stock, stockMinimo, etiqueta = "") => ({
  id,
  categoria,
  orden,
  nombre,
  descripcion,
  etiqueta,
  precio,
  stock,
  stockMinimo,
  disponible: true,
  controlaStock: true,
});

export const PRODUCTOS_INICIALES = [
  // Café & bebidas calientes
  p("cafe-de-olla", "cafe-caliente", 1, "Café de olla", "Café tradicional preparado en olla de barro con canela. El favorito de la casa.", 2.5, 40, 10, "Especialidad"),
  p("cafe-de-especialidad", "cafe-caliente", 2, "Café de especialidad", "Preparaciones de filtro y espresso con grano de altura salvadoreño.", 3.5, 30, 8),
  p("chocolate-caliente", "cafe-caliente", 3, "Chocolate caliente", "Chocolate artesanal espeso, ideal para la tarde fresca de la montaña.", 3, 25, 8),

  // Bebidas frías & cocteles
  p("horchata-de-morro", "bebidas-frias", 1, "Horchata de morro", "Fría y cremosa, con cacao y especias. Muchos la llaman la mejor de El Salvador.", 2.75, 50, 12, "La mejor del país"),
  p("jugos-naturales", "bebidas-frias", 2, "Jugos naturales", "Jugos de frutas de la temporada, recién preparados.", 2.5, 40, 10),
  p("sangria", "bebidas-frias", 3, "Sangría", "Sangría de la casa para compartir mientras ves el atardecer.", 6, 20, 5),
  p("mimosa", "bebidas-frias", 4, "Mimosa", "Espumosa y refrescante, perfecta para el desayuno con vista.", 5.5, 20, 5),
  p("bellini", "bebidas-frias", 5, "Bellini", "Refrescante coctel de durazno, ideal para la tarde.", 6, 5, 5),

  // Comida típica & carnes
  p("pupusas-de-la-casa", "comida", 1, "Pupusas de la casa", "Tradicionales y con variedades especiales. Hechas a mano al momento.", 2, 80, 20, "Recomendado"),
  p("ceviche", "comida", 2, "Ceviche", "Ceviche fresco, ideal para abrir el apetito con la brisa del lago.", 8, 15, 5),
  p("churrasco", "comida", 3, "Churrasco", "Corte de carne a la parrilla con guarniciones de la casa.", 11.5, 18, 5),
  p("costilla-bbq", "comida", 4, "Costilla de cerdo en salsa BBQ", "Costilla tierna bañada en salsa barbacoa de la casa.", 12, 5, 5),
  p("new-york-steak", "comida", 5, "New York steak", "Corte New York a la parrilla, con guarnición a elección.", 12, 12, 4),

  // Postres artesanales
  p("flan-de-queso", "postres", 1, "Flan de queso", "Flan cremoso de queso con caramelo. Clásico de la casa.", 3.5, 20, 6),
  p("tres-leches-de-horchata", "postres", 2, "Tres leches de horchata", "El clásico tres leches con un giro de horchata salvadoreña.", 4, 24, 6, "Estrella"),
  p("love-cake", "postres", 3, "Love cake", "Bizcocho húmedo con frutos secos y especias. Para enamorar.", 3.75, 18, 5),
  p("carrot-cheesecake", "postres", 4, "Carrot cheesecake", "Cheesecake de zanahoria, cremoso y con ese toque especiado.", 4.25, 16, 5),
];
