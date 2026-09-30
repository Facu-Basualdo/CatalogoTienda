# Imágenes

[← Índice supabase](INDICE.md)

## Bucket

Un solo bucket **público** `catalogo`, creado en una migración (no a mano en el
dashboard, así existe igual en dev y prod):

```sql
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('catalogo', 'catalogo', true, 5242880, array['image/webp','image/jpeg','image/png','image/avif']);
```

Lectura: pública (URL directa, sin firmar). Escritura: policies sobre `storage.objects`
con `bucket_id = 'catalogo' and (select es_admin())` para insert, update y delete.

## Convención de paths

| Uso | Path |
|---|---|
| Producto | `productos/{producto_id}/{uuid}.webp` |
| Banner desktop / mobile | `banners/{banner_id}/{uuid}.webp` |

- **Nombre nuevo en cada subida, nunca sobrescribir un path existente.** La URL
  pública pasa por CDN con caché; si reemplazás `foto.webp` por otra imagen con el
  mismo nombre, los visitantes siguen viendo la vieja por horas y `next/image` también
  la tiene cacheada.
- **La base guarda `path`, no la URL.** La URL se arma en la web con
  `urlPublica(path)`; si cambia el dominio del proyecto o se agrega un CDN, no hay que
  migrar filas.
- El `producto_id` va en el path para poder borrar todo lo de un producto listando la
  carpeta.

## Relación de aspecto fija

| Uso | Relación | Tamaño guardado |
|---|---|---|
| Producto (y combo) | 4:5 | 1200 × 1500 WebP |
| Banner desktop | 3:1 | 1920 × 640 WebP |
| Banner mobile | 4:5 | 800 × 1000 WebP |

**La tienda asume estas relaciones** (`aspect-[4/5]`, `aspect-[3/1]`) con `object-cover`:
una imagen con otra proporción no rompe el layout pero se recorta sola y puede cortar
el producto. Por eso el dashboard no deja subir nada fuera de proporción: abre el
recorte (ver [imagenes web](../web/imagenes.md#recorte-obligatorio)).

## Tabla `producto_imagenes`

`id`, `producto_id` (`on delete cascade`), `path`, `alt`, `orden int`, `ancho`, `alto`.

- **La imagen principal es la de menor `orden`.** No hay columna `principal`: dos
  fuentes de verdad terminan en dos principales.
- **Sin unique en `(producto_id, orden)`.** Reordenar intercambiando valores viola un
  unique no diferible a mitad del update. Se reordena con
  `reordenar_imagenes(p_producto_id uuid, p_ids uuid[])`, que reescribe `orden` según
  la posición en el array en una sola transacción.
- `ancho` y `alto` se guardan al subir: `next/image` los necesita para reservar espacio
  sin layout shift en la galería.

## Borrado

**Borrar la fila no borra el archivo**, y el `on delete cascade` del producto tampoco.
El Server Action que borra una imagen o un producto borra primero los objetos de
Storage (`storage.from('catalogo').remove([...])`) y después la fila. Si el borrado de
Storage falla, no se borra la fila: un archivo huérfano es invisible, una fila que
apunta a un archivo inexistente es una imagen rota en la tienda.

## Imágenes de demo

`web/scripts/sembrar-imagenes.mjs` genera ilustraciones en blanco y negro (SVG →
WebP con `sharp`, en los tamaños de la tabla de arriba) para cada producto sin
imágenes y crea los dos banners si no hay ninguno. Es idempotente.

**Es la única pieza que usa `SUPABASE_SECRET_KEY`**, leída de `web/.env` y sólo en local:
sube a Storage sin sesión de admin. La app no la importa y no va a Vercel.

## Ver también

- [Imágenes (web)](../web/imagenes.md)
- [Seguridad y RLS](seguridad-rls.md)
- [Esquema](esquema.md)
