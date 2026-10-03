"use server";

import { updateTag } from "next/cache";
import { z } from "zod";
import { adminParaAccion, fallo, ok, type Resultado } from "@/lib/admin/accion";
import { TAGS } from "@/lib/catalogo/tags";
import { slugUnico } from "@/lib/admin/slug-unico";

// Server Actions de categorías. Patrón en claude/web/dashboard.md#patrón-de-server-action
// El nombre sale en el menú, la home, los filtros y las migas de cada ficha; el slug es
// el `?cat=` del catálogo: toda escritura invalida `categorias`, `productos` y `facetas`.

function invalidar() {
  updateTag(TAGS.categorias);
  updateTag(TAGS.productos);
  updateTag(TAGS.facetas);
}

const uuid = z.string().uuid();

const esquema = z.object({
  nombre: z.string().trim().min(1, "Poné un nombre.").max(40, "Máximo 40 caracteres."),
  padreId: uuid.nullable(),
  /** Grupos de etiquetas que pide la categoría (los del padre se heredan aparte). */
  grupoIds: z.array(uuid).max(50),
  plantillaIds: z.array(uuid).max(20),
});
export type DatosCategoria = z.input<typeof esquema>;

function error(e: { code?: string; message?: string }, porDefecto: string) {
  if (e.code === "P0001" && e.message) return e.message; // dos niveles (trigger)
  if (e.code === "23503") return "Tiene subcategorías: borralas o movelas primero.";
  return porDefecto;
}

export async function guardarCategoria(id: string | null, datos: DatosCategoria): Promise<Resultado> {
  const { supabase, error: e0 } = await adminParaAccion();
  if (!supabase) return fallo(e0);
  if (id !== null && !uuid.safeParse(id).success) return fallo("Categoría inválida.");
  const r = esquema.safeParse(datos);
  if (!r.success) return fallo(r.error.issues[0]?.message ?? "Datos inválidos.");
  if (id && r.data.padreId === id) return fallo("Una categoría no puede estar dentro de sí misma.");
  // El slug (el ?cat= de la URL) se arma con el nombre al crearla y no cambia después:
  // renombrar no rompe los links ya compartidos.
  const fila = { nombre: r.data.nombre, padre_id: r.data.padreId };

  let categoriaId = id;
  if (id) {
    const { error: e } = await supabase.from("categorias").update(fila).eq("id", id);
    if (e) return fallo(error(e, "No se pudo guardar la categoría."));
  } else {
    // Al final de sus hermanas.
    let consulta = supabase.from("categorias").select("orden").order("orden", { ascending: false }).limit(1);
    consulta = r.data.padreId ? consulta.eq("padre_id", r.data.padreId) : consulta.is("padre_id", null);
    const { data: ultima } = await consulta.maybeSingle();
    const slug = await slugUnico(supabase, "categorias", r.data.nombre, { porDefecto: "categoria" });
    const { data: nueva, error: e } = await supabase
      .from("categorias")
      .insert({ ...fila, slug, orden: (ultima?.orden ?? -1) + 1 })
      .select("id")
      .single();
    if (e) return fallo(error(e, "No se pudo crear la categoría."));
    categoriaId = nueva.id;
  }

  // Grupos: agregar antes de quitar (si algo falla a mitad, sobra un grupo en vez de faltar).
  // Sólo afectan qué campos muestra el panel al cargar un producto: no invalidan la tienda.
  const { data: actuales } = await supabase.from("categoria_grupos").select("grupo_id").eq("categoria_id", categoriaId!);
  const antes = new Set((actuales ?? []).map((g) => g.grupo_id));
  const nuevos = r.data.grupoIds.filter((g) => !antes.has(g));
  const quitar = [...antes].filter((g) => !r.data.grupoIds.includes(g));
  if (nuevos.length) {
    const { error: e } = await supabase.from("categoria_grupos").insert(nuevos.map((grupo_id) => ({ categoria_id: categoriaId!, grupo_id })));
    if (e) return fallo("Se guardó la categoría pero no sus características.");
  }
  if (quitar.length) {
    await supabase.from("categoria_grupos").delete().eq("categoria_id", categoriaId!).in("grupo_id", quitar);
  }

  // Plantillas: igual, agregar antes de quitar.
  const { data: conPlantilla } = await supabase.from("categoria_plantillas").select("plantilla_id").eq("categoria_id", categoriaId!);
  const plantillasAntes = new Set((conPlantilla ?? []).map((p) => p.plantilla_id));
  const plantillasNuevas = r.data.plantillaIds.filter((p) => !plantillasAntes.has(p));
  const plantillasQuitar = [...plantillasAntes].filter((p) => !r.data.plantillaIds.includes(p));
  if (plantillasNuevas.length) {
    const { error: e } = await supabase
      .from("categoria_plantillas")
      .insert(plantillasNuevas.map((plantilla_id) => ({ categoria_id: categoriaId!, plantilla_id })));
    if (e) return fallo("Se guardó la categoría pero no sus plantillas.");
  }
  if (plantillasQuitar.length) {
    await supabase.from("categoria_plantillas").delete().eq("categoria_id", categoriaId!).in("plantilla_id", plantillasQuitar);
  }
  invalidar();
  return ok(undefined);
}

export async function borrarCategoria(id: string): Promise<Resultado> {
  const { supabase, error: e0 } = await adminParaAccion();
  if (!supabase) return fallo(e0);
  if (!uuid.safeParse(id).success) return fallo("Categoría inválida.");
  // productos.categoria_id es on delete set null: sus productos quedan sin categoría.
  // padre_id es restrict: con subcategorías, falla (23503).
  const { error: e } = await supabase.from("categorias").delete().eq("id", id);
  if (e) return fallo(error(e, "No se pudo borrar la categoría."));
  invalidar();
  return ok(undefined);
}

/** `ids`: las hermanas (mismo padre) en el orden nuevo. */
export async function reordenarCategorias(ids: string[]): Promise<Resultado> {
  const { supabase, error: e0 } = await adminParaAccion();
  if (!supabase) return fallo(e0);
  if (!z.array(uuid).safeParse(ids).success) return fallo("Orden inválido.");
  const { error: e } = await supabase.rpc("reordenar_categorias", { p_ids: ids });
  if (e) return fallo("No se pudo reordenar.");
  invalidar();
  return ok(undefined);
}
