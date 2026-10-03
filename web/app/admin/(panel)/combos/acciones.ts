"use server";

import { updateTag } from "next/cache";
import { z } from "zod";
import { adminParaAccion, fallo, ok, type Resultado } from "@/lib/admin/accion";
import { procesarDescripcion } from "@/lib/admin/descripcion";
import { TAGS } from "@/lib/catalogo/tags";
import { slugUnico } from "@/lib/admin/slug-unico";
import { BUCKET } from "@/lib/supabase/storage";

// Server Actions de combos. Patrón en claude/web/dashboard.md#patrón-de-server-action
// Cada escritura invalida `combos` y `combo:{slug}` (viejo y nuevo). Ver claude/web/combos.md

function invalidar(...slugs: (string | null | undefined)[]) {
  updateTag(TAGS.combos);
  for (const s of new Set(slugs)) if (s) updateTag(TAGS.combo(s));
}

const uuid = z.string().uuid();

async function slugDe(supabase: NonNullable<Awaited<ReturnType<typeof adminParaAccion>>["supabase"]>, id: string) {
  const { data } = await supabase.from("combos").select("slug").eq("id", id).maybeSingle();
  return data?.slug ?? null;
}

// ---------------------------------------------------------------- alta / baja

export async function crearCombo(): Promise<Resultado<{ id: string }>> {
  const { supabase, error } = await adminParaAccion();
  if (!supabase) return fallo(error);
  // Borrador oculto: las imágenes necesitan el id para su path.
  const { data, error: e } = await supabase
    .from("combos")
    .insert({ nombre: "Combo nuevo", slug: `combo-borrador-${crypto.randomUUID().slice(0, 8)}`, publicado: false })
    .select("id")
    .single();
  if (e) return fallo("No se pudo crear el combo.");
  return ok({ id: data.id });
}

export async function borrarCombo(id: string): Promise<Resultado> {
  const { supabase, error } = await adminParaAccion();
  if (!supabase) return fallo(error);
  if (!uuid.safeParse(id).success) return fallo("Combo inválido.");
  const slug = await slugDe(supabase, id);
  if (!slug) return fallo("El combo no existe.");

  // Storage primero: borrar la fila no borra los archivos.
  const { data: archivos } = await supabase.storage.from(BUCKET).list(`combos/${id}`, { limit: 1000 });
  if (archivos?.length) {
    const { error: e } = await supabase.storage.from(BUCKET).remove(archivos.map((a) => `combos/${id}/${a.name}`));
    if (e) return fallo("No se pudieron borrar las imágenes; el combo no se borró.");
  }
  // Los pedidos ya hechos conservan su fila (combo_id queda en null).
  const { error: e } = await supabase.from("combos").delete().eq("id", id);
  if (e) return fallo("No se pudo borrar el combo.");
  invalidar(slug);
  return ok(undefined);
}

// ---------------------------------------------------------------- datos

const esquemaDatos = z.object({
  nombre: z.string().trim().min(1, "Poné un nombre.").max(120, "Máximo 120 caracteres."),
  precio: z.number().int().positive("El precio tiene que ser mayor a 0."),
  publicado: z.boolean(),
  destacado: z.boolean(),
});
export type DatosCombo = z.input<typeof esquemaDatos>;

export async function guardarDatosCombo(id: string, entrada: DatosCombo): Promise<Resultado<{ slug: string }>> {
  const { supabase, error } = await adminParaAccion();
  if (!supabase) return fallo(error);
  const r = esquemaDatos.safeParse(entrada);
  if (!r.success) return fallo(r.error.issues[0]?.message ?? "Datos inválidos.");
  const d = r.data;

  const { data: actual } = await supabase.from("combos").select("slug, publicado").eq("id", id).maybeSingle();
  if (!actual) return fallo("El combo no existe.");
  const antes = actual.slug;
  // Igual que productos: sigue al nombre mientras está oculto y queda fijo al publicarse.
  const slug = actual.publicado ? actual.slug : await slugUnico(supabase, "combos", d.nombre, { excluirId: id, porDefecto: "combo" });
  if (d.publicado) {
    const { count } = await supabase.from("combo_items").select("id", { count: "exact", head: true }).eq("combo_id", id);
    if (!count) return fallo("Agregá los productos del combo antes de publicarlo.");
  }

  const { error: e } = await supabase
    .from("combos")
    .update({ nombre: d.nombre, slug, precio: d.precio, publicado: d.publicado, destacado: d.destacado })
    .eq("id", id);
  if (e) return fallo("No se pudieron guardar los datos.");
  invalidar(antes, slug);
  return ok({ slug });
}

export async function cambiarVisibilidadCombo(id: string, publicado: boolean): Promise<Resultado> {
  const { supabase, error } = await adminParaAccion();
  if (!supabase) return fallo(error);
  if (publicado) {
    const { count } = await supabase.from("combo_items").select("id", { count: "exact", head: true }).eq("combo_id", id);
    if (!count) return fallo("Agregá los productos del combo antes de publicarlo.");
  }
  const { data, error: e } = await supabase.from("combos").update({ publicado }).eq("id", id).select("slug").maybeSingle();
  if (e || !data) return fallo("No se pudo cambiar la visibilidad.");
  invalidar(data.slug);
  return ok(undefined);
}

