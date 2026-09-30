# Carrito

[← Índice web](INDICE.md)

Carrito del visitante → pedido guardado en la base → mensaje de WhatsApp. Motor de
precios y reglas de stock en [carrito (supabase)](../supabase/carrito.md).

## Qué guarda el navegador

`lib/carrito/almacen.ts`: `localStorage` clave `carrito:v1`, **sólo ids y cantidades**
(`{ tipo: 'variante', varianteId, cantidad }`). Nunca precios, nombres ni stock: todo eso
cambia y el carrito lo pide de nuevo.

- Se lee con `useCarrito()` (`useSyncExternalStore`). En el server y antes de hidratar
  devuelve `[]`: el contador del encabezado aparece después de cargar, no hay mismatch.
- **Todo acceso a `localStorage` va en try/catch**: en modo privado o con el
  almacenamiento bloqueado tira excepción; el carrito sigue funcionando en memoria.
- El evento `storage` sincroniza pestañas: agregar en una actualiza el contador de otra.
- Mutaciones sólo con `carrito.agregar / fijarCantidad / quitar / vaciar` (aplican los
  topes de 20 unidades y 30 líneas, los mismos que la base).

## Precios

**El cliente nunca suma ni multiplica precios.** `useCotizacion(items)`
(`lib/carrito/cotizacion.ts`) llama al RPC `cotizar_carrito` con debounce de 250 ms y
muestra lo que vuelve. Mientras la cotización no corresponde a los items actuales,
`cargando` es true y la lista se atenúa. La cotización **no se cachea** (ni `'use cache'`
ni SWR): stock y precio tienen que ser los de ahora.

Se llama desde el navegador con `supabaseNavegador()`: para un visitante no hay sesión,
así que corre como `anon`, con el RLS del catálogo.

## Pantallas

| Dónde | Qué |
|---|---|
| Tarjeta del catálogo | Variante única con stock → `BotonAgregar` directo. Con opciones → "Elegir opciones" (a la ficha). Sin stock → deshabilitado |
| Ficha | Cantidad (`NumberField`, máx. `min(stock, 20)`) + `BotonAgregar` con la variante elegida |
| Encabezado | `AccesoCarrito`: ícono + unidades, link a `/carrito` |
| `/carrito` | `PaginaCarrito`: líneas cotizadas, avisos por estado, resumen, nombre y notas, "Enviar pedido por WhatsApp" |

`tarjeta.varianteId` sale de `buscar_productos.variante_id`: sólo viene cuando el
producto tiene **una** variante activa y sin etiquetas. Con opciones es `null` a
propósito: agregar "la primera variante" mandaría un talle que el cliente no eligió.

Avisos por línea: `stock_insuficiente` ofrece "Llevar N"; `sin_stock` y `no_disponible`
piden quitarla. **El botón de enviar queda deshabilitado mientras haya avisos**, y
`crear_pedido` igual lo rechazaría.

## Envío

1. `rpc('crear_pedido', { p_items, p_nombre, p_notas })`. Si falla, el `message` va
   directo a un `toast.danger` (los textos están escritos para el cliente).
2. Se vacía el carrito y se muestra la confirmación con el número de pedido.
3. **WhatsApp se abre con un link que el usuario toca**, no con `window.open` después
   del `await`: los navegadores bloquean popups que no salen directo de un clic.
4. El mensaje (`mensajeWhatsapp`) usa las líneas y el total **que devolvió
   `crear_pedido`**, no los de la cotización previa.
5. Sin `NEXT_PUBLIC_WHATSAPP` el pedido se registra igual y la confirmación no muestra
   el botón.

## Ver también

- [Carrito (supabase)](../supabase/carrito.md)
- [Variantes y stock](variantes-y-stock.md)
- [Catálogo](catalogo.md)
- [Clientes de Supabase](clientes-supabase.md)
