# Seguridad y RLS

[← Índice supabase](INDICE.md)

La publishable key viaja en el bundle del navegador. Cualquiera puede usarla para
llamar a `https://<ref>.supabase.co/rest/v1/productos` directamente. **Lo único que
separa a un visitante de un admin son los grants y RLS.** El chequeo de `/admin` en el
proxy de Next es navegación, no seguridad.

Dos capas, las dos obligatorias:

| Capa | Controla | Dónde |
|---|---|---|
| **Grants** | Si un rol puede tocar la tabla/función en absoluto | Al final de cada migración que crea algo |
| **RLS** | Qué filas ve o escribe ese rol | Policies en la misma migración |

## Grants explícitos (cambio de Supabase de 2026)

Supabase dejó de exponer automáticamente las tablas nuevas de `public` a la Data API.
**Sin `grant`, PostgREST responde `42501 permission denied`** aunque las policies estén
bien. Y al revés: este proyecto se creó con los grants por defecto viejos, que le daban a
`anon` `insert/update/delete` sobre toda tabla nueva. Por eso existe la migración
`revocar_escritura_anon_…`, que los revoca y cambia los default privileges.

Regla para tablas nuevas: `grant select … to anon, authenticated` y
`grant insert, update, delete … to authenticated`. Nunca escritura a `anon`.

Funciones: Postgres le da `execute` a `PUBLIC` por defecto. Cada función se crea con
`revoke execute … from public` y `grant execute` explícito al rol que corresponde.

## Admins

`public.admins (user_id)` sin grants para la API y con RLS sin policies: nadie la lee
por HTTP.

```sql
create function private.es_admin() returns boolean
language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.admins where user_id = (select auth.uid())) $$;
```

- **Vive en el schema `private`**, que la Data API no expone. Una función
  `security definer` en `public` es un endpoint RPC que cualquiera puede llamar.
- **`security definer` es obligatorio**: si corriera como el usuario, chocaría con el RLS
  de `admins` y daría siempre `false`.
- `execute` sólo para `authenticated`. `anon` no la puede llamar, por eso **las policies
  van separadas por rol** (`to anon` nunca menciona `es_admin`): una policy de `anon`
  que la llame da *permission denied for function*.
- La web pregunta con `rpc('es_admin')`: `public.es_admin()` es un wrapper
  `security invoker` sólo ejecutable por `authenticated`.
- **En las policies, `(select private.es_admin())`** y no la llamada directa: con el
  `select` se evalúa una vez por consulta (initPlan), no una vez por fila.

## Policies por tabla

| Tabla | `anon` select | `authenticated` select | escritura |
|---|---|---|---|
| `productos` | `publicado` | `publicado or es_admin` | admin |
| `producto_imagenes`, `producto_etiquetas` | producto publicado | ídem o admin | admin |
| `producto_variantes` | `activa` y producto publicado | ídem o admin | admin |
| `variante_etiquetas` | la variante es visible (RLS anidado) | ídem o admin | admin |
| `categorias`, `grupos_etiqueta`, `etiquetas` | todo | todo | admin |
| `banners` | `activo` | `activo or es_admin` | admin |
| `pedidos`, `pedido_items` | — (sin grants) | admin | sólo `crear_pedido` (definer) crea; admin actualiza y borra |
| `admins` | — | — | sólo SQL |
| `storage.objects` bucket `catalogo` | URL pública, sin policy | admin (listar/borrar) | admin |

- **Las tablas hijas miran al padre.** Si `producto_imagenes` tuviera select libre, un
  borrador filtraría sus fotos y su existencia.
- **Escritura: una policy por acción (insert/update/delete), nunca `for all`.** `for all`
  también cubre SELECT y se suma a la de lectura: dos policies permisivas por fila
  (advisor `multiple_permissive_policies`). Ya pasó; lo corrigió la migración
  `separar_policies_escritura`.
- UPDATE necesita `using` y `with check`, y además una policy de SELECT: sin ella el
  update afecta 0 filas sin error.
- **La única función `security definer` en `public` es `crear_pedido`, a propósito**:
  `anon` no tiene grants sobre `pedidos` y la función es la puerta controlada. Por eso
  valida todo adentro y chequea `publicado`/`activa` a mano (ver [carrito](carrito.md)).
  Cualquier otra definer va en `private`.
- **Los RPC del catálogo son `security invoker`**: respetan el RLS de quien llama. Un
  `security definer` en `buscar_productos` expondría borradores.

## Verificación

Después de cada migración: `supabase db advisors --db-url …` tiene que dar
*No issues found*. Y probar como `anon` por HTTP (con la publishable key):

```
POST /rest/v1/productos              → 42501 permission denied
GET  /rest/v1/admins                 → 42501 permission denied
POST /rest/v1/rpc/guardar_variantes  → 42501 permission denied
GET  /rest/v1/productos?slug=eq.<borrador> → []
```

## Auth

- Email y contraseña. **Sign-ups deshabilitados** en el dashboard de Supabase
  (Authentication → Sign In / Providers): con signups abiertos cualquiera crea un
  usuario `authenticated`; no es admin, pero aumenta superficie.
- En el servidor, identidad con `getClaims()`, nunca `getSession()` (ver
  [clientes-supabase](../web/clientes-supabase.md#identidad-en-el-servidor)).

### Alta de un admin

Con script: `cd web && node scripts/crear-admin.mjs email@dominio.com` (ver
[dashboard](../web/dashboard.md#crear-un-admin)). A mano:

1. Supabase → Authentication → Users → *Add user* (con contraseña, auto-confirmado).
2. SQL editor: `insert into admins (user_id) values ('<uuid del usuario>');`

No hay pantalla para esto a propósito.

## Ver también

- [Esquema](esquema.md)
- [Migraciones](migraciones.md)
- [Imágenes](imagenes.md)
- [Clientes de Supabase](../web/clientes-supabase.md)
- [Arquitectura](../general/arquitectura.md)
