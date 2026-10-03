# Combos

[← Índice web](INDICE.md)

**En el carrito, una línea se identifica por su `clave`, no por la variante.** Un combo
no tiene una variante: tiene una por producto. `claveItem()` en `lib/carrito/almacen.ts`
arma la misma clave que devuelve `cotizar` (`variante_id`, o
`combo:<id>:<variante1>,<variante2>…`), y `carrito.quitar` / `fijarCantidad` reciben
esa clave. Si los dos formatos se desalinean, quitar un combo del carrito no hace nada.
Motor y pedido en [combos supabase](../supabase/combos.md).

## Tienda

| Ruta / pieza | Qué hace |
|---|---|
| `/combos` | Grilla de `TarjetaCombo` (de `buscar_combos`). **No van en `/catalogo`**: romperían facetas y paginación |
| Home | Carrusel "combos" con los destacados |
| `/combo/[slug]` | Galería (si el combo no tiene imágenes, la principal de cada producto), precio con lista tachada y "Ahorrás", `SelectorCombo`, descripción |
| `TarjetaCombo` | Siempre lleva a la ficha ("Armar combo"): hay que elegir variantes |

- `obtenerCombo` (en `lib/catalogo/combos.ts`) **reusa `obtenerProducto`** de cada ítem
  para grupos y variantes, y pisa el precio de cada variante con el de lista: adentro
  del combo no hay promos. Un producto oculto no vuelve de `obtenerProducto` y el combo
  queda no disponible.
- `SelectorCombo` aplica las reglas del selector de la ficha
  (`lib/catalogo/variantes.ts`, compartido) **contra la cantidad del ítem**: si el combo
  lleva 2 remeras, una variante con 1 de stock se ve agotada. La elección vive en
  estado local, no en la URL.
- **Manda las variantes en el orden de `items`**, que es el de `combo_items`: `cotizar`
  las empareja por posición.
- El "Ahorrás" de la tarjeta y la ficha usa el precio de lista más bajo de cada producto
  (igual que `buscar_combos`); el del carrito, las variantes elegidas.

## Carrito y pedido

- `ItemCarrito` es una unión: `{ tipo: "variante", varianteId }` o
  `{ tipo: "combo", comboId, variantes[] }`. `validar()` descarta lo que no cumpla al
  leer `localStorage`.
- La línea de combo muestra "Combo", un renglón por producto (`detalle` separado por
  ` + `) y el chip "Ahorrás $X". El mensaje de WhatsApp antepone "Combo".
- En el panel, el detalle del pedido muestra el padre ("Combo: …", con el precio) y las
  hijas debajo, sangradas y sin precio. El listado cuenta unidades sin los padres.

## Dashboard

`/admin/combos` (listado con switch "Visible") y `/admin/combos/[id]`. "Nuevo combo"
crea un borrador oculto (`combo-borrador-…`) porque las imágenes necesitan el id.
Acciones en `app/admin/(panel)/combos/acciones.ts`; invalidan `combos` y `combo:{slug}`.

- **Productos**: `EditorItemsCombo` (ComboBox + cantidades + orden con flechas) guarda
  con el RPC `guardar_combo_items`, que reemplaza todo en una transacción. Muestra el
  precio por separado y el ahorro como vista previa.
- No se puede publicar sin productos (lo chequea la acción).
- Imágenes y descripción usan los mismos componentes que productos: `GaleriaAdmin` y
  `EditorDescripcion` reciben las Server Actions **ya ligadas con `.bind(null, id)`**
  desde la página, y no saben si es un producto o un combo. La validación de la
  descripción está en `lib/admin/descripcion.ts`.

## Caché

Las lecturas de combos llevan `combos` (y `combo:{slug}`) **más `productos`**: el
stock, el precio y la visibilidad de los productos cambian la disponibilidad y el ahorro
del combo, y esas mutaciones ya invalidan `productos`.

## Ver también

- [Combos (supabase)](../supabase/combos.md) — tablas, `clave`, padre + hijas
- [Carrito](carrito.md)
- [Variantes y stock](variantes-y-stock.md#selector-en-la-ficha)
- [Dashboard](dashboard.md)
- [Caché y revalidación](cache-y-revalidacion.md#tags)
