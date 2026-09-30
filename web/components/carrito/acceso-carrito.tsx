"use client";

import { ShoppingCart } from "@gravity-ui/icons";
import NextLink from "next/link";
import { cantidadTotal, useCarrito } from "@/lib/carrito/almacen";

// Ícono del encabezado con la cantidad de unidades. La cantidad sale del carrito
// local (sin red); los precios sólo los muestra /carrito, cotizados en la base.
export function AccesoCarrito() {
  const cantidad = cantidadTotal(useCarrito());

  return (
    <NextLink
      href="/carrito"
      aria-label={cantidad ? `Carrito, ${cantidad} ${cantidad === 1 ? "unidad" : "unidades"}` : "Carrito vacío"}
      className="relative inline-flex size-10 items-center justify-center rounded-[var(--radius)] text-encabezado-foreground transition-colors hover:bg-white/10"
    >
      <ShoppingCart className="size-5" />
      {cantidad > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-encabezado-foreground px-1 text-[11px] font-semibold tabular-nums text-encabezado">
          {cantidad > 99 ? "99+" : cantidad}
        </span>
      )}
    </NextLink>
  );
}
