import "server-only";

import type { supabaseServidor } from "@/lib/supabase/servidor";

type Cliente = Awaited<ReturnType<typeof supabaseServidor>>;

export type ItemComboAdmin = { productoId: string; cantidad: number };
export type ProductoParaCombo = { id: string; nombre: string; precio: number; publicado: boolean; stock: number };

export type ComboAdmin = {
  id: string;
  slug: string;
  nombre: string;
  precio: number;
  publicado: boolean;
  destacado: boolean;
  descripcion: unknown;
  imagenes: { id: string; path: string; alt: string; orden: number }[];
  items: ItemComboAdmin[];
};

export async function obtenerComboAdmin(supabase: Cliente, id: string): Promise<ComboAdmin | null> {
  const { data: c } = await supabase
    .from("combos")
    .select("*, imagenes:combo_imagenes(id, path, alt, orden), items:combo_items(id, producto_id, cantidad, orden)")
    .eq("id", id)
    .maybeSingle();
  if (!c) return null;
  return {
    id: c.id,
    slug: c.slug,
    nombre: c.nombre,
    precio: Number(c.precio),
    publicado: c.publicado,
    destacado: c.destacado,
    descripcion: c.descripcion,
    imagenes: [...c.imagenes].sort((a, b) => a.orden - b.orden),
    items: [...c.items]
      .sort((a, b) => a.orden - b.orden || a.id.localeCompare(b.id))
      .map((i) => ({ productoId: i.producto_id, cantidad: i.cantidad })),
  };
}

/**
 * Productos elegibles con su precio de lista más bajo (el que usa el ahorro de la
 * tienda) y stock total. Incluye ocultos: un combo con uno oculto no se puede comprar.
 */
export async function productosParaCombo(supabase: Cliente): Promise<ProductoParaCombo[]> {
  const { data } = await supabase
    .from("productos")
    .select("id, nombre, precio, publicado, variantes:producto_variantes(precio, stock, activa)")
    .order("nombre")
    .limit(2000);
  return (data ?? []).map((p) => {
    const activas = p.variantes.filter((v) => v.activa);
    return {
      id: p.id,
      nombre: p.nombre,
      publicado: p.publicado,
      precio: activas.length ? Math.min(...activas.map((v) => Number(v.precio ?? p.precio))) : Number(p.precio),
      stock: activas.reduce((s, v) => s + v.stock, 0),
    };
  });
}
