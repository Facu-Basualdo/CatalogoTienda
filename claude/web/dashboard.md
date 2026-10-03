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

Usado por la galería del producto (verificado: una foto 16:9 abre el recorte y se
guarda en 1200×1500).

## Productos

`app/admin/(panel)/productos/`: listado (`page.tsx`), edición (`[id]/page.tsx`) y todas
las acciones (`acciones.ts`). Componentes en `components/admin/productos/`.

- **"Nuevo producto" crea el borrador y abre su edición** (`crearBorrador`): slug
  `borrador-xxxxxxxx`, oculto, con su variante única (la crea el trigger). El slug real
  lo pone `guardarDatos` con el nombre (ver [slugs](#slugs)).
- La edición son secciones independientes, **cada una con su propio Guardar** y su
  acción: datos, imágenes, marca y características, variantes, descripción, borrar.
  Después de guardar, `router.refresh()`; las secciones con estado propio llevan un
  `key` derivado de los datos para reiniciarse con lo nuevo.
- **El slugify de la web (`lib/slug.ts`) replica el de la base**: "Remera e2e" da
  `remera-e2-e` (separa número de letra). Si se cambia uno, cambiar el otro.
- `guardarEtiquetas` **agrega antes de quitar**: si algo falla a mitad, sobra una
  etiqueta en vez de faltar la marca.
- Listado: "sin stock" y la búsqueda por SKU se filtran en el servidor de Next sobre
  hasta 1000 productos (el stock vive en las variantes y PostgREST no filtra por un
  agregado). Con catálogos más grandes, pasar a un RPC.
- Reordenar imágenes con flechas y "Hacer principal", no drag and drop: funciona con
  teclado y en touch sin otra dependencia.

### Errores que ya pasaron acá

| Síntoma | Causa | Regla |
|---|---|---|
| `/admin/productos` en blanco, log: *Functions cannot be passed directly to Client Components* | `renderEmptyState={() => …}` en `Table.Body` desde un server component | Desde server components, sólo props serializables a HeroUI. El estado vacío va afuera de la tabla |
| El build falla en `/admin/productos/[id]`: *usePathname() … outside of Suspense* | La navegación lateral (client) lee la ruta, y en una ruta dinámica eso es dato de URL | `usePathname`/`useSearchParams` dentro de un `Suspense` con fallback; ver `navegacion-admin.tsx` |
| Guardar una descripción con tabla o título: "contenido no soportado" | ProseMirror crea `attrs` con `Object.create(null)`; React los manda al action como referencias opacas | El JSON del editor viaja como **string** (`JSON.stringify`) y se parsea en el action. Ver [descripcion-rica](descripcion-rica.md#guardado) |
| El switch "Visible" del listado no hacía nada al tocarlo | `Switch.Control` fuera de `Switch.Content`: se dibuja sin input | Anatomía de 3.2 en [heroui](heroui.md#cómo-es-la-v3) |
| Campos dentro de una `Table` de HeroUI no aceptan flechas ni espacio | `Table` es un grid de React Aria que captura el teclado | Filas editables (variantes) en una grilla de `div`, no en `Table` |

## Pedidos

`app/admin/(panel)/pedidos/`: listado (por defecto "activos" = pendientes y confirmados;
búsqueda por número exacto o por nombre) y detalle con los ítems guardados (snapshot) y
los botones de estado de `components/admin/pedidos/acciones-pedido.tsx`.

- **Cada cambio de estado pasa por `cambiar_estado_pedido`**, que descuenta o repone
  stock (ver [carrito (supabase)](../supabase/carrito.md#estados-y-stock)). Las
  transiciones que tocan stock piden confirmación con el efecto explicado.
- Los mensajes de error de la función se muestran tal cual ("No hay stock suficiente
  de …").
- Después de cambiar el estado se invalidan `productos`, `facetas` y la ficha de cada
  producto del pedido: la tienda deja de mostrar unidades que ya no hay.
- No hay teléfono del cliente: el contacto sigue por el WhatsApp que el cliente inició.

## Características por categoría

**Al cargar un producto se ven sólo los grupos de etiquetas de su categoría**, no todos:
una remera pide talle, color y material; un monitor, refresco, panel y resolución.

- La categoría se elige en "Datos" y **las secciones de abajo cambian al instante, sin
  guardar**: `ProveedorCategoria` (`components/admin/productos/categoria-producto.tsx`)
  comparte la categoría elegida; `EditorEtiquetas` y `EditorVariantes` filtran con
  `useGruposPermitidos()`.
- Los grupos permitidos son los sueltos de la categoría, **los de sus plantillas** y lo
  mismo de su categoría principal (`gruposPorCategoria` en `obtenerCatalogosAdmin`).
- **Plantillas** (sección al pie de Etiquetas, `components/admin/etiquetas/plantillas.tsx`):
  un conjunto con nombre ("Notebook") de grupos que se asigna a varias categorías de una
  vez, desde la plantilla o desde el modal de la categoría. Es un vínculo, no una copia:
  sumarle un grupo lo suma en todas sus categorías. Se guarda con `guardar_plantilla`
  (una transacción). En el modal de la categoría, los grupos que vienen de una plantilla
  o del padre se ven tildados y bloqueados con su origen ("de Notebook").
- **La marca va siempre.** Un grupo en el que el producto ya tiene valores se sigue
  mostrando aunque no sea de la categoría: filtrar no puede esconder datos guardados.
- Sin categoría, o con una categoría a la que todavía no se le eligieron grupos, se
  muestran todos (con un aviso que lleva a Categorías).
- Se configura desde los dos lados: en el modal de cada categoría (características y
  opciones con stock; las heredadas se ven tildadas y bloqueadas) y en cada grupo de
  etiquetas ("En qué categorías se usa"). **Un grupo nuevo sin categorías no aparece al
  cargar productos de categorías configuradas.**
- No afecta la tienda: los filtros salen de los productos, no de esta configuración.

## Slugs

**El admin nunca escribe un slug ni lo ve como campo.** El panel es para el dueño de la
tienda, no para un desarrollador: lo arma el servidor con `slugUnico()`
(`lib/admin/slug-unico.ts`): `slugify(nombre)` y, si otra fila de la tabla lo usa,
`-2`, `-3`… El formulario sólo muestra la dirección resultante como texto.

| Entidad | Cuándo se arma | Después |
|---|---|---|
| Producto, combo | Al guardar los datos **mientras está oculto** (sigue al nombre) | **Fijo desde que se publica**: renombrar no rompe los links ya compartidos |
| Categoría | Al crearla | Fijo (es el `?cat=`) |
| Grupo de etiquetas | Al crearlo, saltando las claves reservadas (`orden` → `orden-2`) | Fijo (es la clave del filtro en la URL) |
| Valor de etiqueta | Columna generada en la base | Cambia al renombrar (ver [etiquetas](etiquetas.md#en-el-dashboard)) |

No volver a agregar un campo "Slug" a un formulario: si hace falta cambiar una URL
publicada, es un caso para redirecciones, no para el admin.

## Secciones

`components/admin/navegacion-admin.tsx` lista todas, y todas están construidas. Una
sección nueva puede entrar con `listo: false` (deshabilitada, chip "Pronto") hasta
estar lista. La lista que lee `usePathname` va en `Suspense` (ver la tabla de arriba).

| Sección | Nota |
|---|---|
| Productos, pedidos | Esta nota |
| Combos | [combos](combos.md#dashboard) |
| Promociones | [promociones](promociones.md#dashboard) |
| Cupones | [cupones](cupones.md#dashboard) |
| Banners | [banners](banners.md) |
| Etiquetas | [etiquetas](etiquetas.md#en-el-dashboard) |
| Categorías | `/admin/categorias`: árbol de dos niveles, alta y edición en un `Modal`, flechas entre hermanas. Una categoría con hijas no puede ir dentro de otra (lo impide un trigger). Borrarla deja sus productos sin categoría |

Reordenar en todo el panel es con flechas (accesible con teclado y en touch), nunca
drag and drop, y cada tabla tiene su RPC `reordenar_*`.

## Ver también

- [Clientes de Supabase](clientes-supabase.md#identidad-en-el-servidor)
- [Seguridad y RLS](../supabase/seguridad-rls.md)
- [Imágenes](imagenes.md)
- [Caché y revalidación](cache-y-revalidacion.md)
