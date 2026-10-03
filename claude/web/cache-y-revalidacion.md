# Caché y revalidación

[← Índice web](INDICE.md)

El catálogo se sirve cacheado y **sólo se refresca cuando una mutación del dashboard
invalida sus tags**. Síntoma de un tag olvidado: el admin guarda, ve el cambio en el
dashboard (que no está cacheado) y en la tienda sigue lo viejo, por días.

## Mecanismo (Next 16, Cache Components)

`next.config.ts` → `cacheComponents: true`. Cada lectura de `web/lib/catalogo/lecturas.ts`
es una función con:

```ts
"use cache";
cacheLife("max");          // vive hasta que un tag la invalide
cacheTag(TAGS.productos);  // constantes de lib/catalogo/tags.ts, nunca strings a mano
```

- Los **argumentos son la clave de caché**. Por eso `leerFiltros` normaliza (slugs
  ordenados y sin repetir): `?talle=m,s` y `?talle=s,m` pegan en la misma entrada.
- Dentro de `'use cache'` sólo `supabasePublico()`: leer cookies ahí tira error (ver
  [clientes-supabase](clientes-supabase.md)).
- **No uses `Date.now()` / `new Date()` para filtrar dentro de una función cacheada**:
  queda congelada la hora del primer render. Lo que depende de la hora se filtra en
  Postgres con `now()` (ejemplo: `banners_vigentes()`).
- Invalidación desde Server Actions: **`updateTag(tag)`**, que expira en el momento
  (el admin ve su cambio al recargar la tienda). `revalidateTag(tag, 'max')` es
  stale-while-revalidate y se usa sólo desde route handlers (webhooks).

## Tags

| Tag | Lo llevan | Lo invalidan |
|---|---|---|
| `productos` | listado, destacados, facetas, slugs para `generateStaticParams` | alta/edición/borrado de cualquier producto, publicar/despublicar, cambios de stock o variantes |
| `producto:{slug}` | ficha | edición de ese producto, sus imágenes, etiquetas, variantes o stock |
| `facetas` | panel de filtros | cambios de etiquetas de productos, grupos o etiquetas, **y de stock** (las facetas de talle/color cuentan sólo variantes con stock) |
| `etiquetas` | ficha (características, selector) | ABM de grupos y etiquetas |
| `categorias` | menú, subcategorías, home | ABM de categorías |
| `banners` | carrusel de la home | ABM y reorden de banners |
| `promociones` | **toda lectura con precio**: listado, destacados, ofertas, ficha | ABM de promociones, activar/pausar |
| `combos` · `combo:{slug}` | listado de combos, carrusel de la home, ficha del combo (que además llevan `productos`) | ABM de combos, sus productos, imágenes y descripción |

Las facetas llevan `facetas` **y** `productos`: publicar un producto cambia los conteos.

## Reglas

- **Toda Server Action que escribe termina invalidando sus tags** antes de devolver
  `{ ok: true }`. Si toca etiquetas de un producto son tres: `productos`,
  `producto:{slug}` y `facetas`.
- **Cambiar el slug invalida el viejo y el nuevo.** Si sólo invalidás el nuevo, la URL
  vieja sigue sirviendo la ficha cacheada en vez de un 404.
- **Renombrar una etiqueta o un grupo invalida `productos` y `etiquetas`**: el nombre
  aparece en fichas y facetas de muchos productos.
- No uses `revalidatePath('/', 'layout')` como atajo: invalida todo el sitio y oculta
  qué dependía de qué.

## Cambios hechos fuera de la app

**Si los datos se tocan por SQL, por la CLI o con un script, ningún tag se invalida** y
la tienda sigue mostrando lo anterior. Ya pasó: se regeneraron las imágenes de demo con
`scripts/sembrar-imagenes.mjs --regenerar` y el build siguiente siguió sirviendo las
fichas con los paths viejos (archivos ya borrados).

- En local, **la caché de `'use cache'` sobrevive entre builds** en `web/.next/cache`:
  después de tocar datos por fuera, `rm -rf web/.next` antes de `next build`.
- En producción hace falta una invalidación explícita. Pendiente para el dashboard: una
  acción "Refrescar tienda" que llame `updateTag` sobre todos los tags de `TAGS`.

## Banners y ventanas de fecha

Los banners tienen `desde/hasta`, pero nadie muta nada cuando llega la hora de
vencimiento, así que ningún tag se invalida. `obtenerBanners` usa **`cacheLife("minutes")`**
además del tag, y la ventana la evalúa el RPC `banners_vigentes()` con `now()`.
Consecuencia visible en el build: `/` revalida cada 1 minuto (la vida más corta de
una página manda). Es aceptable: es una consulta por minuto como mucho.

## Promociones y fechas

Una promo cambia precios en muchos productos a la vez, así que **las lecturas con precio
llevan el tag `promociones`** (no se invalida producto por producto) y las acciones de
promociones sólo hacen `updateTag(TAGS.promociones)`.

El comienzo o fin de una promo no muta nada (igual que los banners): por eso esas
lecturas usan `VIDA_PRECIOS` (5 minutos) en `lib/catalogo/lecturas.ts` en vez de
`"max"`. Una promo que vence puede seguir viéndose hasta 5 minutos en la tienda; el
carrito cotiza en vivo y ya no la aplica. En el build, `/ofertas` y las fichas
prerenderizadas figuran con revalidación de 5 m.

## Ver también

- [Catálogo](catalogo.md)
- [Clientes de Supabase](clientes-supabase.md)
- [Etiquetas y filtros](etiquetas.md)
- [Arquitectura](../general/arquitectura.md)
- [Promociones (web)](promociones.md)
