# Índice — web

Next.js 16 (App Router, Cache Components, TypeScript) · HeroUI v3 · Tailwind v4 ·
`@supabase/ssr` · TipTap v3 · Embla. Desplegado en Vercel con Root Directory `web`.

[← CLAUDE.md](../../CLAUDE.md)

## Protocolo de trabajo

Antes de tocar una pantalla, leé en este orden:

1. [heroui](heroui.md) — la v3 no es la v2 de internet; y
   [tema-y-marca](tema-y-marca.md) — qué colores se permiten.
2. [clientes-supabase](clientes-supabase.md) — qué cliente corresponde según dónde corre el código.
3. [cache-y-revalidacion](cache-y-revalidacion.md) — si la pantalla lee catálogo o si muta algo.
4. La nota de la feature (tabla de abajo) y su par en [supabase](../supabase/INDICE.md).

Next 16 cambió APIs: antes de usar una, consultá `web/node_modules/next/dist/docs/`
(lo pide `web/AGENTS.md`). Con eso y las notas alcanza: **no lances agentes de
exploración** para reconstruir estos contratos.

## Fundamentos

| Nota | De qué trata |
|---|---|
| [HeroUI](heroui.md) | Es la v3: sin provider, componentes compuestos, sin `color` ni `as` · links internos = `next/link` + `linkVariants`/`buttonVariants` · `Link`/`Breadcrumbs` con `href` dependen del `RouterProvider` · `Pagination.Link` no tiene `href` · no hay carrusel, editor, dropzone ni recorte |
| [Tema y marca](tema-y-marca.md) | La paleta son variables CSS en `globals.css` sin capa, bloque `.dark` después del claro · `primary` sólo acción principal · rojo sólo errores · seleccionado = `--accent` (el `--accent-soft` de HeroUI no se ve) · nombre en `SITIO` |
| [Clientes de Supabase](clientes-supabase.md) | Tres clientes y cuándo va cada uno · cookies en una página pública la vuelven dinámica y rompen `'use cache'` · `getClaims()`, nunca `getSession()` · `proxy.ts` (no `middleware.ts`) sólo en `/admin` y copiando los headers de `setAll` |
| [Caché y revalidación](cache-y-revalidacion.md) | `'use cache'` + `cacheLife('max')` + `cacheTag` · args normalizados = clave estable · nada de `Date.now()` en funciones cacheadas · `updateTag` en cada Server Action · cambiar slug invalida viejo y nuevo · banners revalidan cada minuto |

## Features

| Nota | De qué trata |
|---|---|
| [Catálogo](catalogo.md) | Las páginas no esperan `params`/`searchParams`: los pasan a un hijo en `<Suspense>` · paginación OFFSET con `<a>` reales y vuelta a página 1 al filtrar · filtros = `noindex` · `notFound()` en streaming responde 200 a propósito |
| [Etiquetas y filtros](etiquetas.md) | Filtros en la URL como `?grupo=slug1,slug2` · `cat`, `q`, `orden`, `pagina` son claves reservadas · AND entre grupos, OR dentro · facetas del RPC, nunca contadas en el cliente |
| [Variantes y stock](variantes-y-stock.md) | Nunca ocultar opciones: agotada = tachada y elegible, inexistente = deshabilitada · disponibilidad contra lo elegido en los otros grupos · variante en `?variante=` · "Sin stock" no oculta el producto, `publicado` sí |
| [Imágenes](imagenes.md) | Relación fija con recorte obligatorio al subir (4:5, 3:1) · subida directa a Storage (los Server Actions cortan en 1 MB) · UUID nuevo, nunca `upsert` · `sizes` siempre, pocas variantes · banner = dos `<Image>` por breakpoint |
| [Descripción rica](descripcion-rica.md) | JSON de TipTap, jamás HTML · editor y renderer comparten `extensiones.ts` o se pierde contenido · `immediatelyRender: false` · guardar también `descripcion_texto` · scroll de tablas vía `nodeMapping` |
