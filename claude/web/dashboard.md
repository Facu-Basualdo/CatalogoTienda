# Dashboard

[← Índice web](INDICE.md)

Panel en `web/app/admin/`. `login/` queda afuera del grupo `(panel)/`, que tiene el
layout con barra, navegación y guardia.

## Acceso

- **La guardia es UX, la seguridad es RLS.** `Guardia` (en `(panel)/layout.tsx`) llama a
  `requerirAdmin()`, que redirige a `/admin/login` sin sesión y a
  `/admin/login?error=sin-permiso` si el usuario no está en `admins`. Aunque alguien la
  saltee, grants + RLS rechazan cualquier escritura (ver
  [seguridad-rls](../supabase/seguridad-rls.md)).
- **La guardia y todo lo que lea cookies va dentro de un `<Suspense>`**: con Cache
  Components, leer cookies fuera de un Suspense rompe el build (*blocking route*). El
  shell del panel (barra y navegación) es estático; `Guardia` y `Usuario` son los
  huecos dinámicos.
- Login en el navegador con `supabaseNavegador().auth.signInWithPassword` y después
  **`router.replace('/admin')` + `router.refresh()`**: sin el refresh el layout del
  servidor sigue viendo la sesión anterior (sin cookies) y te devuelve al login.
- Con `?error=sin-permiso` el formulario cierra la sesión de ese usuario, para poder
  entrar con otra cuenta.
- Cerrar sesión: Server Action `cerrarSesion` en `app/admin/acciones.ts`, desde un
  `Form action`.

## Páginas del panel

**Una página del panel nunca hace `await requerirAdmin()` (ni lee cookies) en su nivel
superior.** Renderiza un shell estático (título, botones) y pone todo lo que lee la
sesión en un componente dentro de **su propio** `<Suspense>`:

```tsx
export default function Pagina() {
  return (<>
    <h1>…</h1>
    <Suspense fallback={<Esqueleto />}><Contenido /></Suspense>   // Contenido llama requerirAdmin()
  </>);
}
```

Ya pasó: `/admin` hacía el `await` arriba y el overlay de desarrollo mostraba *"Next.js
encountered uncached data during prerendering or a navigation"*. El `Suspense` que rodea
a `{children}` en el layout **no alcanza**: en una navegación del cliente el layout no
se vuelve a renderizar, así que la página tiene que traer su propia frontera. Es la
regla de la guía de Next *Authentication with Cache Components* (en
`node_modules/next/dist/docs/01-app/02-guides/`). La salida `export const instant = false`
existe, pero vuelve bloqueante la ruta: no la uses.

Referencia: `app/admin/(panel)/page.tsx` (`Resumen` + `EsqueletoResumen`).

### Crear un admin

`cd web && node scripts/crear-admin.mjs email@dominio.com` crea el usuario (o reusa uno
existente) y lo agrega a `admins`. La contraseña es aleatoria y **se escribe en
`web/.env` como `ADMIN_EMAIL` / `ADMIN_PASSWORD`, nunca en la terminal**. Usa la secret
key (sólo local). Alternativa manual en
[seguridad-rls](../supabase/seguridad-rls.md#alta-de-un-admin).

## Patrón de Server Action

`lib/admin/accion.ts`:

1. `adminParaAccion()` devuelve el cliente con sesión, o `{ supabase: null, error }` si
   la sesión venció o no es admin. En acciones **no se redirige**: se devuelve el error.
2. Validar la entrada (Zod).
3. Escribir con ese cliente; RLS vuelve a exigir admin.
4. `updateTag` de todo lo que cambió (tabla en
   [cache-y-revalidacion](cache-y-revalidacion.md#tags)).
5. Devolver `Resultado<T>` (`ok(datos)` / `fallo(mensaje)`). **Nunca lanzar**: una
   excepción en un action llega al cliente como error genérico. El componente muestra
   `toast` o `toast.danger(r.error)`.

Referencia: `refrescarTienda` y `components/admin/boton-refrescar.tsx`
(`useTransition` + `isPending`).

## Refrescar tienda

Botón en el inicio del panel: `updateTag` sobre todos los tags del catálogo y sobre
`producto:{slug}` de cada producto. Existe porque **los cambios hechos por fuera del
panel (SQL, scripts) no invalidan nada** (ver
[cache-y-revalidacion](cache-y-revalidacion.md#cambios-hechos-fuera-de-la-app)).

## Subida de imágenes

`components/admin/subida-imagen.tsx` con `formato` (`producto`, `bannerDesktop`,
`bannerMobile`) y `carpeta` en el bucket. Recorte obligatorio con `react-easy-crop` en un
`Modal` no descartable por clic afuera; exportación en canvas al tamaño exacto
(`lib/admin/imagenes.ts`) y subida directa a Storage. Reglas en
[imagenes](imagenes.md#recorte-obligatorio).

**Todavía no está usado por ninguna pantalla**: se prueba con la edición de productos
(fase 4).

## Secciones

`components/admin/navegacion-admin.tsx` lista todas; las que no existen van con
`listo: false` (deshabilitadas, chip "Pronto"). Al construir una sección, pasarla a
`listo: true`.

## Ver también

- [Clientes de Supabase](clientes-supabase.md#identidad-en-el-servidor)
- [Seguridad y RLS](../supabase/seguridad-rls.md)
- [Imágenes](imagenes.md)
- [Caché y revalidación](cache-y-revalidacion.md)
