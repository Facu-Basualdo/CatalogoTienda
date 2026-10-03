import "server-only";

import { aDia } from "./fechas";
import { obtenerCatalogosAdmin } from "./productos";
import { formatearPrecio } from "@/lib/formato";
import type { supabaseServidor } from "@/lib/supabase/servidor";
import type { Database } from "@/lib/supabase/database.types";

type Cliente = Awaited<ReturnType<typeof supabaseServidor>>;
export type TipoPromocion = Database["public"]["Enums"]["tipo_promocion"];

export type AlcanceAdmin = { productos: string[]; categorias: string[]; etiquetas: string[] };

export type PromocionAdmin = {
  id: string;
  nombre: string;
  tipo: TipoPromocion;
  valor: number | null;
  lleva: number | null;
  paga: number | null;
  alcanceTodo: boolean;
  activa: boolean;
  desde: string | null;
  hasta: string | null;
  alcance: AlcanceAdmin;
};

export type OpcionAlcance = { id: string; nombre: string };

export async function obtenerPromocionAdmin(supabase: Cliente, id: string): Promise<PromocionAdmin | null> {
  const { data: p } = await supabase
    .from("promociones")
    .select("*, alcance:promocion_alcance(producto_id, categoria_id, etiqueta_id)")
    .eq("id", id)
    .maybeSingle();
  if (!p) return null;
  return {
    id: p.id,
    nombre: p.nombre,
    tipo: p.tipo,
    valor: p.valor,
    lleva: p.lleva,
    paga: p.paga,
    alcanceTodo: p.alcance_todo,
    activa: p.activa,
    desde: aDia(p.desde),
    hasta: aDia(p.hasta, true),
    alcance: {
      productos: p.alcance.flatMap((a) => a.producto_id ?? []),
      categorias: p.alcance.flatMap((a) => a.categoria_id ?? []),
      etiquetas: p.alcance.flatMap((a) => a.etiqueta_id ?? []),
    },
  };
}

/** Opciones para elegir el alcance: categorías, etiquetas ("Grupo: valor") y productos. */
export async function opcionesAlcance(supabase: Cliente) {
  const [{ categorias, grupos }, { data: productos }] = await Promise.all([
    obtenerCatalogosAdmin(supabase),
    supabase.from("productos").select("id, nombre").order("nombre").limit(2000),
  ]);
  return {
    categorias: categorias as OpcionAlcance[],
    etiquetas: grupos.flatMap((g) => g.etiquetas.map((e) => ({ id: e.id, nombre: `${g.nombre}: ${e.valor}` }))),
    productos: (productos ?? []) as OpcionAlcance[],
  };
}

/** "20% off", "$ 5.000 off por unidad", "3x2", "2da al 50%". */
export function describirPromo(p: { tipo: TipoPromocion; valor: number | null; lleva: number | null; paga: number | null }) {
  switch (p.tipo) {
    case "porcentaje":
      return `${p.valor}% off`;
    case "monto_fijo":
      return `${formatearPrecio(p.valor ?? 0)} off por unidad`;
    case "nxm":
      return `${p.lleva}x${p.paga}`;
    case "segunda_unidad":
      return `2da al ${p.valor}%`; // mismo texto que private.promo_cantidad_texto
  }
}
