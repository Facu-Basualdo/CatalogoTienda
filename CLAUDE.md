# CatalogoTienda

Tienda con catálogo genérico (ropa, electrónica, lo que sea), proyecto de portfolio.
Los productos se filtran por **etiquetas agrupadas** (`Tasa de refresco: 144 Hz`,
`Material: 100% algodón`), tienen **variantes con stock** (talle × color), varias
imágenes y una descripción rica con tablas. Se compra con un carrito que termina en un
pedido por WhatsApp, con promociones, combos y cupones. Un dashboard administra todo.
Next.js 16 + HeroUI v3 en Vercel, datos e imágenes en Supabase.

**Estado:** hechos la base, el modelo de datos con demo, el catálogo público con el
rediseño estilo compragamer y el carrito con pedido por WhatsApp. Falta el dashboard,
promociones, combos y cupones: orden y diseño en
[docs/plan-implementacion.md](docs/plan-implementacion.md). Las notas de `claude/`
describen lo construido; si el código se aparta, gana el código y la nota se corrige
con `/docs`.

## Cómo obtener contexto

1. Ubicá el **área** en la tabla de abajo.
2. Abrí su `INDICE.md` y decidí por la descripción qué nota abrir. Las descripciones
   dicen el gotcha: muchas veces la respuesta ya está ahí.
3. Abrí **sólo** esa nota y seguí sus `## Ver también` si hace falta.

**No leas un área entera** ni lances agentes de exploración para reconstruir algo que
ya está en una nota.

Cuando no sabés en qué nota está algo, buscá por contenido antes de abrir archivos:

```
grep -ril "etiqueta" claude/          # el mismo tema usa el mismo nombre de archivo en cada área
grep -rn "updateTag" web/             # después, el código
```

## Áreas

| Área | Stack | Índice |
|---|---|---|
| `web/` | Next.js 16 (App Router, Cache Components) · HeroUI v3 · Tailwind v4 · `@supabase/ssr` · TipTap v3 · Embla | [claude/web/INDICE.md](claude/web/INDICE.md) |
| `supabase/` | Postgres 17 · RLS · Storage · funciones RPC en SQL · Supabase CLI | [claude/supabase/INDICE.md](claude/supabase/INDICE.md) |

## Notas transversales

| Nota | De qué trata |
|---|---|
| [Arquitectura](claude/general/arquitectura.md) | Tres caminos de datos (catálogo cacheado sin cookies · dashboard con sesión · subida directa a Storage) · sin secret key en la app ni API propia · la seguridad es grants + RLS, no el proxy |
| [Entorno y deploy](claude/general/entorno-y-deploy.md) | Qué variable va a Vercel y cuál es sólo local (`DATABASE_URL`, secret key) · Root Directory `web` · las migraciones NO las aplica el build: `db push` antes del deploy · un solo proyecto Supabase con datos de demo |

## Features que cruzan áreas

| Feature | web | supabase |
|---|---|---|
| Catálogo y paginación | [catalogo](claude/web/catalogo.md) | [esquema](claude/supabase/esquema.md#funciones-rpc) |
| Etiquetas y filtros | [etiquetas](claude/web/etiquetas.md) | [etiquetas](claude/supabase/etiquetas.md) |
| Variantes, stock y visibilidad | [variantes-y-stock](claude/web/variantes-y-stock.md) | [variantes-y-stock](claude/supabase/variantes-y-stock.md) |
| Imágenes de producto | [imagenes](claude/web/imagenes.md) | [imagenes](claude/supabase/imagenes.md) |
| Descripción rica | [descripcion-rica](claude/web/descripcion-rica.md) | [esquema](claude/supabase/esquema.md#productos) |
| Búsqueda | [etiquetas](claude/web/etiquetas.md#url-de-filtros) | [busqueda](claude/supabase/busqueda.md) |
| Acceso al dashboard | [dashboard](claude/web/dashboard.md) · [clientes-supabase](claude/web/clientes-supabase.md) | [seguridad-rls](claude/supabase/seguridad-rls.md) |
| Banners de la home | [catalogo](claude/web/catalogo.md#home) · [cache-y-revalidacion](claude/web/cache-y-revalidacion.md#banners-y-ventanas-de-fecha) | [esquema](claude/supabase/esquema.md#banners) |
| Carrito y pedidos | [carrito](claude/web/carrito.md) | [carrito](claude/supabase/carrito.md) |

Promociones, combos y cupones todavía no tienen notas: su diseño está en el
[plan](docs/plan-implementacion.md#fase-6--promociones).

## Reglas de workflow

- **Después de completar cada feature corré `/docs`**: actualiza las notas según el
  diff de la rama. "No hay nada que documentar" es un resultado válido.
- **`node scripts/verificar-docs.mjs` tiene que dar OK** antes de commitear cambios en
  `claude/` o en cualquier `CLAUDE.md`.
- **Todo cambio de esquema es una migración nueva** (`npx supabase migration new`). Nunca
  edites una migración ya aplicada. Después: tipos + advisors (ver
  [migraciones](claude/supabase/migraciones.md)).
- **Toda tabla nueva nace con grants explícitos, RLS habilitado y sus policies en la
  misma migración.** Sin grant la API da 42501; sin RLS la tabla queda abierta.
- La secret key de Supabase no entra en código de la app. Si parece que hace falta, es
  un grant o una policy que falta.
- **Nunca `source web/.env`** ni imprimas su contenido: tiene la contraseña de la base.
- No commitees ni pushees salvo que te lo pidan.

## Convenciones de UI y estilo

- **Componentes de HeroUI en lugar de elementos nativos**: nada de `<button>`,
  `<input>`, `<select>`, `<textarea>`, `<dialog>` crudos. Tabla de equivalencias y
  excepciones en [heroui](claude/web/heroui.md).
- Botones con `onPress`, no `onClick` (React Aria).
- **Estructura tipo compragamer.com en blanco y negro**: encabezado oscuro de dos filas,
  página gris, contenido en superficies blancas `rounded-tarjeta`. El **único color es el
  verde del ahorro**; rojo sólo para errores. De la referencia se toma la estructura,
  nunca su marca. Nombre y logo genéricos desde `lib/sitio.ts` y `components/logo.tsx`.
  Detalle en [tema-y-marca](claude/web/tema-y-marca.md).
- Imágenes siempre con `next/image` y `sizes` explícito. Relación fija por uso (4:5,
  3:1) con recorte obligatorio al subir.
- UI en español rioplatense. Precios en ARS sin decimales, siempre con `formatearPrecio`
  (`lib/formato.ts`). El cliente nunca calcula totales: los muestra.
- Mobile first: el catálogo se navega mayormente desde el celular. Los filtros en
  mobile van en un `Drawer`, en desktop en una columna lateral.
- Código: TypeScript estricto. Identificadores de dominio en español (`producto`,
  `etiqueta`, `grupoEtiqueta`), APIs de librerías como vienen.
- Tablas y columnas SQL en español, `snake_case`, plural (`productos`, `producto_imagenes`).

## Qué NO va en el grafo

`claude/` es contexto permanente. Planes, investigaciones, auditorías y borradores van
en `docs/` y se leen a demanda:

- [docs/plan-implementacion.md](docs/plan-implementacion.md) — estado por fase y diseño de lo que falta (carrito, pedidos, promociones, combos, cupones).
