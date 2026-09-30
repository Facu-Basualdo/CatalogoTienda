# Catálogo público

[← Índice web](INDICE.md)

Rutas bajo `web/app/(tienda)/`: `/` (home), `/catalogo`, `/p/[slug]`. Todas leen con
funciones de `lib/catalogo/lecturas.ts` (cacheadas); ninguna llama a Supabase directo.

| Ruta | Lecturas | Build |
|---|---|---|
| `/` | `obtenerBanners` · `obtenerDestacados` · `obtenerCategorias` | Estática, revalida cada 1 min (por los banners) |
| `/catalogo` | `buscarProductos` · `obtenerFacetas` · `obtenerCategorias` | Shell estático + contenido por `searchParams` en streaming |
| `/p/[slug]` | `obtenerProducto` | `generateStaticParams` con todos los publicados; los nuevos se generan al primer pedido |

## Patrón de página con Cache Components

`next.config.ts` tiene `cacheComponents: true`. **La página no hace `await` de
`params` ni de `searchParams`: se los pasa a un hijo dentro de `<Suspense>`** y ese hijo
los espera. Si la página los espera arriba, el build falla con *blocking route* o la
ruta entera se vuelve dinámica. Referencias: `catalogo/page.tsx` (`Catalogo`) y
`p/[slug]/page.tsx` (`Ficha`).

Lo mismo para client components con `useSearchParams` (`Buscador`,
`SelectorVariantes`): van en su propio `<Suspense>`, si no arrastran a la ruta.

## Paginación

- **OFFSET con páginas numeradas, a propósito.** `?pagina=3` se comparte y se combina
  con cualquier orden y filtro; keyset (cursor) no permite saltar a una página ni
  ordenar por relevancia sin complicar la URL. El costo de OFFSET es despreciable con
  cientos de productos; si el catálogo pasa de ~10.000 productos publicados, revisarlo.
- `POR_PAGINA = 24` en `lib/catalogo/filtros.ts`. El RPC devuelve `total` con
  `count(*) over ()`: una sola consulta para página y total.
- **Links reales**, no botones: `components/tienda/paginacion.tsx` usa `next/link` con
  las clases BEM de HeroUI (`Pagination.Link` no acepta `href`). Crawleable y con
  prefetch.
- **Cualquier cambio de filtro u orden vuelve a la página 1** (`conCambios` /
  `conGrupo`). Una página fuera de rango muestra "Esta página no existe" con link a la 1,
  no un 404.

## SEO

- `/catalogo` con búsqueda, filtros de etiquetas o `pagina > 1` → `noindex, follow`;
  canonical a la categoría limpia. Las combinaciones de filtros son infinitas y
  duplican contenido.
- **`notFound()` dentro de un `Suspense` responde HTTP 200** (el streaming ya empezó),
  con la UI de `app/not-found.tsx` y `<meta name="robots" content="noindex">`. Es el
  comportamiento esperado de Next con streaming, no un bug; no intentes "arreglarlo"
  sacando el Suspense.
- Un borrador (`publicado = false`) da not-found: RLS no lo devuelve a `anon`.

## Home

Carrusel de banners (Embla), destacados (`buscar_productos` con `p_destacados`) y
tarjetas de categorías raíz. El título, subtítulo y botón del banner se superponen en
la web desde la tabla `banners`; **la imagen del banner no lleva texto**.

## Ver también

- [Etiquetas y filtros](etiquetas.md)
- [Caché y revalidación](cache-y-revalidacion.md)
- [Variantes y stock](variantes-y-stock.md)
- [HeroUI](heroui.md#links-el-punto-donde-más-se-equivoca-uno)
