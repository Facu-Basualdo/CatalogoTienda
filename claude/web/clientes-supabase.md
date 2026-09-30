# Clientes de Supabase

[← Índice web](INDICE.md)

Hay tres clientes en `web/lib/supabase/` y **cada uno tiene un único lugar donde se
usa**. Usar el equivocado no da error: da una página lenta o un agujero de seguridad.

| Archivo | Función | Base | Dónde se usa |
|---|---|---|---|
| `publico.ts` | `supabasePublico()` | `createClient` de `@supabase/supabase-js`, sin sesión | Lecturas del catálogo, dentro de funciones `'use cache'` |
| `servidor.ts` | `supabaseServidor()` | `createServerClient` de `@supabase/ssr` con `cookies()` | Server components y Server Actions de `/admin` |
| `navegador.ts` | `supabaseNavegador()` | `createBrowserClient` de `@supabase/ssr` | Login y subida de imágenes en el dashboard |

Los tres están tipados con `Database` de `database.types.ts` (generado, ver
[migraciones](../supabase/migraciones.md#tipos)). `storage.ts` tiene `urlPublica(path)`,
que arma la URL sin cliente.

## El error caro: cookies en el catálogo

**Síntoma:** el build deja de mostrar `○`/`◐` en `/`, `/catalogo` y `/p/[slug]`, o
falla con *blocking route*, y cada visita tarda lo que tarde Supabase.

**Causa:** `supabaseServidor()` en una página pública. Llama a `cookies()`, una API de
runtime, y además dentro de `'use cache'` directamente tira error.

**Regla:** en `app/(tienda)/**` y en `lib/catalogo/**` sólo `supabasePublico()`.

## Identidad en el servidor

- **`getClaims()`, nunca `getSession()`** para decidir algo en el servidor.
  `getSession()` devuelve lo que diga la cookie sin verificar la firma. `getClaims()`
  verifica el JWT (localmente con las claves asimétricas del proyecto) y refresca el
  token si está por vencer. `getUser()` sólo cuando hace falta el registro fresco del
  usuario.
- `requerirAdmin()` (`lib/auth.ts`) valida con `getClaims()` y pregunta
  `rpc('es_admin')` (wrapper de `private.es_admin()`); si no, `redirect('/admin/login')`.
  Es UX: RLS rechaza igual cualquier escritura (ver
  [seguridad-rls](../supabase/seguridad-rls.md)).

## Proxy

`web/proxy.ts` (Next 16 renombró `middleware.ts` a `proxy.ts` y la función a `proxy`;
un `middleware.ts` en Next 16 **no se ejecuta**: la sesión nunca se refresca).

- **`matcher: ['/admin/:path*']`.** Si matchea todo, cada visita al catálogo paga un
  refresco de sesión.
- `setAll(cookies, headers)`: además de las cookies hay que copiar los `headers` que
  pasa `@supabase/ssr` (`Cache-Control: private, no-store`…). Sin ellos un CDN puede
  cachear una respuesta con la cookie de sesión de un admin y servírsela a otro.
- **Devolver la respuesta que construyó `setAll`**: una anterior no lleva las cookies
  refrescadas y el admin queda deslogueado en el request siguiente. Si hay que
  redirigir, copiar sus cookies a la redirección (así está hecho).

## Ver también

- [Caché y revalidación](cache-y-revalidacion.md)
- [Seguridad y RLS](../supabase/seguridad-rls.md)
- [Arquitectura](../general/arquitectura.md)
