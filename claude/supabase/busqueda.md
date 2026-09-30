# Búsqueda

[← Índice supabase](INDICE.md)

Búsqueda de texto completo de Postgres en español, insensible a acentos: "algodon"
tiene que encontrar "100% algodón" y "monitor" tiene que encontrar "Monitores".

## Columna `productos.busqueda`

```sql
create extension if not exists unaccent with schema extensions;

create function f_unaccent(text) returns text
language sql immutable parallel safe strict set search_path = ''
as $$ select extensions.unaccent('extensions.unaccent'::regdictionary, $1) $$;

alter table productos add column busqueda tsvector generated always as (
  setweight(to_tsvector('spanish', f_unaccent(nombre)), 'A') ||
  setweight(to_tsvector('spanish', f_unaccent(coalesce(descripcion_texto, ''))), 'B')
) stored;

create index productos_busqueda_idx on productos using gin (busqueda);
```

- **`unaccent()` está declarada `stable`, no `immutable`**, y una columna generada o un
  índice de expresión sólo aceptan funciones inmutables. Usarla directo da
  `generation expression is not immutable`. El wrapper con el diccionario explícito
  (`'extensions.unaccent'::regdictionary`) es inmutable en la práctica y es el patrón
  estándar.
- **Se indexa `descripcion_texto`, no `descripcion`.** El JSON de TipTap contiene
  claves como `"type"`, `"table"`, `"paragraph"`: buscar "tabla" matchearía todos los
  productos con tabla.
- La consulta del usuario pasa por el mismo `f_unaccent` antes de convertirse:
  `websearch_to_tsquery('spanish', f_unaccent(p_q))`. Si normalizás de un solo lado,
  "algodón" no encuentra nada.

## Etiquetas en la búsqueda

Buscar "144hz" tiene que encontrar monitores aunque el texto no lo diga. Las etiquetas
viven en otra tabla y no pueden entrar en la columna generada, así que
`buscar_productos` agrega este `exists` **y otro igual sobre `variante_etiquetas`**
(buscar "negro" tiene que encontrar la remera que viene en negro):

```sql
or exists (
  select 1 from producto_etiquetas pe join etiquetas e on e.id = pe.etiqueta_id
  where pe.producto_id = p.id
    and (strpos(f_unaccent(lower(e.valor)), q_norm) > 0          -- '144 hz' contra '144 Hz'
         or strpos(e.slug, slugify(p_q)) > 0)                   -- '144hz'  contra slug '144-hz'
)
```

Si con el volumen esto se vuelve lento, el paso siguiente es una columna
`etiquetas_texto` mantenida por trigger sobre `producto_etiquetas` — no antes.

## Orden por relevancia

Con `p_q` presente y `p_orden` = `relevancia` (default cuando hay búsqueda), se ordena
por `ts_rank(busqueda, query) desc`. Sin búsqueda, `relevancia` cae a `creado_en desc`.

## Ver también

- [Etiquetas](etiquetas.md)
- [Esquema](esquema.md#productos)
- [Etiquetas y filtros (web)](../web/etiquetas.md#url-de-filtros)
