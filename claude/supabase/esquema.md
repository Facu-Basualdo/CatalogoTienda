# Esquema

[← Índice supabase](INDICE.md)

Resumen del esquema vigente. La fuente de verdad son las migraciones; esta nota se
actualiza con `/docs` cada vez que una cambia la forma de una tabla.

```
categorias ─┐
            ├─< productos ─┬─< producto_imagenes
            │              ├─< producto_variantes ─< variante_etiquetas >─┐
grupos_etiqueta ─< etiquetas ─< producto_etiquetas >─┘                         │
                    └──────────────────────────────────────────────────────┘
pedidos ─< pedido_items ··> producto_variantes (set null: el ítem es snapshot)
promociones ─< promocion_alcance ··> productos | categorias | etiquetas (uno por fila)
banners
admins ── auth.users
```

## productos

| Columna | Tipo | Notas |
|---|---|---|
| `id` | `uuid` pk | `gen_random_uuid()` |
| `slug` | `text` unique | URL de la ficha: `/p/{slug}` |
| `nombre` | `text` not null | |
| `descripcion` | `jsonb` | Documento de TipTap. **Nunca HTML** — ver [descripcion-rica](../web/descripcion-rica.md) |
| `descripcion_texto` | `text` | Texto plano extraído del JSON al guardar. Lo usan la búsqueda y la meta description |
| `precio` | `numeric(12,2)` not null | Precio base. Una variante puede pisarlo (ver [variantes-y-stock](variantes-y-stock.md)) |
| `precio_anterior` | `numeric(12,2)` null | Si es mayor que `precio`, la UI muestra "oferta" |
| `categoria_id` | `uuid` fk null | Una categoría por producto |
| `publicado` | `boolean` default `false` | Visible en la tienda. `false` = borrador u oculto (switch en el dashboard). Anon sólo ve `true` |
| `destacado` | `boolean` default `false` | Aparece en la home |
| `busqueda` | `tsvector` generada | Ver [busqueda](busqueda.md) |
| `creado_en`, `actualizado_en` | `timestamptz` | `actualizado_en` por trigger |

- **Precios en `numeric`, jamás `float`/`real`.** `19.99` en float es
  `19.989999…` y los redondeos aparecen en los totales y en los filtros por rango.
  En el cliente llegan como `number` desde PostgREST; se formatean con `formatearPrecio`
  y nunca se suman en JS para mostrar algo "exacto".
- **`publicado=false` es el estado borrador, no un flag cosmético.** El flujo de alta
  crea el producto como borrador primero porque las imágenes necesitan el `id` para su
  path (ver [imagenes](imagenes.md)).
- **El slug es la URL pública.** Cambiarlo rompe links compartidos; el dashboard avisa
  antes de guardar un slug distinto en un producto ya publicado.

## categorias

`id`, `slug` unique, `nombre`, `padre_id` (null = raíz), `orden`. Jerarquía de hasta
dos niveles (un trigger rechaza el tercero) (Ropa → Remeras). Filtrar por una categoría padre incluye las hijas: el RPC
lo resuelve, no el cliente.

## grupos_etiqueta · etiquetas · producto_etiquetas

Ver [etiquetas](etiquetas.md). Es el corazón de los filtros. `etiquetas.slug` es una
columna generada desde `valor`; `etiquetas.color_hex` es la muestra para grupos de color.
`grupos_etiqueta.es_marca` marca el grupo "Marca" (uno solo, nunca de variante) y
`grupos_etiqueta.icono` es el nombre de un ícono de `@gravity-ui/icons` para la ficha.

## producto_variantes · variante_etiquetas

**No hay columna de stock en `productos`.** El stock vive en `producto_variantes` y todo
producto tiene al menos una: el trigger `productos_crear_variante_unica` la crea al
insertar el producto. Ver [variantes-y-stock](variantes-y-stock.md).

## producto_imagenes

`id`, `producto_id` fk `on delete cascade`, `path`, `alt`, `orden`, `ancho`, `alto`.
Detalle en [imagenes](imagenes.md).

## banners

| Columna | Tipo | Notas |
|---|---|---|
| `titulo`, `subtitulo`, `texto_boton` | `text` | Opcionales: un banner puede ser sólo imagen |
| `imagen_path` | `text` not null | Desktop, 1920×640 recomendado |
| `imagen_mobile_path` | `text` null | Si falta, se usa la de desktop recortada con `object-cover` |
| `enlace` | `text` null | Ruta interna (`/catalogo?cat=ofertas`) o URL externa |
| `orden` | `int` | |
| `activo` | `boolean` | |
| `desde`, `hasta` | `timestamptz` null | Ventana de publicación. Null = sin límite |

**La ventana `desde/hasta` se filtra en la consulta, no en RLS.** Con la home cacheada,
un banner que vence a las 00:00 sigue visible hasta la próxima revalidación — ver
[cache-y-revalidacion](../web/cache-y-revalidacion.md#banners-y-ventanas-de-fecha).

## Funciones RPC

| Función | Rol | Para qué |
|---|---|---|
| `buscar_productos(p_filtros, p_categoria, p_q, p_orden, p_limite, p_offset, p_destacados, p_ofertas)` | anon | Listado paginado: marca, precio desde (con promo), stock, `variante_id` (variante única), `promo` y primera imagen |
| `precios_producto(p_producto_id)` | anon | Precio de lista y con promo por variante (ver [promociones](promociones.md#contratos-con-la-web)) |
| `facetas_productos(p_filtros, p_categoria, p_q)` | anon | Opciones de filtro con cantidad |
| `banners_vigentes()` | anon | Banners activos dentro de su ventana, por `now()` |
| `cotizar_carrito(p_items)` | anon | Precios del carrito (ver [carrito](carrito.md)) |
| `crear_pedido(p_items, p_nombre, p_notas)` | anon | Guarda el pedido (security definer) |
| `cambiar_estado_pedido(p_pedido_id, p_estado)` | authenticated (+ admin) | Confirmar descuenta stock, cancelar lo repone |
| `guardar_variantes(p_producto_id, p_variantes)` | authenticated (+RLS admin) | Reemplaza todas las variantes |
| `reordenar_imagenes(p_producto_id, p_ids)` | authenticated (+RLS admin) | Reescribe `orden` |
| `guardar_promocion(p_id, p_promo, p_alcance)` | authenticated (+RLS admin) | Promo + alcance en una transacción |
| `es_admin()` | authenticated | ¿El usuario actual es admin? |

Helpers en el schema `private` (no expuesto): `productos_filtrados`, `filtros_validos`,
`variante_cumple`, `cotizar`, `promociones_aplicables`, `promo_unitaria`,
`promo_cantidad_texto`, `es_admin` y los triggers.

## pedidos · pedido_items

Pedidos del carrito con `numero` secuencial, `estado` (enum `estado_pedido`) y totales;
`pedido_items` es un snapshot (nombre, detalle, SKU, precio). Sin grants para `anon`.
Ver [carrito](carrito.md).

## promociones · promocion_alcance

Descuentos automáticos (enum `tipo_promocion`) con ventana `desde/hasta` y alcance por
producto, categoría o etiqueta, o `alcance_todo`. Anon lee sólo las activas. Ver
[promociones](promociones.md).

## admins

`user_id uuid pk references auth.users on delete cascade`. Ver
[seguridad-rls](seguridad-rls.md).

## Ver también

- [Seguridad y RLS](seguridad-rls.md)
- [Migraciones](migraciones.md)
- [Promociones](promociones.md)
- [Arquitectura](../general/arquitectura.md)
