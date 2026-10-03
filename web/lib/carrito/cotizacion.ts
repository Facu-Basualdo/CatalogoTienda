"use client";

import { useEffect, useState } from "react";
import { supabaseNavegador } from "@/lib/supabase/navegador";
import type { ItemCarrito } from "./almacen";

// Forma de la respuesta de private.cotizar (última versión en supabase/migrations/*_combos.sql).
export type EstadoLinea = "ok" | "sin_stock" | "stock_insuficiente" | "no_disponible";

export type LineaCotizada = {
  tipo: "variante" | "combo";
  /** variante_id, o combo:<id>:<variantes>: identifica la línea en el carrito. */
  clave: string;
  variante_id: string | null;
  combo_id?: string;
  producto_id: string | null;
  slug: string | null;
  nombre: string | null;
  detalle: string | null;
  sku: string | null;
  imagen_path: string | null;
  cantidad: number;
  stock: number;
  /** Precio de lista por unidad. */
  precio_unitario: number;
  /** Precio por unidad con la promo unitaria (si la línea no quedó en una promo por cantidad). */
  precio_promo: number;
  /** Descuento total de la línea por promociones. */
  descuento: number;
  /** Nombre de la promoción aplicada a la línea. */
  promo: string | null;
  /** Sólo combos: lo que se ahorra frente a comprar los productos por separado (precio de lista). */
  ahorro?: number;
  subtotal: number;
  estado: EstadoLinea;
};

export type Cotizacion = {
  lineas: LineaCotizada[];
  cantidad: number;
  subtotal: number;
  descuento_promociones: number;
  descuento_cupon: number;
  total: number;
};

export type PedidoCreado = Cotizacion & { id: string; numero: number };

export function aItemsRpc(items: ItemCarrito[]) {
  return items.map((i) =>
    i.tipo === "combo"
      ? { tipo: i.tipo, combo_id: i.comboId, variantes: i.variantes, cantidad: i.cantidad }
      : { tipo: i.tipo, variante_id: i.varianteId, cantidad: i.cantidad },
  );
}

/**
 * Cotiza en vivo contra la base (nunca desde caché: stock y precios cambian).
 * `cargando` es true mientras la cotización mostrada no corresponde a `items`.
 */
export function useCotizacion(items: ItemCarrito[]) {
  const [estado, setEstado] = useState<{ clave: string; cotizacion: Cotizacion | null; error: string | null }>({
    clave: "",
    cotizacion: null,
    error: null,
  });
  const clave = JSON.stringify(items);

  useEffect(() => {
    let vigente = true;
    const t = setTimeout(async () => {
      const { data, error } = await supabaseNavegador().rpc("cotizar_carrito", { p_items: aItemsRpc(items) });
      if (!vigente) return;
      setEstado({
        clave,
        cotizacion: error ? null : (data as unknown as Cotizacion),
        error: error ? "No pudimos calcular el total. Probá de nuevo." : null,
      });
    }, 250);
    return () => {
      vigente = false;
      clearTimeout(t);
    };
    // `clave` representa a `items`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clave]);

  return { ...estado, cargando: estado.clave !== clave };
}
