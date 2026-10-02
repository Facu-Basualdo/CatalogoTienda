"use server";

import { updateTag } from "next/cache";
import { z } from "zod";
import { adminParaAccion, fallo, ok, type Resultado } from "@/lib/admin/accion";
import { TAGS } from "@/lib/catalogo/tags";

const ESTADOS = ["pendiente", "confirmado", "entregado", "cancelado"] as const;
export type EstadoPedido = (typeof ESTADOS)[number];

/**
 * Cambia el estado con cambiar_estado_pedido: confirmar/entregar DESCUENTA stock
 * (atómico por variante; si una no alcanza, falla todo) y volver a pendiente/cancelar
 * desde confirmado/entregado lo REPONE. Ver claude/supabase/carrito.md#estados-y-stock
 */
export async function cambiarEstado(pedidoId: string, estado: EstadoPedido): Promise<Resultado> {
  const { supabase, error } = await adminParaAccion();
  if (!supabase) return fallo(error);
  if (!z.string().uuid().safeParse(pedidoId).success || !ESTADOS.includes(estado)) return fallo("Datos inválidos.");

  const { error: e } = await supabase.rpc("cambiar_estado_pedido", { p_pedido_id: pedidoId, p_estado: estado });
  // Los mensajes de la función son para el admin ("No hay stock suficiente de …").
  if (e) return fallo(e.message || "No se pudo cambiar el estado.");

  // El stock cambió: la tienda tiene que dejar de mostrar unidades que ya no hay.
  const { data: items } = await supabase
    .from("pedido_items")
    .select("producto:productos(slug)")
    .eq("pedido_id", pedidoId);
  updateTag(TAGS.productos);
  updateTag(TAGS.facetas);
  for (const s of new Set((items ?? []).map((i) => i.producto?.slug).filter(Boolean) as string[])) updateTag(TAGS.producto(s));

  return ok(undefined);
}
