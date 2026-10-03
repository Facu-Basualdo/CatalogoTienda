# Etiquetas y filtros

[← Índice web](INDICE.md)

Los filtros del catálogo son 100 % URL: el estado vive en `searchParams`, la página se
renderiza en el servidor y un link filtrado se puede compartir. No hay estado de
filtros en React más allá del reflejo de la URL.

## URL de filtros

```
/catalogo?cat=monitores&refresco=144-hz,165-hz&panel=ips&q=gamer&orden=precio-asc&pagina=2
```

| Clave | Significado |
|---|---|
| `cat` | Slug de categoría (incluye subcategorías) |
| `q` | Texto de búsqueda (ver [busqueda](../supabase/busqueda.md)) |
| `orden` | `relevancia` · `recientes` · `precio-asc` · `precio-desc` |
| `pagina` | Desde 1 |
| cualquier otra | Slug de grupo de etiquetas → lista de slugs de etiqueta separados por coma |

- **`cat`, `q`, `orden` y `pagina` son claves reservadas.** Un grupo con slug `orden`
  se confundiría con el ordenamiento. La base lo impide con un `check`; si agregás una
  clave reservada acá, agregala al `check` (ver
  [etiquetas supabase](../supabase/etiquetas.md#invariantes)).
- `lib/catalogo/filtros.ts` tiene el único parser (`leerFiltros(searchParams)`) y el
  único serializador (`urlDeFiltros(filtros)`). Todo link de filtro pasa por ahí;
  concatenar strings de query a mano termina en `?refresco=144-hz&refresco=165-hz`,
  que el parser no espera.
- **Cambiar un filtro resetea `pagina`.** Si no, filtrás estando en la página 5 y ves
  "sin resultados" aunque haya 3 productos.
- Claves de grupo desconocidas se ignoran, no dan error: un link viejo a un grupo
  borrado tiene que seguir abriendo el catálogo.

## Semántica

**AND entre grupos, OR dentro del grupo** — lo resuelve el RPC `buscar_productos`, el
cliente sólo arma el objeto `{ grupo: [slugs] }`. Detalle y SQL en
[etiquetas supabase](../supabase/etiquetas.md#semántica-del-filtro).

## Panel de filtros

- **Las facetas vienen de `facetas_productos`, nunca se cuentan en el cliente** con los
  productos de la página actual: esos son 24 de 300 y los conteos saldrían mal.
- Un `CheckboxGroup` por grupo, ordenados por `grupos_etiqueta.orden`. Cada opción
  muestra su cantidad; las opciones con 0 se muestran deshabilitadas si están
  seleccionadas y ocultas si no.
- Desktop: columna lateral. Mobile: `Drawer` con botón "Filtros (n)". En el `Drawer`,
  los cambios se aplican al tocar "Ver resultados", no en cada tilde: cada tilde es una
  navegación y en mobile se siente trabado.
- Navegación con `router.replace(url, { scroll: false })` dentro de `useTransition`,
  así la lista muestra estado de carga sin saltar arriba.

## En la ficha del producto

Las etiquetas de grupos con `visible_en_ficha` **y `es_variante = false`** se muestran como tabla de
**Características** (`Grupo | Valor, Valor`). Es la ficha técnica automática: no hace
falta repetir "144 Hz" en la descripción. Cada valor linkea al catálogo filtrado por
esa etiqueta. Talle y color no van ahí: son el selector de variante (ver
[variantes-y-stock](variantes-y-stock.md)).

Filtrar por un grupo de variante (`talle=m`) significa "hay M con stock", no "el
producto viene en M".

## En el dashboard

En la edición de un producto: `Autocomplete` por grupo con opción "Crear «…»".
**Buscar antes de crear**: el autocompletar compara contra el slug normalizado, así
"144hz" sugiere "144 Hz" existente en vez de crear un duplicado.

`/admin/etiquetas` (grupos) y `/admin/etiquetas/[id]` (un grupo y sus valores). Acciones
en `app/admin/(panel)/etiquetas/acciones.ts`; **todas invalidan `etiquetas`, `facetas` y
`productos`** (los nombres salen en fichas, tarjetas y filtros de muchos productos).

- **Renombrar un valor cambia su slug**: el panel muestra `viejo → nuevo` antes de
  guardar. Las URLs con el slug viejo dejan de filtrar; la clave de las variantes la
  recalcula un trigger (ver [etiquetas supabase](../supabase/etiquetas.md#clave-de-las-variantes)).
- **Duplicados**: el unique por slug rechaza "144 Hz" si existe "144Hz". Los que ya
  existen con distinto slug ("Algodon" y "Algodón 100%") se juntan con **Fusionar**
  (`fusionar_etiquetas`), que mueve productos, variantes y promociones.
- Borrar un valor lo saca de los productos; si está en una variante, la base lo impide
  y el panel muestra el mensaje.
- El slug del grupo es la clave de la URL: no acepta las reservadas (`CLAVES_RESERVADAS`,
  igual que el `check` de la tabla). "Es de variante" se deshabilita si el grupo ya
  está en uso; la marca no se mueve de la primera posición.
- La muestra de color aparece en grupos de variante o si algún valor ya tiene `color_hex`.

## Ver también

- [Etiquetas (supabase)](../supabase/etiquetas.md)
- [Variantes y stock](variantes-y-stock.md)
- [Búsqueda](../supabase/busqueda.md)
- [Caché y revalidación](cache-y-revalidacion.md)
- [HeroUI](heroui.md)
