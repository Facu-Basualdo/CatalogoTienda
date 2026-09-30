import { cacheLife, cacheTag } from "next/cache";
import { supabasePublico } from "@/lib/supabase/publico";
import { POR_PAGINA, type Filtros } from "./filtros";
import { TAGS } from "./tags";

// Lecturas del catálogo público: siempre supabasePublico() dentro de 'use cache'.
// Ninguna página lee Supabase directo. Ver claude/web/cache-y-revalidacion.md

export type TarjetaProducto = {
  id: string;
  slug: string;
  nombre: string;
  precioDesde: number;
  precioVaria: boolean;
  precioAnterior: number | null;
  disponible: boolean;
  imagen: { path: string; alt: string; ancho: number | null; alto: number | null } | null;
};

export type ResultadoBusqueda = { productos: TarjetaProducto[]; total: number; paginas: number };

type FilaBusqueda = {
  id: string;
  slug: string;
  nombre: string;
  precio_desde: number;
  precio_varia: boolean;
  precio_anterior: number | null;
  disponible: boolean;
  imagen_path: string | null;
  imagen_alt: string | null;
  imagen_ancho: number | null;
  imagen_alto: number | null;
  total: number;
};

function aTarjeta(f: FilaBusqueda): TarjetaProducto {
  return {
    id: f.id,
    slug: f.slug,
    nombre: f.nombre,
    precioDesde: Number(f.precio_desde),
    precioVaria: f.precio_varia,
    precioAnterior: f.precio_anterior === null ? null : Number(f.precio_anterior),
    disponible: f.disponible,
    imagen: f.imagen_path
      ? { path: f.imagen_path, alt: f.imagen_alt ?? f.nombre, ancho: f.imagen_ancho, alto: f.imagen_alto }
      : null,
  };
}

export async function buscarProductos(filtros: Filtros): Promise<ResultadoBusqueda> {
  "use cache";
  cacheLife("max");
  cacheTag(TAGS.productos);

  const { data, error } = await supabasePublico().rpc("buscar_productos", {
    p_filtros: filtros.etiquetas,
    p_categoria: filtros.cat ?? undefined,
    p_q: filtros.q ?? undefined,
    p_orden: filtros.orden,
    p_limite: POR_PAGINA,
    p_offset: (filtros.pagina - 1) * POR_PAGINA,
  });
  if (error) throw new Error(`buscar_productos: ${error.message}`);

  const filas = (data ?? []) as FilaBusqueda[];
  const total = filas[0] ? Number(filas[0].total) : 0;
  return { productos: filas.map(aTarjeta), total, paginas: Math.ceil(total / POR_PAGINA) };
}

export async function obtenerDestacados(limite = 8): Promise<TarjetaProducto[]> {
  "use cache";
  cacheLife("max");
  cacheTag(TAGS.productos);

  const { data, error } = await supabasePublico().rpc("buscar_productos", {
    p_destacados: true,
    p_orden: "recientes",
    p_limite: limite,
  });
  if (error) throw new Error(`destacados: ${error.message}`);
  return ((data ?? []) as FilaBusqueda[]).map(aTarjeta);
}

export type OpcionFaceta = {
  slug: string;
  valor: string;
  colorHex: string | null;
  cantidad: number;
  seleccionada: boolean;
};
export type Faceta = { slug: string; nombre: string; esVariante: boolean; opciones: OpcionFaceta[] };

