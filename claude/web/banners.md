# Banners

[← Índice web](INDICE.md)

**El id de un banner nuevo lo genera la página, antes de que exista la fila.** Las
imágenes suben directo del navegador a Storage en `banners/{id}/` (ver
[imagenes](imagenes.md)) y `imagen_path` es obligatorio, así que no hay un "borrador
sin imagen" como en productos: `/admin/banners/nuevo` hace `crypto.randomUUID()`
después de leer la sesión y `guardarBanner(id, nuevo: true, …)` inserta con ese id.

## Archivos

- **Al guardar, `guardarBanner` borra de `banners/{id}/` todo lo que el banner ya no
  usa**: reemplazos y subidas descartadas en el mismo formulario. Borrar el banner
  vacía la carpeta antes de borrar la fila.
- Queda un hueco aceptado: si alguien sube imágenes en "Nuevo banner" y se va sin
  guardar, esa carpeta queda huérfana (no hay fila que la limpie).

## Formulario

- Escritorio 3:1 (obligatoria) y celular 4:5 (opcional; sin ella, la tienda recorta el
  centro de la de escritorio). Ambas con `SubidaImagen` y recorte obligatorio.
- **El color del texto es un dato del banner (`texto_claro`)**, no la posición en el
  carrusel. Antes el carrusel alternaba negro y blanco por índice, que sólo servía para
  las imágenes de demo.
- **El destino del botón se elige, no se escribe**: `DestinoBanner` ofrece "Todos los
  productos", ofertas, combos y cada categoría; "Otra página" deja pegar un link. Un
  link pegado de la propia tienda (`https://dominio/p/x`) se guarda como ruta (`/p/x`)
  en `guardarBanner`, así sobrevive a un cambio de dominio. Sin destino no hay botón.
- Fechas por día con `SelectorFecha` (ver [promociones](promociones.md#fechas)). La
  tienda filtra la ventana en la base con `banners_vigentes()` y la home revalida cada
  minuto (ver [caché](cache-y-revalidacion.md#banners-y-ventanas-de-fecha)).
- **Vista previa**: `DiapositivaBanner` (`components/tienda/diapositiva-banner.tsx`) es la
  misma pieza que usa el carrusel; `variante="desktop" | "mobile"` fija el formato sin
  depender del ancho de la pantalla (el carrusel usa `"auto"`, con breakpoints).

## Listado

`/admin/banners`: miniatura, estado (se ve / programado / vencido / pausado), switch
"Activo" y flechas de orden (`reordenar_banners`). Toda acción invalida `banners`.

## Ver también

- [Catálogo: home](catalogo.md#home)
- [Imágenes](imagenes.md)
- [Dashboard](dashboard.md)
- [Esquema: banners](../supabase/esquema.md#banners)
