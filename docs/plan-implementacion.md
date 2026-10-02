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
| 6 — Promociones | Pendiente — **siguiente** |
| 7 — Combos | Pendiente |
| 8 — Cupones | Pendiente |
| 9 — Etiquetas, categorías y banners | Pendiente |
| 10 — SEO, rendimiento y producción | Pendiente |

Orden acordado: rediseño y carrito primero (hecho); dashboard: fases 3 y 4 hechas, ahora la parte
admin de 5), después promociones, combos y cupones.

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

- `promociones`: `nombre`, `tipo` (`porcentaje` · `monto_fijo` · `nxm` ·
  `segunda_unidad`), `valor`, `lleva`/`paga` (N×M), `desde`/`hasta`, `activa`.
- `promocion_alcance`: una fila por producto, categoría o etiqueta (exactamente una
  de las tres, con `check`), o `alcance_todo = true` explícito. Sin alcance no aplica
  a nada (evita un 20% global por error).
- **No se acumulan**: cada unidad recibe la promoción que más descuenta. Las unidades
  dentro de un combo no reciben promociones.
- `porcentaje` / `monto_fijo` cambian el precio que se muestra: `buscar_productos` y la
  ficha devuelven precio con promo y precio sin promo (tachado). `nxm` y
  `segunda_unidad` no cambian el precio unitario: se muestran como `Chip` ("3×2",
  "2da al 50%") y se aplican en el carrito.
- **Ventanas de fecha y caché**: como con los banners, nadie muta nada cuando una promo
  empieza o termina. Las lecturas con precios pasan a `cacheLife` de 5 minutos. El
  carrito cotiza siempre en vivo, así que la compra nunca usa un precio vencido.
- Redondeo a pesos enteros por línea.
- Dashboard: ABM con selector de alcance (productos, categorías o etiquetas con
  `ComboBox`), vista previa de a qué productos aplica.

### Fase 7 — Combos

- `combos` (`slug`, `nombre`, `descripcion` TipTap, `precio`, `publicado`,
  `destacado`), `combo_items` (`producto_id`, `cantidad`), `combo_imagenes` (4:5, mismo
  flujo que productos).
- **Disponible** si cada producto del combo tiene alguna variante activa con stock ≥
  cantidad. "Ahorrás $X" = suma de precios base de los ítems − precio del combo.
- Ficha `/combo/[slug]`: el visitante elige la variante de cada producto que tenga
  variantes (reusa el selector de la ficha); al carrito va como una línea `combo`.
- Listado `/combos` y sección en la home. No se mezclan en la grilla del catálogo:
  romperían facetas y paginación.
- Dashboard: ABM con buscador de productos, cantidades, precio y cálculo del ahorro.

### Fase 8 — Cupones

- `cupones`: `codigo` (único, sin distinguir mayúsculas), `tipo` (`porcentaje` ·
  `monto_fijo`), `valor`, `minimo_compra`, `usos_maximos` (null = ilimitado), `usos`,
  `desde`/`hasta`, `activo`.
- **Sin grants para `anon`**: si la tabla fuera legible, cualquiera listaría los
  códigos. Se validan sólo dentro de `cotizar`, que ante cualquier fallo responde
  "cupón inválido" sin decir por qué (no expira, no existe, no alcanza el mínimo → el
  mínimo sí se informa, porque el cliente lo puede corregir).
- Un cupón por pedido, sobre el subtotal **después** de promociones y combos.
- `usos` se incrementa en `crear_pedido` con
  `update … set usos = usos + 1 where id = … and (usos_maximos is null or usos < usos_maximos)`:
  atómico, sin carreras. Cancelar el pedido lo devuelve.
- Dashboard: ABM, generador de código aleatorio, usos / máximo, pedidos que lo usaron.

### Fase 9 — Etiquetas, categorías y banners

- [ ] ABM de grupos (slug validado contra claves reservadas, "es variante" bloqueado si
      está en uso) y etiquetas (con fusión de duplicadas).
- [ ] ABM de categorías (dos niveles).
- [ ] ABM de banners: `SubidaImagen` 3:1 (desktop) y 4:5 (mobile), textos, enlace,
      ventana `desde/hasta`, reorden, vista previa.

### Fase 10 — SEO, rendimiento y producción

- [ ] `sitemap.ts`, `robots.ts`, JSON-LD `Product` en la ficha, Open Graph.
- [ ] Revisar LCP y peso del bundle de la tienda (TipTap editor no debe entrar).
- [ ] Deploy en Vercel, dominio, Redirect URLs de Supabase Auth.

## Notas del grafo por escribir

Se crean cuando exista el código, no antes:

| Fase | Nota | Qué va a tener |
|---|---|---|
| 3 | `claude/web/dashboard.md` | Patrón de Server Action, `requerirAdmin`, toasts, `SubidaImagen` |
| 5 | (ya escritas: `claude/*/carrito.md`) | Agregar el dashboard de pedidos cuando exista |
| 6 | `claude/supabase/promociones.md` + `claude/web/promociones.md` | Tipos, alcance, no acumulación, caché por fecha |
| 7 | `claude/supabase/combos.md` + `claude/web/combos.md` | Disponibilidad, variantes por ítem, ahorro |
| 8 | `claude/supabase/cupones.md` | Sin grants, validación dentro de `cotizar`, usos atómicos |

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
