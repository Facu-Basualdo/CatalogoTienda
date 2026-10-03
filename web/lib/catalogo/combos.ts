import { cacheLife, cacheTag } from "next/cache";
import { supabasePublico } from "@/lib/supabase/publico";
import { obtenerProducto, type GrupoVariante, type VarianteFicha } from "./lecturas";
import { TAGS } from "./tags";

// Lecturas públicas de combos. Llevan también el tag `productos`: el stock, el precio o
// la visibilidad de un producto cambian la disponibilidad y el ahorro del combo.
// Ver claude/web/combos.md

export type TarjetaCombo = {
  id: string;
  slug: string;
  nombre: string;
  precio: number;
  /** Suma del precio de lista más bajo de cada producto × cantidad (la base del ahorro). */
  precioItems: number;
  disponible: boolean;
  productos: number;
  imagen: { path: string; alt: string } | null;
};

export async function buscarCombos(destacados = false, limite = 24): Promise<{ combos: TarjetaCombo[]; total: number }> {
  "use cache";
  cacheLife("max");
  cacheTag(TAGS.combos, TAGS.productos);

  const { data, error } = await supabasePublico().rpc("buscar_combos", { p_destacados: destacados, p_limite: limite });
  if (error) throw new Error(`buscar_combos: ${error.message}`);
  return {
    combos: data.map((c) => ({
      id: c.id,
      slug: c.slug,
      nombre: c.nombre,
      precio: Number(c.precio),
      precioItems: Number(c.precio_items),
      disponible: c.disponible,
      productos: c.productos,
      imagen: c.imagen_path ? { path: c.imagen_path, alt: c.imagen_alt ?? "" } : null,
    })),
    total: Number(data[0]?.total ?? 0),
  };
}

export type ItemCombo = {
  productoId: string;
  slug: string;
  nombre: string;
  cantidad: number;
  imagen: { path: string; alt: string } | null;
  grupos: GrupoVariante[];
  /** Variantes activas; el precio de cada una es el de LISTA (dentro del combo no hay promos). */
  variantes: VarianteFicha[];
};

export type FichaCombo = {
  id: string;
  slug: string;
  nombre: string;
  descripcion: unknown;
  descripcionTexto: string;
  precio: number;
  precioItems: number;
  imagenes: { id: string; path: string; alt: string; ancho: number | null; alto: number | null }[];
  /** En el orden de combo_items: es el orden en que el carrito manda las variantes. */
  items: ItemCombo[];
  disponible: boolean;
};

export async function obtenerCombo(slug: string): Promise<FichaCombo | null> {
  "use cache";
  cacheLife("max");
  cacheTag(TAGS.combo(slug), TAGS.combos, TAGS.productos);

  const { data: c, error } = await supabasePublico()
    .from("combos")
    .select(
      `id, slug, nombre, descripcion, descripcion_texto, precio,
       imagenes:combo_imagenes(id, path, alt, orden, ancho, alto),
       items:combo_items(id, cantidad, orden, producto:productos(slug))`,
    )
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw new Error(`combo ${slug}: ${error.message}`);
  if (!c) return null;

  const ordenados = [...c.items].sort((a, b) => a.orden - b.orden || a.id.localeCompare(b.id));
  // Las fichas de producto ya están cacheadas: el combo las reusa para grupos y variantes.
  const fichas = await Promise.all(ordenados.map((i) => (i.producto ? obtenerProducto(i.producto.slug) : null)));

  const items: ItemCombo[] = [];
  let completo = true;
  for (const [n, i] of ordenados.entries()) {
    const f = fichas[n];
    // Producto despublicado (RLS lo oculta): el combo no se puede comprar.
    if (!f) {
      completo = false;
      continue;
    }
    items.push({
      productoId: f.id,
      slug: f.slug,
      nombre: f.nombre,
      cantidad: i.cantidad,
      imagen: f.imagenes[0] ? { path: f.imagenes[0].path, alt: f.imagenes[0].alt } : null,
      grupos: f.gruposVariante,
      variantes: f.variantes.map((v) => ({ ...v, precio: v.precioLista })),
    });
  }

  return {
    id: c.id,
    slug: c.slug,
    nombre: c.nombre,
    descripcion: c.descripcion,
    descripcionTexto: c.descripcion_texto,
    precio: Math.round(Number(c.precio)),
    // Igual que buscar_combos: el precio de lista más bajo de cada producto.
    precioItems: items.reduce((s, i) => s + Math.min(...i.variantes.map((v) => v.precioLista)) * i.cantidad, 0),
    imagenes: [...c.imagenes].sort((a, b) => a.orden - b.orden),
    items,
    disponible: completo && items.length > 0 && items.every((i) => i.variantes.some((v) => v.stock >= i.cantidad)),
  };
}

export async function obtenerSlugsCombos(): Promise<string[]> {
  "use cache";
  cacheLife("max");
  cacheTag(TAGS.combos);
  const { data } = await supabasePublico().from("combos").select("slug");
  return (data ?? []).map((c) => c.slug);
}