export async function obtenerFacetas(filtros: Filtros): Promise<Faceta[]> {
  "use cache";
  cacheLife("max");
  // Publicar/despublicar cambia los conteos: por eso también lleva `productos`.
  cacheTag(TAGS.facetas, TAGS.productos);

  const { data, error } = await supabasePublico().rpc("facetas_productos", {
    p_filtros: filtros.etiquetas,
    p_categoria: filtros.cat ?? undefined,
    p_q: filtros.q ?? undefined,
  });
  if (error) throw new Error(`facetas_productos: ${error.message}`);

  const porGrupo = new Map<string, Faceta>();
  for (const f of data ?? []) {
    let faceta = porGrupo.get(f.grupo_slug);
    if (!faceta) {
      faceta = { slug: f.grupo_slug, nombre: f.grupo_nombre, esVariante: f.es_variante, opciones: [] };
      porGrupo.set(f.grupo_slug, faceta);
    }
    faceta.opciones.push({
      slug: f.etiqueta_slug,
      valor: f.etiqueta_valor,
      colorHex: f.color_hex,
      cantidad: Number(f.cantidad),
      seleccionada: f.seleccionada,
    });
  }
  return [...porGrupo.values()];
}

export type Categoria = { id: string; slug: string; nombre: string; hijas: { slug: string; nombre: string }[] };

export async function obtenerCategorias(): Promise<Categoria[]> {
  "use cache";
  cacheLife("max");
  cacheTag(TAGS.categorias);

  const { data, error } = await supabasePublico()
    .from("categorias")
    .select("id, slug, nombre, padre_id, orden")
    .order("orden")
    .order("nombre");
  if (error) throw new Error(`categorias: ${error.message}`);

  const raices = data.filter((c) => !c.padre_id);
  return raices.map((r) => ({
    id: r.id,
    slug: r.slug,
    nombre: r.nombre,
    hijas: data.filter((c) => c.padre_id === r.id).map((c) => ({ slug: c.slug, nombre: c.nombre })),
  }));
}

export type Banner = {
  id: string;
  titulo: string | null;
  subtitulo: string | null;
  textoBoton: string | null;
  enlace: string | null;
  imagenPath: string;
  imagenMobilePath: string | null;
};

export async function obtenerBanners(): Promise<Banner[]> {
  "use cache";
  // La ventana desde/hasta la resuelve la base con now(); nadie muta nada cuando un
  // banner vence, así que además de tag hace falta revalidación por tiempo.
  cacheLife("minutes");
  cacheTag(TAGS.banners);

  const { data, error } = await supabasePublico().rpc("banners_vigentes");
  if (error) throw new Error(`banners_vigentes: ${error.message}`);
  return (data ?? []).map((b) => ({
    id: b.id,
    titulo: b.titulo,
    subtitulo: b.subtitulo,
    textoBoton: b.texto_boton,
    enlace: b.enlace,
    imagenPath: b.imagen_path,
    imagenMobilePath: b.imagen_mobile_path,
  }));
}

// ---------------------------------------------------------------- ficha

type EtiquetaFicha = { id: string; slug: string; valor: string; orden: number; colorHex: string | null };
export type GrupoVariante = { slug: string; nombre: string; opciones: EtiquetaFicha[] };
export type VarianteFicha = {
  id: string;
  sku: string | null;
  precio: number;
  stock: number;
  /** grupo-slug → etiqueta-slug */
  opciones: Record<string, string>;
  etiquetas: string;
};
export type Caracteristica = { grupo: string; grupoSlug: string; valores: { slug: string; valor: string }[] };

export type FichaProducto = {
  id: string;
  slug: string;
  nombre: string;
  descripcion: unknown;
  descripcionTexto: string;
  precio: number;
  precioAnterior: number | null;
  categoria: { slug: string; nombre: string; padre: { slug: string; nombre: string } | null } | null;
  imagenes: { id: string; path: string; alt: string; ancho: number | null; alto: number | null }[];
  caracteristicas: Caracteristica[];
  gruposVariante: GrupoVariante[];
  variantes: VarianteFicha[];
};

