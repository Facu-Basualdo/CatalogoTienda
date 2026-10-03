# Entorno y deploy

[← CLAUDE.md](../../CLAUDE.md)

## Variables de entorno

Todas en `web/.env` (ignorado por git; el molde es `web/.env.example`).

| Variable | Vercel | Para qué |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Sí | URL del proyecto. También arma `images.remotePatterns` en `next.config.ts` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Sí | Key pública (`sb_publishable_…`). Viaja al navegador por diseño: la protección son grants + RLS |
| `NEXT_PUBLIC_SITIO_URL` | Sí (Production) | URL canónica: metadata, Open Graph, sitemap, robots, JSON-LD, links de WhatsApp. Sin ella todo apunta a `localhost:3000` |
| `NEXT_PUBLIC_WHATSAPP` | Sí | Número para los pedidos, internacional sin `+` (`5491100000000`). Sin él no aparece el botón |
| `DATABASE_URL` | **No** | Sólo la CLI de Supabase en local (migraciones, tipos, advisors). Session pooler, puerto 5432 |
| `SUPABASE_SECRET_KEY` | **No** | Sólo los scripts locales (`sembrar-imagenes.mjs`, `crear-admin.mjs`). **La app no la importa** |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | **No** | Credenciales del admin de prueba que escribe `crear-admin.mjs`. Sólo referencia local |

**Si alguien necesita `SUPABASE_SECRET_KEY` en código de la app "para que funcione",
está tapando un grant o una policy faltante** — ver
[seguridad-rls](../supabase/seguridad-rls.md).

`web/.env` no se carga con `source` en bash: ver
[migraciones](../supabase/migraciones.md#conexión).

## Vercel

- **Root Directory: `web`.** El repo tiene `supabase/`, `claude/`, `docs/` al lado; si el
  root queda en la raíz, Vercel no encuentra `package.json`.
- Framework Next.js, build y output por defecto. Variables de la tabla (las que dicen Sí).
- Plan Hobby: la optimización de imágenes tiene cupo mensual. Por eso las imágenes se
  suben ya en tamaño final y hay pocas variantes de `sizes` (ver
  [imagenes](../web/imagenes.md)).

## Supabase

- **Un solo proyecto**, con datos de demo (es un portfolio). El seed y las imágenes de
  demo se aplicaron sobre él (ver [migraciones](../supabase/migraciones.md#seed)). Si
  el proyecto pasa a tener datos reales, crear otro proyecto para desarrollo y apuntar
  los previews de Vercel ahí: si no, **un admin probando en un preview escribe en prod**.
- **Auth → URL Configuration**: agregar el dominio de producción y el patrón de los
  previews en Redirect URLs, si no el login desde un preview redirige mal.
- **Auth → Sign-ups deshabilitados.** Los admins se crean a mano (ver
  [seguridad-rls](../supabase/seguridad-rls.md#alta-de-un-admin)).
- Plan gratuito: el proyecto se pausa tras una semana sin actividad. Para una demo
  pública, entrar al dashboard de vez en cuando o usar un plan pago.

## Orden de un deploy con cambio de esquema

El build de Vercel **no aplica migraciones**. Si se mergea código que lee una columna
nueva antes de aplicar la migración, producción rompe hasta que alguien la aplique.

1. `supabase db push` (ver [migraciones](../supabase/migraciones.md#flujo)).
2. Regenerar `database.types.ts` y commitearlo con el código.
3. Recién después, merge a `main` → deploy.

Las migraciones tienen que ser compatibles con el código que está corriendo (agregar
columna nullable → desplegar → recién ahí volverla `not null`).

## Ver también

- [Arquitectura](arquitectura.md)
- [Migraciones](../supabase/migraciones.md)
- [Clientes de Supabase](../web/clientes-supabase.md)
