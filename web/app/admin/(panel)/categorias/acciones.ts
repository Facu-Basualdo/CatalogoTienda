"use server";

import { updateTag } from "next/cache";
import { z } from "zod";
import { adminParaAccion, fallo, ok, type Resultado } from "@/lib/admin/accion";
import { TAGS } from "@/lib/catalogo/tags";
import { SLUG_VALIDO } from "@/lib/slug";

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
  slug: z.string().regex(SLUG_VALIDO, "El slug sólo admite minúsculas, números y guiones."),
  padreId: uuid.nullable(),
});
export type DatosCategoria = z.input<typeof esquema>;

function error(e: { code?: string; message?: string }, porDefecto: string) {
  if (e.code === "23505") return "Ese slug ya lo usa otra categoría.";
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
  const fila = { nombre: r.data.nombre, slug: r.data.slug, padre_id: r.data.padreId };

  if (id) {
    const { error: e } = await supabase.from("categorias").update(fila).eq("id", id);
    if (e) return fallo(error(e, "No se pudo guardar la categoría."));
  } else {
    // Al final de sus hermanas.
    let consulta = supabase.from("categorias").select("orden").order("orden", { ascending: false }).limit(1);
    consulta = r.data.padreId ? consulta.eq("padre_id", r.data.padreId) : consulta.is("padre_id", null);
    const { data: ultima } = await consulta.maybeSingle();
    const { error: e } = await supabase.from("categorias").insert({ ...fila, orden: (ultima?.orden ?? -1) + 1 });
    if (e) return fallo(error(e, "No se pudo crear la categoría."));
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
