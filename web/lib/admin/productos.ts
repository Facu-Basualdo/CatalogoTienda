import "server-only";

import type { supabaseServidor } from "@/lib/supabase/servidor";

type Cliente = Awaited<ReturnType<typeof supabaseServidor>>;

export type EtiquetaAdmin = { id: string; valor: string; slug: string; orden: number; colorHex: string | null };
export type GrupoAdmin = {
  id: string;
  slug: string;
  nombre: string;
  orden: number;
  esVariante: boolean;
  esMarca: boolean;
  etiquetas: EtiquetaAdmin[];
};

export type VarianteAdmin = {
  id: string;
  clave: string;
  sku: string | null;
  precio: number | null;
  stock: number;
  activa: boolean;
  etiquetas: string[];
};

export type ProductoAdmin = {
  id: string;
  slug: string;
  nombre: string;
  precio: number;
  precioAnterior: number | null;
  categoriaId: string | null;
  destacado: boolean;
  publicado: boolean;
  descripcion: unknown;
  etiquetas: string[];
  imagenes: { id: string; path: string; alt: string; orden: number }[];
  variantes: VarianteAdmin[];
};

// Lecturas del panel: SIN caché (cliente con sesión, datos siempre frescos).
export async function obtenerProductoAdmin(supabase: Cliente, id: string): Promise<ProductoAdmin | null> {
  const { data: p, error } = await supabase
    .from("productos")
    .select(
      `id, slug, nombre, precio, precio_anterior, categoria_id, destacado, publicado, descripcion,
       etiquetas:producto_etiquetas(etiqueta_id),
       imagenes:producto_imagenes(id, path, alt, orden),
       variantes:producto_variantes(id, clave, sku, precio, stock, activa, orden, etiquetas:variante_etiquetas(etiqueta_id))`,
    )
    .eq("id", id)
    .maybeSingle();
  if (error || !p) return null;

  return {
    id: p.id,
    slug: p.slug,
    nombre: p.nombre,
    precio: Number(p.precio),
    precioAnterior: p.precio_anterior === null ? null : Number(p.precio_anterior),
    categoriaId: p.categoria_id,
    destacado: p.destacado,
    publicado: p.publicado,
    descripcion: p.descripcion,
    etiquetas: p.etiquetas.map((e) => e.etiqueta_id),
    imagenes: [...p.imagenes].sort((a, b) => a.orden - b.orden),
    variantes: [...p.variantes]
      .sort((a, b) => a.orden - b.orden)
      .map((v) => ({
        id: v.id,
        clave: v.clave,
        sku: v.sku,
        precio: v.precio === null ? null : Number(v.precio),
        stock: v.stock,
        activa: v.activa,
        etiquetas: v.etiquetas.map((e) => e.etiqueta_id),
      })),
  };
}

export async function obtenerCatalogosAdmin(supabase: Cliente) {
  const [categorias, grupos, vinculos, conPlantilla, deCadaPlantilla] = await Promise.all([
    supabase.from("categorias").select("id, nombre, padre_id, orden").order("orden"),
    supabase
      .from("grupos_etiqueta")
      .select("id, slug, nombre, orden, es_variante, es_marca, etiquetas(id, valor, slug, orden, color_hex)")
      .order("orden"),
    supabase.from("categoria_grupos").select("categoria_id, grupo_id"),
    supabase.from("categoria_plantillas").select("categoria_id, plantilla_id"),
    supabase.from("plantilla_grupos").select("plantilla_id, grupo_id"),
  ]);

  const cats = categorias.data ?? [];
  // Categorías como lista plana con la jerarquía en el nombre ("Ropa › Remeras").
  const raices = cats.filter((c) => !c.padre_id);
  const listaCategorias = raices.flatMap((r) => [
    { id: r.id, nombre: r.nombre },
    ...cats.filter((c) => c.padre_id === r.id).map((c) => ({ id: c.id, nombre: `${r.nombre} › ${c.nombre}` })),
  ]);

  const listaGrupos: GrupoAdmin[] = (grupos.data ?? []).map((g) => ({
    id: g.id,
    slug: g.slug,
    nombre: g.nombre,
    orden: g.orden,
    esVariante: g.es_variante,
    esMarca: g.es_marca,
    etiquetas: [...g.etiquetas]
      .sort((a, b) => a.orden - b.orden || a.valor.localeCompare(b.valor))
      .map((e) => ({ id: e.id, valor: e.valor, slug: e.slug ?? "", orden: e.orden, colorHex: e.color_hex })),
  }));

  // Grupos que pide cada categoría: los sueltos, los de sus plantillas y los mismos de su
  // categoría padre. Ver claude/web/dashboard.md#características-por-categoría
  const gruposDePlantilla = new Map<string, string[]>();
  for (const v of deCadaPlantilla.data ?? []) gruposDePlantilla.set(v.plantilla_id, [...(gruposDePlantilla.get(v.plantilla_id) ?? []), v.grupo_id]);
  const propios = new Map<string, string[]>();
  const sumar = (categoriaId: string, ids: string[]) => propios.set(categoriaId, [...(propios.get(categoriaId) ?? []), ...ids]);
  for (const v of vinculos.data ?? []) sumar(v.categoria_id, [v.grupo_id]);
  for (const v of conPlantilla.data ?? []) sumar(v.categoria_id, gruposDePlantilla.get(v.plantilla_id) ?? []);
  const gruposPorCategoria: Record<string, string[]> = {};
  for (const c of cats) {
    gruposPorCategoria[c.id] = [...new Set([...(c.padre_id ? (propios.get(c.padre_id) ?? []) : []), ...(propios.get(c.id) ?? [])])];
  }

  return { categorias: listaCategorias, grupos: listaGrupos, gruposPorCategoria };
}
