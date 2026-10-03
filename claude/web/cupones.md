# Cupones

[← Índice web](INDICE.md)

**El navegador guarda sólo el código y nunca sabe si vale: se lo dice
`cotizar_carrito`.** La tabla de cupones no es legible desde la web (ver
[cupones supabase](../supabase/cupones.md)). Si en algún momento hace falta "validar
el cupón" en el cliente, la respuesta es la cotización, no una consulta a `cupones`.

## Carrito

- `fijarCupon()` / `useCupon()` en `lib/carrito/almacen.ts`: `localStorage`
  `carrito:cupon`, en mayúsculas, mismo patrón que el carrito (`useSyncExternalStore`,
  try/catch). Sobrevive a recargar y se borra al enviar el pedido.
- `useCotizacion(items, cupon)` manda `p_cupon`; la respuesta trae `cupon`
  (`{ codigo, descuento }`) o `cupon_error`.
- `CampoCupon`: campo + "Aplicar"; aplicado, muestra el código y "Quitar". El resumen
  suma la fila "Cupón CODIGO".
- **Un cupón que no vale bloquea "Enviar pedido"** con el aviso "quitá o corregí el
  cupón": `crear_pedido` lo rechazaría igual, y no queremos que el cliente vea un total
  y el pedido guarde otro.
- El mensaje de WhatsApp agrega "Cupón CODIGO: -$X".

## Dashboard

`/admin/cupones` (listado con usos `n / máx`, estado Vigente / Programado / Vencido /
Pausado / Agotado y switch), `/nuevo` y `/[id]` (formulario, pedidos que lo usaron,
borrado). Acciones en `app/admin/(panel)/cupones/acciones.ts`.

- **No invalidan caché**: ningún cupón aparece en una lectura cacheada.
- "Generar" arma 10 caracteres al azar sin `0/O/1/I` (se dictan por WhatsApp).
- Las fechas son por día, con el mismo `SelectorFecha` y los helpers de
  `lib/admin/fechas.ts` que promociones (ver [promociones](promociones.md#fechas)).
- En el detalle del pedido, el descuento figura como "Cupón CODIGO" (`cupon_codigo`).

## Ver también

- [Cupones (supabase)](../supabase/cupones.md) — evaluación, firmas, usos
- [Carrito](carrito.md)
- [Promociones](promociones.md)
- [Dashboard](dashboard.md)
