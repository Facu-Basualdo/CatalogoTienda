# Índice — supabase

Postgres 17 · RLS · Storage · funciones RPC en SQL · Supabase CLI (vía `npx`).
Migraciones en `supabase/migrations/`, datos de demo en `supabase/seed.sql`.

[← CLAUDE.md](../../CLAUDE.md)

## Protocolo de trabajo

Antes de escribir una migración, leé [esquema](esquema.md),
[seguridad-rls](seguridad-rls.md) y [migraciones](migraciones.md). Si toca etiquetas,
búsqueda, variantes o imágenes, además la nota del tema. **No lances agentes de
exploración** sobre `migrations/`: el estado vigente está resumido en
[esquema](esquema.md).

## Fundamentos

| Nota | De qué trata |
|---|---|
| [Esquema](esquema.md) | Tablas y relaciones · precios `numeric`, nunca `float` · `productos` no tiene stock: vive en `producto_variantes` · imágenes guardan `path`, no URL · `publicado` es la visibilidad · banners con ventana `desde/hasta` filtrada por `banners_vigentes()` |
| [Seguridad y RLS](seguridad-rls.md) | Sin `grant` explícito la API da 42501 aunque RLS esté bien · anon nunca escribe (se revocó el default viejo) · `private.es_admin()` security definer, sólo `authenticated` · policies separadas por rol y por acción, nunca `for all` · RPC del catálogo `security invoker` |
| [Migraciones](migraciones.md) | `--db-url` al pooler 5432, no al 6543 · nunca `source web/.env` (imprime la contraseña) · nunca editar una aplicada · agregar un parámetro crea otra sobrecarga · regenerar tipos y advisors después de cada una |

## Features

| Nota | De qué trata |
|---|---|
| [Carrito y pedidos](carrito.md) | Un solo motor de precios `private.cotizar` para carrito, WhatsApp y pedido · chequea publicado/activa a mano porque corre dentro de un definer · sólo líneas `ok` suman · `crear_pedido` es la única escritura (anon sin grants) y sus errores se muestran al cliente · el stock baja al confirmar, no al pedir |
| [Variantes y stock](variantes-y-stock.md) | Todo producto tiene ≥ 1 variante (la "única" la crea un trigger) · talle/color van en `variante_etiquetas`, nunca en `producto_etiquetas` (trigger) · `talle=m & color=negro` exige UNA variante con stock que cumpla ambos · ordenar por `precio_desde` · se guarda sólo con `guardar_variantes` |
| [Etiquetas](etiquetas.md) | Marca = grupo con `es_marca` (uno solo, nunca variante), no una columna · toda etiqueta pertenece a un grupo · `slug` es columna generada, nunca se escribe · `144Hz`/`144 hz` → `144-hz`, unique por grupo · slugs de grupo no pueden ser `cat/q/orden/pagina` · facetas sin el filtro de su propio grupo |
| [Búsqueda](busqueda.md) | `unaccent` no es inmutable: sin `f_unaccent` la columna generada no compila · se indexa `descripcion_texto`, no el JSON · etiquetas por join comparando texto y slug (`144hz` encuentra `144 Hz`) |
| [Imágenes](imagenes.md) | Relación fija: producto 4:5 (1200×1500), banner 3:1 y 4:5 · sin texto dentro de la imagen · bucket público `catalogo`, escritura admin · path `productos/{id}/{uuid}.webp` · borrar la fila no borra el archivo · la secret key sólo la usa el script de demo |