// ---------------------------------------------------------------- productos del combo

const esquemaItems = z
  .array(z.object({ productoId: uuid, cantidad: z.number().int().min(1).max(10) }))
  .min(1, "Agregá al menos un producto.")
  .max(10, "Hasta 10 productos distintos.");

/** Reemplaza los ítems con guardar_combo_items (una transacción). El orden es el de la lista. */
export async function guardarItemsCombo(id: string, items: { productoId: string; cantidad: number }[]): Promise<Resultado> {
  const { supabase, error } = await adminParaAccion();
  if (!supabase) return fallo(error);
  const r = esquemaItems.safeParse(items);
  if (!r.success) return fallo(r.error.issues[0]?.message ?? "Productos inválidos.");
  if (new Set(r.data.map((i) => i.productoId)).size !== r.data.length) return fallo("Hay un producto repetido: subí la cantidad.");

  const { error: e } = await supabase.rpc("guardar_combo_items", {
    p_combo_id: id,
    p_items: r.data.map((i) => ({ producto_id: i.productoId, cantidad: i.cantidad })),
  });
  // Los mensajes de la función son para el admin ("Un combo lleva al menos 2 unidades").
  if (e) return fallo(e.message || "No se pudieron guardar los productos.");
  invalidar(await slugDe(supabase, id));
  return ok(undefined);
}

// ---------------------------------------------------------------- imágenes

export async function registrarImagenCombo(
  comboId: string,
  imagen: { path: string; ancho: number; alto: number },
): Promise<Resultado<{ id: string }>> {
  const { supabase, error } = await adminParaAccion();
  if (!supabase) return fallo(error);
  if (!imagen.path.startsWith(`combos/${comboId}/`)) return fallo("Ruta de imagen inválida.");
  const { data: combo } = await supabase.from("combos").select("slug, nombre").eq("id", comboId).maybeSingle();
  if (!combo) return fallo("El combo no existe.");
  const { data: ultima } = await supabase
    .from("combo_imagenes")
    .select("orden")
    .eq("combo_id", comboId)
    .order("orden", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data, error: e } = await supabase
    .from("combo_imagenes")
    .insert({ combo_id: comboId, path: imagen.path, ancho: imagen.ancho, alto: imagen.alto, orden: (ultima?.orden ?? -1) + 1, alt: combo.nombre })
    .select("id")
    .single();
  if (e) {
    await supabase.storage.from(BUCKET).remove([imagen.path]);
    return fallo("No se pudo registrar la imagen.");
  }
  invalidar(combo.slug);
  return ok({ id: data.id });
}

export async function reordenarImagenesCombo(comboId: string, ids: string[]): Promise<Resultado> {
  const { supabase, error } = await adminParaAccion();
  if (!supabase) return fallo(error);
  if (!z.array(uuid).safeParse(ids).success) return fallo("Orden inválido.");
  const { error: e } = await supabase.rpc("reordenar_imagenes_combo", { p_combo_id: comboId, p_ids: ids });
  if (e) return fallo("No se pudo reordenar.");
  invalidar(await slugDe(supabase, comboId));
  return ok(undefined);
}

export async function actualizarAltCombo(imagenId: string, alt: string): Promise<Resultado> {
  const { supabase, error } = await adminParaAccion();
  if (!supabase) return fallo(error);
  const { data, error: e } = await supabase
    .from("combo_imagenes")
    .update({ alt: alt.trim().slice(0, 200) })
    .eq("id", imagenId)
    .select("combo:combos(slug)")
    .maybeSingle();
  if (e || !data) return fallo("No se pudo guardar el texto alternativo.");
  invalidar(data.combo?.slug);
  return ok(undefined);
}

export async function borrarImagenCombo(imagenId: string): Promise<Resultado> {
  const { supabase, error } = await adminParaAccion();
  if (!supabase) return fallo(error);
  const { data: img } = await supabase.from("combo_imagenes").select("path, combo:combos(slug)").eq("id", imagenId).maybeSingle();
  if (!img) return fallo("La imagen no existe.");
  // Storage primero: un archivo huérfano es invisible; una fila sin archivo es una imagen rota.
  const { error: e1 } = await supabase.storage.from(BUCKET).remove([img.path]);
  if (e1) return fallo("No se pudo borrar el archivo.");
  const { error: e2 } = await supabase.from("combo_imagenes").delete().eq("id", imagenId);
  if (e2) return fallo("No se pudo borrar la imagen.");
  invalidar(img.combo?.slug);
  return ok(undefined);
}

// ---------------------------------------------------------------- descripción

export async function guardarDescripcionCombo(id: string, contenido: string): Promise<Resultado> {
  const { supabase, error } = await adminParaAccion();
  if (!supabase) return fallo(error);
  const d = procesarDescripcion(contenido);
  if (!d.ok) return d;
  const { data, error: e } = await supabase
    .from("combos")
    .update({ descripcion: d.datos.json, descripcion_texto: d.datos.texto })
    .eq("id", id)
    .select("slug")
    .maybeSingle();
  if (e || !data) return fallo("No se pudo guardar la descripción.");
  invalidar(data.slug);
  return ok(undefined);
}
