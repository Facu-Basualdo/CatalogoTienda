import "server-only";

import type { supabaseServidor } from "@/lib/supabase/servidor";

type Cliente = Awaited<ReturnType<typeof supabaseServidor>>;

export type GrupoListado = {
  id: string;
  nombre: string;
  slug: string;
  icono: string | null;
  esVariante: boolean;
  esMarca: boolean;
  visibleEnFiltros: boolean;
  visibleEnFicha: boolean;
  conColor: boolean;
  etiquetas: number;
};

export type EtiquetaConUso = {
  id: string;
  valor: string;
  slug: string;
  colorHex: string | null;
  /** Productos (producto_etiquetas) o variantes (variante_etiquetas) que la usan. */
  usos: number;
};

/** Categorías con su jerarquía en el nombre ("Ropa › Remeras"), para elegir dónde se usa un grupo. */
export async function categoriasParaGrupos(supabase: Cliente) {
  const { data } = await supabase.from("categorias").select("id, nombre, padre_id, orden").order("orden");
  const cats = data ?? [];
  return cats
    .filter((c) => !c.padre_id)
    .flatMap((r) => [
      { id: r.id, nombre: r.nombre },
      ...cats.filter((c) => c.padre_id === r.id).map((c) => ({ id: c.id, nombre: `${r.nombre} › ${c.nombre}` })),
    ]);
}

export async function listarPlantillas(supabase: Cliente) {
  const { data } = await supabase
    .from("plantillas")
    .select("id, nombre, plantilla_grupos(grupo_id), categoria_plantillas(categoria_id)")
    .order("nombre");
  return (data ?? []).map((p) => ({
    id: p.id,
    nombre: p.nombre,
    grupoIds: p.plantilla_grupos.map((g) => g.grupo_id),
    categoriaIds: p.categoria_plantillas.map((c) => c.categoria_id),
  }));
}

export async function listarGrupos(supabase: Cliente): Promise<GrupoListado[]> {
  const { data } = await supabase
    .from("grupos_etiqueta")
    .select("id, nombre, slug, icono, orden, es_variante, es_marca, visible_en_filtros, visible_en_ficha, con_color, etiquetas(count)")
    .order("orden")
    .order("nombre");
  return (data ?? []).map((g) => ({
    id: g.id,
    nombre: g.nombre,
    slug: g.slug,
    icono: g.icono,
    esVariante: g.es_variante,
    esMarca: g.es_marca,
    visibleEnFiltros: g.visible_en_filtros,
    visibleEnFicha: g.visible_en_ficha,
    conColor: g.con_color,
    etiquetas: g.etiquetas[0]?.count ?? 0,
  }));
}

export async function obtenerGrupo(supabase: Cliente, id: string) {
  const { data: g } = await supabase
    .from("grupos_etiqueta")
    .select(
      `id, nombre, slug, icono, es_variante, es_marca, visible_en_filtros, visible_en_ficha, con_color,
       etiquetas(id, valor, slug, orden, color_hex, producto_etiquetas(count), variante_etiquetas(count)),
       categoria_grupos(categoria_id)`,
    )
    .eq("id", id)
    .maybeSingle();
  if (!g) return null;
  const etiquetas: EtiquetaConUso[] = [...g.etiquetas]
    .sort((a, b) => a.orden - b.orden || a.valor.localeCompare(b.valor))
    .map((e) => ({
      id: e.id,
      valor: e.valor,
      slug: e.slug ?? "",
      colorHex: e.color_hex,
      usos: (e.producto_etiquetas[0]?.count ?? 0) + (e.variante_etiquetas[0]?.count ?? 0),
    }));
  return {
    grupo: {
      id: g.id,
      nombre: g.nombre,
      slug: g.slug,
      icono: g.icono,
      esVariante: g.es_variante,
      esMarca: g.es_marca,
      visibleEnFiltros: g.visible_en_filtros,
      visibleEnFicha: g.visible_en_ficha,
      conColor: g.con_color,
      categoriaIds: g.categoria_grupos.map((c) => c.categoria_id),
    },
    etiquetas,
    enUso: etiquetas.some((e) => e.usos > 0),
  };
}
