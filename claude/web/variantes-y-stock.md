# Variantes y stock

[← Índice web](INDICE.md)

Modelo, invariantes y SQL en [variantes-y-stock (supabase)](../supabase/variantes-y-stock.md).
Resumen: todo producto tiene ≥ 1 variante, el stock vive en la variante, las
etiquetas de grupos `es_variante` (Talle, Color…) van en la variante.

## Tarjeta del catálogo

- Precio: `precio_desde`. Si `precio_varia`, prefijo "Desde".
- **"Sin stock"** con `Chip variant="secondary"` (gris, no rojo: ver
  [tema-y-marca](tema-y-marca.md)) cuando `disponible = false`. La tarjeta sigue
  linkeando a la ficha.
- El orden (sin stock al final) lo resuelve el RPC. No reordenes en el cliente: se
  rompe la paginación.

## Selector en la ficha

Un `ToggleButtonGroup selectionMode="single"` por grupo de variante
(`components/tienda/selector-variantes.tsx`); los colores llevan la muestra de
`color_hex` adentro del botón. Nada de `<select>`. Las reglas de abajo están en
`lib/catalogo/variantes.ts`, compartidas con el selector del combo (que las evalúa
contra la cantidad del ítem, ver [combos](combos.md#tienda)).

- **Nunca se ocultan opciones.** Si se ocultan, al elegir "negro" desaparece el talle M
  y el usuario no entiende si el producto viene en M.
  - Combinación **agotada**: tachada pero elegible; al elegirla se ve "Sin stock en esta
    combinación" y el botón pasa a "Consultar disponibilidad".
  - Combinación **inexistente** (el producto no viene así): deshabilitada.
  - Al elegir una opción cuya combinación exacta no existe, salta a la primera variante
    con stock que la tenga.
- La disponibilidad de cada opción se calcula contra lo ya elegido en los otros
  grupos: con "negro" elegido, M se deshabilita si "M/negro" no tiene stock aunque
  "M/blanco" sí.
- La variante elegida vive en la URL (`/p/remera-basica?variante=<id>`), así un link
  compartido abre la combinación exacta. Sin parámetro, se preselecciona la primera
  variante con stock según `orden`.
- Al cambiar de variante cambian precio y aviso de stock; las fotos no (no hay
  imágenes por variante en v1).
- Producto con variante única: no se muestra selector.
- Mensaje de stock: "Sin stock", "Últimas n unidades" si `stock ≤ 3`, nada si hay más.
  El número exacto no se muestra por encima de ese umbral.
- El botón de contacto incluye la variante en el mensaje ("Remera básica — M / Negro").

## Filtros

El usuario filtra por talle igual que por material: la URL y `leerFiltros` no
distinguen grupos de variante (ver [etiquetas](etiquetas.md#url-de-filtros)). La
diferencia la hace el RPC: filtrar `talle=m` significa **"hay M con stock"**.

Los grupos de variante **no aparecen en la tabla de Características** de la ficha: ya
están en el selector.

## Dashboard

Sección "Variantes" en la edición del producto:

1. Elegir los grupos de variante que usa el producto (máximo 3) y, por grupo, las
   etiquetas (`Autocomplete` con "Crear «…»").
2. Las combinaciones se generan solas (producto cartesiano, `editor-variantes.tsx`) en
   una grilla editable (no `Table`: ver [heroui](heroui.md#rsc)) y conservan los valores ya
   cargados de cada combinación: SKU, precio (vacío = precio base), stock (`NumberField`), activa
   (`Switch`). Tope de 100 combinaciones.
3. "Aplicar stock a todas" para cargas masivas.
4. Guardar manda la lista completa a `guardar_variantes` (un solo RPC, nunca updates
   sueltos).

**Quitar una etiqueta de la selección borra las variantes que la usan.** Si alguna
tiene stock > 0, `Modal` de confirmación con la lista.

En el listado de productos: columna de stock total, `Switch` de publicado inline y
filtro "Sin stock".

Toda escritura de variantes o stock invalida `producto:{slug}`, `productos` y
`facetas` (ver [cache-y-revalidacion](cache-y-revalidacion.md#tags)).

## Ver también

- [Variantes y stock (supabase)](../supabase/variantes-y-stock.md)
- [Combos](combos.md) — un selector por producto con las mismas reglas
- [Etiquetas y filtros](etiquetas.md)
- [Tema y marca](tema-y-marca.md)
- [HeroUI](heroui.md)
