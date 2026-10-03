# Etiquetas

[← Índice supabase](INDICE.md)

El catálogo tiene que servir igual para una remera y para un monitor, así que no hay
columnas como `talle` o `hz`: **todo atributo filtrable es una etiqueta dentro de un
grupo**.

| grupos_etiqueta (`nombre` / `slug`) | etiquetas (`valor` / `slug`) |
|---|---|
| Tasa de refresco / `refresco` | 144 Hz / `144-hz` · 165 Hz / `165-hz` |
| Material / `material` | 100% algodón / `100-algodon` · Poliéster / `poliester` |
| Talle / `talle` | S / `s` · M / `m` · L / `l` |

## Tablas

- `grupos_etiqueta`: `id`, `nombre`, `slug` unique, `orden`, `visible_en_filtros bool`,
  `visible_en_ficha bool`, `es_variante bool` (Talle, Color: ver
  [variantes-y-stock](variantes-y-stock.md)).
- `etiquetas`: `id`, `grupo_id` fk not null, `valor` (lo que se muestra), `slug`,
  `orden`. **Unique `(grupo_id, slug)`.**
- `producto_etiquetas`: `(producto_id, etiqueta_id)` pk, ambas fk `on delete cascade`.
  Índice extra en `etiqueta_id` para el filtro. **Sólo etiquetas de grupos con
  `es_variante = false`**; las de talle/color van en `variante_etiquetas`.

## Invariantes

- **La marca es un grupo común con `es_marca = true`** (uno solo, por índice único parcial,
  y nunca de variante: `check`). `buscar_productos` devuelve su valor para la tarjeta y
  el grupo va primero en los filtros (`orden = 0`). No hay columna `marca` en `productos`:
  sería un segundo lugar donde filtrar y se desincronizaría con la faceta.
- **Toda etiqueta tiene grupo.** Una etiqueta suelta no se puede ubicar en el panel de
  filtros ni en la tabla de características. Si el admin no sabe qué grupo, va a
  `General`.
- **El slug es una columna generada** (`generated always as (slugify(valor))`): no se escribe nunca, ni desde el dashboard ni desde el seed. `slugify` aplica
  `f_unaccent`, pasa a minúsculas, reemplaza lo no alfanumérico por `-` y **separa
  número de unidad** (`(\d)([a-z])` → `\1-\2`). Sin ese último paso, "144Hz" da
  `144hz` y "144 Hz" da `144-hz`: dos etiquetas distintas para lo mismo y el filtro
  queda partido. Con él, todas caen en `144-hz` y el unique rechaza el duplicado. El
  dashboard además ofrece autocompletar para reusar antes de crear.
- **Los slugs de grupo no pueden ser `cat`, `q`, `orden` ni `pagina`.** Son las claves
  reservadas de la URL del catálogo (ver [etiquetas web](../web/etiquetas.md#url-de-filtros)).
  Un `check` en la tabla lo impide; si agregás una clave reservada nueva en la web,
  agregala también al `check` en una migración.

## Clave de las variantes

`producto_variantes.clave` son los slugs de sus etiquetas ordenados por grupo
(`orden`, `slug`): `m/negro`. **Si queda vieja, el siguiente `guardar_variantes` borra
esas variantes y las recrea con otro id** (los carritos que las tenían dejan de
encontrarlas). Por eso hay triggers que la recalculan con `private.recalcular_claves`:

| Cambio | Trigger |
|---|---|
| `etiquetas.valor` (cambia el slug generado) | `etiquetas_recalcular_claves` |
| `grupos_etiqueta.orden` o `slug` | `grupos_recalcular_claves` |
| Fusionar etiquetas | `fusionar_etiquetas` la llama al final |

Otras reglas del panel que viven en la base:

- `fusionar_etiquetas(p_origen, p_destino)`: mismo grupo; mueve `producto_etiquetas`,
  `variante_etiquetas` y `promocion_alcance` y borra el origen. Si dos variantes de un
  producto quedan iguales, el unique `(producto_id, clave)` aborta todo con un mensaje.
- `grupos_etiqueta_bloquear_es_variante` (esquema inicial): no se cambia `es_variante`
  de un grupo con etiquetas en uso.
- `grupos_marca_primero`: la marca siempre tiene `orden = 0`; `reordenar_grupos`
  numera los demás desde 1.
- `variante_etiquetas` referencia a `etiquetas` sin cascade: no se borra una etiqueta
  (ni su grupo) mientras la use una variante. `producto_etiquetas` sí es cascade.

## Semántica del filtro

**AND entre grupos, OR dentro del grupo.** `refresco=144-hz,165-hz & panel=ips` es
"(144 Hz o 165 Hz) y IPS". Sin esto, elegir dos talles devuelve cero resultados porque
ningún producto "es" S y M a la vez en el mismo sentido que es IPS.

El RPC `buscar_productos(p_filtros jsonb, p_categoria text, p_q text, p_orden text,
p_limite int, p_offset int, p_destacados boolean)` (el filtrado en sí está en
`private.productos_filtrados`, compartido con las facetas) recibe `p_filtros` como `{"refresco": ["144-hz","165-hz"],
"panel": ["ips"]}` y exige, por cada grupo, que exista al menos una etiqueta del
producto dentro de los valores:

```sql
not exists (
  select 1 from jsonb_each(p_filtros) f(grupo, valores)
  where not exists (
    select 1
    from producto_etiquetas pe
    join etiquetas e on e.id = pe.etiqueta_id
    join grupos_etiqueta g on g.id = e.grupo_id
    where pe.producto_id = p.id
      and g.slug = f.grupo
      and e.slug in (select jsonb_array_elements_text(f.valores))
  )
)
```

Los grupos de variante siguen otra regla (una misma variante con stock tiene que
cumplirlos todos): ver [variantes-y-stock](variantes-y-stock.md#filtro-con-variantes).

Devuelve también `total` (con `count(*) over ()`) para paginar sin una segunda consulta.

## Facetas

`facetas_productos(p_filtros, p_categoria, p_q)` devuelve
`(grupo_slug, grupo_nombre, etiqueta_slug, etiqueta_valor, cantidad)`.

**El conteo de cada grupo se calcula aplicando todos los filtros menos el de ese mismo
grupo.** Si aplicás todos, al tildar "144 Hz" las demás opciones de refresco quedan con
cantidad 0 y desaparecen: el usuario no puede sumar "165 Hz" y cree que el filtro es de
opción única.

Las facetas salen del conjunto filtrado por categoría y búsqueda, así en "Remeras" no
aparece el grupo `refresco`. Grupos con `visible_en_filtros=false` no se devuelven.

## Ver también

- [Variantes y stock](variantes-y-stock.md)
- [Etiquetas y filtros (web)](../web/etiquetas.md)
- [Búsqueda](busqueda.md)
- [Esquema](esquema.md)
