import "server-only";

import { aDia } from "./fechas";
import { formatearPrecio } from "@/lib/formato";
import type { supabaseServidor } from "@/lib/supabase/servidor";

type Cliente = Awaited<ReturnType<typeof supabaseServidor>>;

export type CuponAdmin = {
  id: string;
  codigo: string;
  tipo: "porcentaje" | "monto_fijo";
  valor: number;
  minimoCompra: number;
  usosMaximos: number | null;
  usos: number;
  activo: boolean;
  desde: string | null;
  hasta: string | null;
};

export type PedidoConCupon = { id: string; numero: number; nombre: string; estado: string; descuento: number; creadoEn: string };

export async function obtenerCuponAdmin(supabase: Cliente, id: string): Promise<{ cupon: CuponAdmin; pedidos: PedidoConCupon[] } | null> {
  const [{ data: c }, { data: pedidos }] = await Promise.all([
    supabase.from("cupones").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("pedidos")
      .select("id, numero, nombre, estado, descuento_cupon, creado_en")
      .eq("cupon_id", id)
      .order("creado_en", { ascending: false })
      .limit(50),
  ]);
  if (!c) return null;
  return {
    cupon: {
      id: c.id,
      codigo: c.codigo,
      tipo: c.tipo,
      valor: Number(c.valor),
      minimoCompra: Number(c.minimo_compra),
      usosMaximos: c.usos_maximos,
      usos: c.usos,
      activo: c.activo,
      desde: aDia(c.desde),
      hasta: aDia(c.hasta, true),
    },
    pedidos: (pedidos ?? []).map((p) => ({
      id: p.id,
      numero: p.numero,
      nombre: p.nombre,
      estado: p.estado,
      descuento: Number(p.descuento_cupon),
      creadoEn: p.creado_en,
    })),
  };
}

/** "10%" o "$ 5.000". */
export function describirCupon(c: { tipo: "porcentaje" | "monto_fijo"; valor: number }) {
  return c.tipo === "porcentaje" ? `${c.valor}%` : formatearPrecio(c.valor);
}
