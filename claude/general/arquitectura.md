# Arquitectura

[← CLAUDE.md](../../CLAUDE.md)

No hay backend propio: Next.js habla directo con Supabase (PostgREST + RPC + Storage)
y **toda la autorización la resuelve RLS en Postgres**. Si una regla de acceso vive
sólo en Next, no existe: cualquiera con la publishable key (que está en el bundle del
navegador) puede pegarle a la API de Supabase salteándose la app.

## Los tres caminos de datos

| Camino | Quién | Cliente | Rol en Postgres | Caché |
|---|---|---|---|---|
| Catálogo público (home, listado, ficha) | Visitante | `supabasePublico()` sin cookies | `anon` | Sí, por tags |
| Dashboard (`/admin`) lecturas y Server Actions | Admin logueado | `supabaseServidor()` con cookies | `authenticated` + `es_admin()` | No |
| Subida de imágenes | Admin, desde el navegador | `supabaseNavegador()` | `authenticated` + `es_admin()` | — |

Detalle de cada cliente en [clientes-supabase](../web/clientes-supabase.md).

### Por qué el catálogo usa un cliente sin cookies

El síntoma: agregás el cliente con cookies "porque es el que ya estaba" a la home y el
build marca **todas** las rutas del catálogo como dinámicas; cada visita hace una
consulta a Supabase y el TTFB se va a cientos de ms. `cookies()` es una API dinámica:
basta con leerla para que Next no pueda cachear la ruta. El catálogo no necesita saber
quién mira, así que lee como `anon` y se cachea.

### Por qué las imágenes no pasan por el servidor

Los Server Actions aceptan por defecto cuerpos de hasta 1 MB y las funciones de Vercel
cortan en 4.5 MB. Una foto de celular pesa 3–8 MB. El navegador comprime y sube directo
a Storage; el servidor sólo registra la fila en `producto_imagenes`. Ver
[imagenes (web)](../web/imagenes.md).

## Flujo de una mutación del dashboard

1. Formulario (HeroUI) → Server Action en `web/app/admin/**/acciones.ts`.
2. El action valida con Zod y escribe con `supabaseServidor()`. RLS vuelve a chequear
   que el usuario sea admin — **la validación del action es UX, la de RLS es la real**.
3. El action invalida los tags de caché afectados (tabla en
   [cache-y-revalidacion](../web/cache-y-revalidacion.md)).
4. Si falla, devuelve `{ ok: false, error }` y el formulario lo muestra con un toast;
   no se lanza la excepción al cliente.

## Lo que deliberadamente no hay

- **Service key / secret key en la app**: no está en Vercel ni la importa ningún archivo de
  `app/` o `lib/`. Todo lo que un admin puede hacer lo habilita una policy. (La usan sólo
  los scripts locales de imágenes de demo y de alta de admin.)
- **Route handlers (`app/api/`)** para CRUD: Server Actions + RPC alcanzan. Un route
  handler se justifica sólo para algo que llame un tercero (webhook).
- **Pago online**: el carrito termina en un pedido por WhatsApp, no en un checkout. El
  diseño del carrito, pedidos, promociones, combos y cupones está en el
  [plan](../../docs/plan-implementacion.md#fase-5--carrito-y-pedidos) hasta que exista el código.

## Ver también

- [Entorno y deploy](entorno-y-deploy.md)
- [Seguridad y RLS](../supabase/seguridad-rls.md)
- [Caché y revalidación](../web/cache-y-revalidacion.md)
