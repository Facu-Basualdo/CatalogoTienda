# Imágenes

[← Índice web](INDICE.md)

Relaciones de aspecto, paths y bucket: [imagenes (supabase)](../supabase/imagenes.md).

## Render (tienda)

- URL: `urlPublica(path)` de `lib/supabase/storage.ts`. Nunca se guarda ni se arma la
  URL a mano en un componente.
- **`next/image` con `sizes` siempre.** Una imagen `fill` sin `sizes` se descarga al
  ancho del viewport entero: en la grilla, 24 imágenes de 1920 px.

  | Uso | `sizes` | Dónde |
  |---|---|---|
  | Tarjeta del catálogo | `SIZES_TARJETA` = `(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw` | `tarjeta-producto.tsx` |
  | Galería de la ficha | `(max-width: 1024px) 100vw, 50vw` | `galeria.tsx` |
  | Miniaturas | `10vw` | `galeria.tsx` |
  | Banner | `100vw` | `carrusel-banners.tsx` |

- `priority` sólo en el primer banner, la primera imagen de la ficha y las primeras 4
  tarjetas de la página 1 del catálogo (son el LCP). En ningún otro lado.
- Banner: **dos `<Image>` con `sm:hidden` / `hidden sm:block`** (mobile 4:5, desktop
  3:1). Es art direction sin JS; `next/image` no soporta `<picture>` con varias fuentes.
- `next.config.ts` arma `images.remotePatterns` desde `NEXT_PUBLIC_SUPABASE_URL`
  (`/storage/v1/object/public/**`). Si cambia el proyecto de Supabase, cambia solo;
  sin esto, `next/image` tira *hostname is not configured*.
- Pocas variantes de `sizes` a propósito: cada combinación distinta consume cupo de
  optimización de Vercel (ver [entorno-y-deploy](../general/entorno-y-deploy.md#vercel)).

## Subida (dashboard)

**Las imágenes se suben desde el navegador directo a Supabase Storage, nunca a través
de un Server Action.** Los Server Actions cortan el cuerpo en 1 MB por defecto y las
funciones de Vercel en 4.5 MB; una foto de celular pasa ambos y el error es genérico.

1. El producto ya existe (se crea como borrador al tocar "Nuevo producto"). Sin `id`
   no hay path.
2. `react-dropzone` recibe los archivos.
3. **Recorte obligatorio** (sección siguiente).
4. El recorte se exporta con `canvas` al tamaño exacto de la tabla (1200 × 1500, etc.)
   en WebP. No hace falta otra compresión: el tamaño ya está acotado.
5. `supabaseNavegador().storage.from('catalogo').upload('productos/{id}/{uuid}.webp', blob)`.
   UUID nuevo siempre, **nunca `upsert: true`** sobre un path existente (el CDN sirve
   la vieja).
6. Server Action `registrarImagenes(productoId, [{ path, ancho, alto, alt }])` inserta
   las filas e invalida `producto:{slug}` y `productos`. Si falla, se borra lo subido.

### Recorte obligatorio

Cada uso tiene una relación fija (4:5 producto, 3:1 y 4:5 banner). Al elegir un
archivo se lee su tamaño:

- Si la relación difiere en más de 1%, se abre un `Modal` con `react-easy-crop`
  bloqueado en la relación del uso (`aspect={4 / 5}`). No se puede confirmar sin
  recortar.
- Si ya coincide, igual se pasa por el canvas para llevarla al tamaño exacto; el
  modal no se abre.
- Una imagen más chica que el tamaño destino se acepta pero se avisa (se va a ver
  pixelada); no se agranda en silencio.

Por qué forzarlo en la subida y no con `object-cover` en la tienda: `object-cover`
recorta por el centro sin criterio y en la grilla corta cabezas, cuellos de remera o
el pie de un monitor. El admin elige qué queda.

Reordenar (`@dnd-kit/sortable`) llama a `reordenar_imagenes` con el array completo de
ids. El `alt` es obligatorio al guardar; por defecto se propone el nombre del producto.

## Ver también

- [Imágenes (supabase)](../supabase/imagenes.md)
- [HeroUI](heroui.md#excepciones-lo-que-heroui-no-trae)
- [Caché y revalidación](cache-y-revalidacion.md)
- [Catálogo](catalogo.md)