export async function obtenerProducto(slug: string): Promise<FichaProducto | null> {
  "use cache";
  cacheLife("max");
  // `etiquetas`: renombrar una etiqueta o grupo cambia la ficha de muchos productos.
  cacheTag(TAGS.producto(slug), TAGS.etiquetas);

  const { data: p, error } = await supabasePublico()
    .from("productos")
    .select(
      `id, slug, nombre, descripcion, descripcion_texto, precio, precio_anterior,
       categoria:categorias(slug, nombre, padre:padre_id(slug, nombre)),
       imagenes:producto_imagenes(id, path, alt, orden, ancho, alto),
       etiquetas:producto_etiquetas(etiqueta:etiquetas(slug, valor, orden, grupo:grupos_etiqueta(slug, nombre, orden, visible_en_ficha))),
       variantes:producto_variantes(id, sku, precio, stock, orden,
         etiquetas:variante_etiquetas(etiqueta:etiquetas(id, slug, valor, orden, color_hex, grupo:grupos_etiqueta(slug, nombre, orden))))`,
    )
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw new Error(`producto ${slug}: ${error.message}`);
  if (!p) return null;

  // Características: grupos no-variante visibles en ficha.
  const porGrupo = new Map<string, Caracteristica & { orden: number }>();
  for (const { etiqueta: e } of p.etiquetas) {
    if (!e?.grupo?.visible_en_ficha) continue;
    const g = porGrupo.get(e.grupo.slug) ?? { grupo: e.grupo.nombre, grupoSlug: e.grupo.slug, orden: e.grupo.orden, valores: [] };
    g.valores.push({ slug: e.slug ?? "", valor: e.valor });
    porGrupo.set(e.grupo.slug, g);
  }

  // Grupos de variante: el selector de la ficha.
  const grupos = new Map<string, GrupoVariante & { orden: number }>();
  const variantes = [...p.variantes]
    .sort((a, b) => a.orden - b.orden)
    .map((v) => {
      const opciones: Record<string, string> = {};
      const nombres: string[] = [];
      for (const { etiqueta: e } of [...v.etiquetas].sort((a, b) => (a.etiqueta?.grupo?.orden ?? 0) - (b.etiqueta?.grupo?.orden ?? 0))) {
        if (!e?.grupo) continue;
        opciones[e.grupo.slug] = e.slug ?? "";
        nombres.push(e.valor);
        const g = grupos.get(e.grupo.slug) ?? { slug: e.grupo.slug, nombre: e.grupo.nombre, orden: e.grupo.orden, opciones: [] };
        if (!g.opciones.some((o) => o.id === e.id)) {
          g.opciones.push({ id: e.id, slug: e.slug ?? "", valor: e.valor, orden: e.orden, colorHex: e.color_hex });
        }
        grupos.set(e.grupo.slug, g);
      }
      return {
        id: v.id,
        sku: v.sku,
        precio: Number(v.precio ?? p.precio),
        stock: v.stock,
        opciones,
        etiquetas: nombres.join(" / "),
      };
    });

  const categoria = p.categoria
    ? {
        slug: p.categoria.slug,
        nombre: p.categoria.nombre,
        padre: p.categoria.padre ? { slug: p.categoria.padre.slug, nombre: p.categoria.padre.nombre } : null,
      }
    : null;

  return {
    id: p.id,
    slug: p.slug,
    nombre: p.nombre,
    descripcion: p.descripcion,
    descripcionTexto: p.descripcion_texto,
    precio: Number(p.precio),
    precioAnterior: p.precio_anterior === null ? null : Number(p.precio_anterior),
    categoria,
    imagenes: [...p.imagenes]
      .sort((a, b) => a.orden - b.orden)
      .map(({ id, path, alt, ancho, alto }) => ({ id, path, alt: alt || p.nombre, ancho, alto })),
    caracteristicas: [...porGrupo.values()].sort((a, b) => a.orden - b.orden),
    gruposVariante: [...grupos.values()]
      .sort((a, b) => a.orden - b.orden)
      .map(({ slug, nombre, opciones }) => ({ slug, nombre, opciones: opciones.sort((a, b) => a.orden - b.orden) })),
    variantes,
  };
}

export async function obtenerSlugsPublicados(): Promise<string[]> {
  "use cache";
  cacheLife("max");
  cacheTag(TAGS.productos);

  const { data, error } = await supabasePublico().from("productos").select("slug");
  if (error) throw new Error(`slugs: ${error.message}`);
  return data.map((p) => p.slug);
}
