# Plan de implementación — CatalogoTienda

Documento de plan: se lee a demanda, no forma parte del grafo `claude/`. Lo que ya
está construido se documenta en `claude/`; acá queda el orden del trabajo y el diseño
de lo que todavía no existe.

## Objetivo

Tienda de portfolio con catálogo genérico (ropa, electrónica, lo que sea):

- Productos con **varias imágenes** (relación fija, recorte obligatorio al subir),
  **descripción rica con tablas** y **variantes con stock** (talle × color, memoria…).
- **Etiquetas agrupadas** que alimentan **filtros facetados** y la tabla de
  características.
- **Carrito con pedido por WhatsApp**: el visitante arma el carrito, aplica un cupón,
  ve el total y lo envía; el pedido queda guardado para el dashboard.
- Estructura visual tomada de **compragamer.com**, en blanco y negro.
- **Promociones** (% o monto por alcance, N×M, 2da unidad al X%), **combos** y
  **cupones de descuento**.
- **Dashboard** para todo lo anterior, banners de la home y pedidos.
- Next.js 16 + **HeroUI v3**, Supabase (Postgres, Storage, Auth), **Vercel**.
  Estética blanco y negro, nombre y logo genéricos.

## Fuera de alcance

- Pago online (Mercado Pago). El pedido termina en WhatsApp.
- Cuentas de clientes, reseñas, multi-idioma, multi-moneda, envíos.
- Imágenes por variante (fotos distintas por color).

## Estado

| Fase | Estado |
|---|---|
| 0 — Base del proyecto | ✅ Hecha (falta conectar Vercel) |
| 1 — Modelo de datos | ✅ Hecha: migraciones aplicadas, advisors limpios, seed + imágenes de demo |
| 2 — Catálogo público | ✅ Hecha: home, catálogo con filtros y paginación, ficha con variantes |
| 2b — Rediseño estilo compragamer | ✅ Hecho: estructura de compragamer.com en blanco y negro, marca, íconos, vista grilla/lista, `/ofertas` |
| 3 — Auth y estructura del dashboard | ✅ Hecha: login, guardia, navegación, patrón de acciones, "Refrescar tienda", `SubidaImagen` (sin usar todavía) |
| 4 — ABM de productos | ✅ Hecha: listado, alta, datos, marca y características, galería con recorte, variantes y stock, descripción con tablas, borrado |
| 5 — Carrito y pedidos | ✅ Hecha: carrito, cotización, pedido por WhatsApp y dashboard de pedidos con estados y stock |
| 6 — Promociones | ✅ Hecha: motor en `cotizar`, precios con promo en la tienda, ABM en el dashboard |
| 7 — Combos | ✅ Hecha: ficha con variantes por producto, línea de combo en `cotizar`, pedido padre + hijas, ABM |
| 8 — Cupones | ✅ Hecha: evaluación en la base sin exponer la tabla, campo en el carrito, usos, ABM |
| 9 — Etiquetas, categorías y banners | ✅ Hecha: ABM completos, claves de variantes al día, color del texto del banner |
| 10 — SEO, rendimiento y producción | SEO y bundle ✅ · **falta el deploy en Vercel** (pasos en la fase 10) |

Orden acordado: rediseño y carrito primero, después el dashboard (3, 4 y 5) y
promociones, combos, cupones y el resto del dashboard (hecho); ahora producción.

## Decisiones de arquitectura

