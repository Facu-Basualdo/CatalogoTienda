# Catálogo público

[← Índice web](INDICE.md)

Rutas bajo `web/app/(tienda)/`. Todas leen con funciones de `lib/catalogo/lecturas.ts`
(cacheadas); ninguna llama a Supabase directo. Estructura visual en
[tema-y-marca](tema-y-marca.md).

| Ruta | Lecturas | Build |
|---|---|---|
| `/` | `obtenerBanners` · `obtenerDestacados` (por categoría raíz) · `obtenerMosaicoCategorias` · `obtenerOfertas` | Estática, revalida cada 1 min (por los banners) |
| `/catalogo` | `buscarProductos` · `obtenerFacetas` · `obtenerCategorias` | Shell estático + contenido por `searchParams` en streaming |
| `/ofertas` | `obtenerOfertas` (`p_ofertas`) | Estática |
| `/p/[slug]` | `obtenerProducto` | `generateStaticParams` con todos los publicados; los nuevos se generan al primer pedido |
| `/carrito` | — (cotiza en el cliente) | Estática, `noindex`. Ver [carrito](carrito.md) |

**Ofertas es una ruta y no un filtro de `/catalogo`**: `?ofertas=1` sería otra clave
reservada que ningún grupo de etiquetas podría usar como slug.

## Tarjeta de producto

`components/tienda/tarjeta-producto.tsx`: marca arriba (del grupo `es_marca`), nombre en
dos líneas, precio con ahorro, y una acción que depende de la variante única (ver
[carrito](carrito.md#pantallas)). `horizontal` la pone con la imagen a la izquierda
(destacados de la home).

## Vista grilla / lista

`components/tienda/vista-listado.tsx`. **La preferencia vive en `localStorage`, no en la
URL**: en la URL sería otra clave reservada y duplicaría las entradas de caché del
listado. Las tarjetas siguen siendo server components: el contenedor client pone
`data-vista` y las tarjetas se adaptan con `sm:group-data-[vista=lista]/vista:flex-row`.
En mobile la vista lista no aplica (la grilla de 2 columnas ya es compacta).

## Ficha

Dos paneles: galería + compra (breadcrumb, marca, título, caja de precio, selector de
variantes, cantidad, características principales con íconos) y pestañas
**Especificaciones** (grilla con el ícono de cada grupo, `lib/iconos.tsx`) /
**Descripción** (TipTap). Los grupos de variante aparecen en especificaciones con todas
sus opciones ("Talle: S, M, L, XL").

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

Banner redondeado (Embla), destacados en pestañas por categoría raíz (`p_destacados` +
`p_categoria`, tarjetas horizontales), franja "cómo comprar", mosaico de subcategorías
con la imagen de su producto más reciente y carrusel de rebajados (`p_ofertas`). El
título y botón del banner se superponen desde la tabla `banners`: **las imágenes (de
banners y de productos) no llevan texto**; escrito en la imagen se duplica y se
superpone con el de la tarjeta. El color del texto lo elige el admin por banner
(`texto_claro`); cada diapositiva es `DiapositivaBanner`, la misma que la vista previa del
panel (ver [banners](banners.md)).

El mosaico hace una consulta por subcategoría: con ~10 está bien (cacheadas con tag);
si pasan de ~30, moverlo a un RPC.

## Ver también

- [Banners](banners.md)

- [Etiquetas y filtros](etiquetas.md)
- [Caché y revalidación](cache-y-revalidacion.md)
- [Variantes y stock](variantes-y-stock.md)
- [HeroUI](heroui.md#links-el-punto-donde-más-se-equivoca-uno)