| Tema | Decisión | Alternativa descartada y por qué | Nota |
|---|---|---|---|
| Atributos | Etiquetas en grupos, tabla puente; marca = grupo `es_marca` | Columnas por rubro (no es genérico) · `jsonb` (facetas y unicidad difíciles) | [etiquetas](../claude/supabase/etiquetas.md) |
| Stock | En `producto_variantes`; todo producto tiene ≥ 1 variante | Stock en `productos` + variantes opcionales (dos caminos en todo) | [variantes-y-stock](../claude/supabase/variantes-y-stock.md) |
| Visibilidad | `publicado` oculta el producto; stock 0 lo deja visible con "Sin stock" | Ocultar lo agotado (rompe links compartidos) | [variantes-y-stock](../claude/supabase/variantes-y-stock.md#visibilidad) |
| Filtros | AND entre grupos, OR dentro; facetas sin su propio grupo; estado en la URL | AND total · estado en el cliente | [etiquetas web](../claude/web/etiquetas.md) |
| Paginación | OFFSET con páginas numeradas y links reales | Cursor (no permite saltar ni combinar con cualquier orden) | [catalogo](../claude/web/catalogo.md#paginación) |
| Descripción | JSON de TipTap + static renderer | HTML (XSS) · Markdown (tablas a mano) | [descripcion-rica](../claude/web/descripcion-rica.md) |
| Imágenes | Relación fija, recorte en el navegador, subida directa a Storage, sin texto adentro | `object-cover` sin criterio · pasar por Server Action (límite 1 MB) | [imagenes](../claude/web/imagenes.md) |
| Autorización | Grants explícitos + RLS + `private.es_admin()`; sin secret key en la app | Chequeo sólo en Next | [seguridad-rls](../claude/supabase/seguridad-rls.md) |
| Caché | Cache Components: `'use cache'` + tags, `updateTag` en cada acción | Render dinámico · ISR por tiempo | [cache](../claude/web/cache-y-revalidacion.md) |
| Precios del carrito | **Un solo motor de precios en Postgres** (`private.cotizar`) | Calcular en el cliente (el total del WhatsApp no coincidiría con el guardado) | [carrito](../claude/supabase/carrito.md) |
| Estética | Estructura de compragamer.com en blanco y negro; verde sólo para el ahorro | Paleta de marca · copiar su rojo | [tema-y-marca](../claude/web/tema-y-marca.md) |

## Fases hechas

Documentadas en `claude/`. Pendientes sueltos: conectar el repo a Vercel (Root
Directory `web`, variables de [entorno-y-deploy](../claude/general/entorno-y-deploy.md)),
deshabilitar sign-ups en Supabase Auth y cargar `NEXT_PUBLIC_WHATSAPP`.

### Fase 3 — Auth y estructura del dashboard

- [x] `/admin/login` con email y contraseña (`TextField`, `Button`, errores en español).
- [x] Layout `/admin` con `requerirAdmin()`, navegación lateral (`Drawer` en mobile):
      Productos · Pedidos · Combos · Promociones · Cupones · Banners · Etiquetas · Categorías.
- [x] Alta del primer admin (`scripts/crear-admin.mjs`, o a mano (ver [seguridad-rls](../claude/supabase/seguridad-rls.md#alta-de-un-admin))).
- [x] Patrón de Server Action: Zod → escritura con `supabaseServidor()` → `updateTag`
      → `{ ok, error }` → `toast()`.
- [x] Acción "Refrescar tienda": `updateTag` sobre todos los `TAGS`, para cambios hechos
      por fuera de la app (ver [cache](../claude/web/cache-y-revalidacion.md#cambios-hechos-fuera-de-la-app)).
- [x] Componente compartido `SubidaImagen` (se prueba en la fase 4) con dropzone + **recorte obligatorio**
      (`react-easy-crop` en `Modal`, relación por prop) + export WebP al tamaño exacto.
      Lo usan productos, combos y banners.

**Listo cuando:** un usuario autenticado que no está en `admins` no ve el dashboard
**ni** puede escribir por API directa (✅ verificado: insert, update, lectura de pedidos y
subida a Storage rechazados; el login lo devuelve con "sin permiso"); subir una foto 16:9
abre el recorte en 4:5 (✅ verificado con la galería de productos).

### Fase 4 — ABM de productos

- [x] Listado con `Table` paginada: búsqueda, filtros por categoría, estado y "sin
      stock", columna de stock total, `Switch` "visible en la tienda" inline.
- [x] "Nuevo producto" crea borrador y redirige a la edición.
- [x] Formulario: nombre, marca, slug (con aviso si ya está publicado), precio, precio
      anterior, categoría, destacado, visible.
- [x] Galería: `SubidaImagen` (4:5), reorden con flechas (no drag and drop), `alt`, borrado
      (Storage primero, fila después).
- [x] Etiquetas no-variante: `Autocomplete` por grupo con "crear «…»".
- [x] Variantes: grupos (máx. 3), "generar combinaciones" (tope 100), `Table` editable
      (SKU, precio, stock, activa), "aplicar stock a todas", guardado por `guardar_variantes`.
- [x] Editor TipTap con tablas; guardado de `descripcion` + `descripcion_texto`.

**Listo cuando:** se carga una remera 3 talles × 2 colores y un monitor sin variantes
desde el celular, aparecen en la tienda en segundos, y stock 0 en "M/negro" la saca del
filtro `talle=m&color=negro`. ✅ Verificado en el navegador (escritorio): alta, datos,
marca, variantes con stock, imagen 16:9 → recorte 4:5, descripción con tabla, ficha y
filtro de variante en la tienda, y borrado (limpia Storage). Pendiente: probarlo desde
un celular real.

### Fase 5 — Carrito y pedidos

**Parte pública: hecha** (ver [carrito web](../claude/web/carrito.md) y
[carrito supabase](../claude/supabase/carrito.md)). `cotizar` todavía no recibe cupón:
el parámetro `p_cupon` se agrega en la fase 8.

Pendiente, en el dashboard:

- [x] Listado de pedidos con filtro por estado y búsqueda por número o nombre.
- [x] Detalle con los ítems (snapshot) y botones de estado vía `cambiar_estado_pedido`.
- [x] Probado con un admin real: confirmar descuenta el stock exacto y cancelar un
      confirmado lo repone. (Confirmar sin stock suficiente: cubierto por la función, no
      probado de punta a punta.)

**Listo cuando:** un pedido enviado aparece en el dashboard con el mismo total que
mostró el carrito, y confirmarlo descuenta el stock de las variantes exactas.

### Fase 6 — Promociones

Hecha (ver [promociones web](../claude/web/promociones.md) y
[promociones supabase](../claude/supabase/promociones.md)).

- [x] `promociones` + `promocion_alcance` (uno de producto/categoría/etiqueta por fila, o
      `alcance_todo` explícito), RLS y grants.
- [x] Sin acumulación: mejor promo unitaria por unidad; por cantidad (N×M, 2da al X%)
      sólo si gana más, elegidas de a una dentro de `cotizar`.
- [x] Tienda: precio con promo y lista tachada en tarjeta, ofertas y ficha; chips
      "3x2" / "2da al 50%"; descuento y nombre de la promo por línea en el carrito y en
      el WhatsApp.
- [x] Caché: tag `promociones` en toda lectura con precio y vida de 5 minutos.
- [x] Dashboard: listado con estado y switch, alta/edición con tipo, valores, fechas por
      día, activa y alcance (`ComboBox` de categorías, etiquetas y productos), borrado;
      guardado atómico con `guardar_promocion`.
- [ ] Vista previa de a qué productos aplica (quedó afuera: el listado del alcance ya
      dice cuántos de cada tipo).

**Listo cuando:** crear un 15% sobre un producto cambia su precio en la tienda y la
ficha, pausarlo lo devuelve, y un 3x2 descuenta la unidad más barata en el carrito. ✅
Verificado en el navegador (crear, pausar desde el listado, editar, borrar, carrito con
3x2) y por REST (mezcla de variantes en el 3x2, 2da al 50%, sin promo con 2 unidades).

### Fase 7 — Combos

Hecha (ver [combos web](../claude/web/combos.md) y
[combos supabase](../claude/supabase/combos.md)).

- [x] `combos`, `combo_items` (productos, `restrict`), `combo_imagenes`, con RLS y grants.
- [x] Disponible si cada producto tiene alguna variante activa con stock ≥ cantidad;
      "Ahorrás $X" contra el precio de lista más bajo de cada producto.
- [x] Ficha `/combo/[slug]` con un selector por producto (mismas reglas que la ficha,
      contra la cantidad del ítem); al carrito como línea `combo` con `clave` propia.
- [x] `cotizar` con líneas de combo (sin promociones adentro); `crear_pedido` guarda
      padre + hijas por variante, y `pedido_items.promo` en las líneas con promoción.
- [x] `/combos`, carrusel en la home y "Combos" en el encabezado; no se mezclan en el
      catálogo.
- [x] Dashboard: listado con switch, edición de datos, productos y cantidades (vista
      previa del ahorro), imágenes y descripción (componentes compartidos con productos),
      borrado. Borrar un producto que está en un combo avisa en cuál.

**Listo cuando:** un combo con remera y buzo deja elegir talle y color de cada uno, el
pedido lo guarda con las variantes exactas y confirmarlo descuenta el stock de esas
variantes. ✅ Verificado en el navegador: combo abrigo al carrito con ahorro, pedido,
confirmar (stock 2/2 → 1/1) y cancelar (vuelve a 2/2), alta de un combo desde el panel,
publicación, ficha en la tienda y borrado.

### Fase 8 — Cupones

Hecha (ver [cupones web](../claude/web/cupones.md) y
[cupones supabase](../claude/supabase/cupones.md)).

- [x] `cupones` sin grants para `anon`; evaluación en `private.evaluar_cupon` (definer)
      con error genérico salvo el mínimo de compra.
- [x] Un cupón por pedido, sobre el subtotal después de promociones y combos.
- [x] `cotizar_carrito` y `crear_pedido` con `p_cupon`; usos atómicos al crear el
      pedido, devueltos al cancelarlo.
- [x] Carrito: campo de cupón que se guarda con el carrito, fila en el resumen y en el
      WhatsApp; un cupón inválido bloquea el envío.
- [x] Dashboard: listado con usos y estado, alta/edición con generador de código,
      fechas por día, pedidos que lo usaron, borrado.

**Listo cuando:** un cupón con mínimo avisa cuánto falta, uno válido baja el total del
carrito y del pedido, y cancelar el pedido devuelve el uso. ✅ Verificado: por REST
(anon no lee la tabla, código en minúsculas, inexistente, mínimo, después de una promo,
pedido con cupón inválido rechazado) y en el navegador (aplicar, recargar, enviar, uso
1 → cancelar → 0, generar un código desde el panel).

### Fase 9 — Etiquetas, categorías y banners

Hecha (ver [etiquetas](../claude/web/etiquetas.md#en-el-dashboard),
[banners](../claude/web/banners.md) y [dashboard](../claude/web/dashboard.md#secciones)).

- [x] ABM de grupos (slug contra claves reservadas, "es variante" bloqueado si está en
      uso, marca siempre primera) y valores (renombrar con aviso del slug, color, orden,
      fusión de duplicadas, borrado).
- [x] La `clave` de las variantes se recalcula al renombrar valores o cambiar
      orden/slug de un grupo (triggers).
- [x] ABM de categorías (dos niveles, también al mover una que tiene hijas).
- [x] ABM de banners: `SubidaImagen` 3:1 y 4:5, textos, enlace, color del texto,
      ventana `desde/hasta`, reorden, vista previa con la misma diapositiva de la home.

**Listo cuando:** se crea un grupo y sus valores, se fusionan dos, se arma una
subcategoría y se publica un banner que aparece en la home. ✅ Verificado en el
navegador (slug reservado y duplicado rechazados, renombrar, fusionar, borrar; categoría
bajo Ropa y Ropa sin poder anidarse; banner con texto blanco en la home y borrado con su
carpeta de Storage) y las claves por SQL en una transacción revertida.

### Fase 10 — SEO, rendimiento y producción

- [x] `sitemap.ts`, `robots.ts`, JSON-LD `Product` en la ficha y el combo, Open Graph
      con imagen por defecto (ver [catalogo](../claude/web/catalogo.md#seo)).
- [x] Bundle de la tienda: el editor TipTap no entra (ficha, home y catálogo sin
      ProseMirror) y el cliente de Supabase sólo se carga en `/carrito`. Cada página baja
      ~950 KB de JS sin comprimir (~300 KB gzip), casi todo React y React Aria (HeroUI).
- [x] LCP: la primera imagen de la ficha y el primer banner con `priority` (preload).
- [ ] **Deploy en Vercel** (lo hace el dueño de la cuenta):
  1. Importar el repo con **Root Directory `web`**.
  2. Variables: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`,
     `NEXT_PUBLIC_SITIO_URL` (el dominio final) y `NEXT_PUBLIC_WHATSAPP`. Nada más
     (ver [entorno-y-deploy](../claude/general/entorno-y-deploy.md)).
  3. Supabase → Auth → URL Configuration: el dominio y el patrón de los previews.
  4. Supabase → Auth: deshabilitar sign-ups. Rotar la contraseña de la base.
  5. Probar en producción: login del panel, un pedido con cupón y su WhatsApp.

## Notas del grafo por escribir

Ninguna: todas las features construidas tienen su nota en `claude/` (ver los índices).
Una feature nueva crea la suya cuando exista el código, no antes.

## Riesgos

| Riesgo | Mitigación |
|---|---|
| Cupo de optimización de imágenes de Vercel Hobby | Imágenes en tamaño final, pocas variantes de `sizes` |
| Supabase gratuito pausa el proyecto | Entrar periódicamente o plan pago para la demo |
| Spam de pedidos anónimos | Límites en `crear_pedido`; Turnstile si hace falta |
| Enumeración de cupones | Tabla sin grants, respuesta genérica, códigos largos |
| Precio mostrado ≠ precio cobrado | Motor único en Postgres; el cliente sólo muestra |
| Explosión de combinaciones de variantes | Máx. 3 grupos y 100 combinaciones |

## Decisiones tomadas

- Variantes con stock desde la v1; "Sin stock" visible; switch de visibilidad.
- Nombre y logo genéricos ("Tienda"), blanco y negro.
- Carrito con pedido por WhatsApp guardado en la base.
- Estructura de compragamer.com en blanco y negro (verde sólo para el ahorro); marca
  en tarjeta y filtro, especificaciones con íconos, vista grilla/lista. Sin precio por
  medio de pago.
- Orden: rediseño + carrito primero, después dashboard.
- Promociones: % o monto por alcance, N×M, 2da unidad al X%.
- Imágenes con relación fija y recorte obligatorio: productos y combos 4:5, banners
  3:1 (desktop) y 4:5 (mobile).
- Moneda ARS sin decimales; botón de contacto por WhatsApp.
