"use server";

import { updateTag } from "next/cache";
import { z } from "zod";
import { adminParaAccion, fallo, ok, type Resultado } from "@/lib/admin/accion";
import { finDia, inicioDia } from "@/lib/admin/fechas";
import { TAGS } from "@/lib/catalogo/tags";
import { BUCKET } from "@/lib/supabase/storage";

// Server Actions de banners. Patrón en claude/web/dashboard.md#patrón-de-server-action
// Las imágenes se suben directo a Storage en `banners/{id}/` ANTES de guardar (el id de
// un banner nuevo lo genera la página). Al guardar se borran del folder los archivos que
// ya no usa (reemplazos y subidas descartadas). Ver claude/web/banners.md

const uuid = z.string().uuid();
const dia = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .nullable();
const texto = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Máximo ${max} caracteres.`)
    .transform((s) => s || null);

const esquema = z
  .object({
    imagenPath: z.string().min(1, "Subí la imagen de escritorio."),
    imagenMobilePath: z.string().nullable(),
    titulo: texto(60),
    subtitulo: texto(120),
    textoBoton: texto(30),
    // Ruta interna (/catalogo?cat=ropa) o URL https.
    enlace: texto(300).refine((e) => e === null || /^\/(?!\/)/.test(e) || /^https:\/\//.test(e), "El enlace es una ruta que empieza con / o una URL https://."),
    textoClaro: z.boolean(),
    activo: z.boolean(),
    desde: dia,
    hasta: dia,
  })
  .superRefine((b, ctx) => {
    if (b.textoBoton && !b.enlace) ctx.addIssue({ code: "custom", message: "El botón necesita un enlace." });
    if (b.desde && b.hasta && b.hasta < b.desde) ctx.addIssue({ code: "custom", message: "La fecha de fin es anterior a la de inicio." });
  });
export type DatosBanner = z.input<typeof esquema>;

async function limpiarCarpeta(supabase: NonNullable<Awaited<ReturnType<typeof adminParaAccion>>["supabase"]>, id: string, usados: (string | null)[]) {
  const { data: archivos } = await supabase.storage.from(BUCKET).list(`banners/${id}`, { limit: 100 });
  const sobran = (archivos ?? []).map((a) => `banners/${id}/${a.name}`).filter((p) => !usados.includes(p));
  if (sobran.length) await supabase.storage.from(BUCKET).remove(sobran);
}

/** Crea (`nuevo`) o actualiza el banner `id`. */
export async function guardarBanner(id: string, nuevo: boolean, datos: DatosBanner): Promise<Resultado> {
  const { supabase, error } = await adminParaAccion();
  if (!supabase) return fallo(error);
  if (!uuid.safeParse(id).success) return fallo("Banner inválido.");
  const r = esquema.safeParse(datos);
  if (!r.success) return fallo(r.error.issues[0]?.message ?? "Datos inválidos.");
  const b = r.data;
  const carpeta = `banners/${id}/`;
  if (!b.imagenPath.startsWith(carpeta) || (b.imagenMobilePath && !b.imagenMobilePath.startsWith(carpeta))) {
    return fallo("Ruta de imagen inválida.");
  }

  const fila = {
    imagen_path: b.imagenPath,
    imagen_mobile_path: b.imagenMobilePath,
    titulo: b.titulo,
    subtitulo: b.subtitulo,
    texto_boton: b.textoBoton,
    enlace: b.enlace,
    texto_claro: b.textoClaro,
    activo: b.activo,
    desde: inicioDia(b.desde),
    hasta: finDia(b.hasta),
  };
  if (nuevo) {
    const { data: ultimo } = await supabase.from("banners").select("orden").order("orden", { ascending: false }).limit(1).maybeSingle();
    const { error: e } = await supabase.from("banners").insert({ id, ...fila, orden: (ultimo?.orden ?? -1) + 1 });
    if (e) return fallo("No se pudo crear el banner.");
  } else {
    const { error: e } = await supabase.from("banners").update(fila).eq("id", id);
    if (e) return fallo("No se pudo guardar el banner.");
  }
  await limpiarCarpeta(supabase, id, [b.imagenPath, b.imagenMobilePath]);
  updateTag(TAGS.banners);
  return ok(undefined);
}

export async function cambiarActivoBanner(id: string, activo: boolean): Promise<Resultado> {
  const { supabase, error } = await adminParaAccion();
  if (!supabase) return fallo(error);
  if (!uuid.safeParse(id).success) return fallo("Banner inválido.");
  const { error: e } = await supabase.from("banners").update({ activo }).eq("id", id);
  if (e) return fallo("No se pudo cambiar el estado.");
  updateTag(TAGS.banners);
  return ok(undefined);
}

export async function reordenarBanners(ids: string[]): Promise<Resultado> {
  const { supabase, error } = await adminParaAccion();
  if (!supabase) return fallo(error);
  if (!z.array(uuid).safeParse(ids).success) return fallo("Orden inválido.");
  const { error: e } = await supabase.rpc("reordenar_banners", { p_ids: ids });
  if (e) return fallo("No se pudo reordenar.");
  updateTag(TAGS.banners);
  return ok(undefined);
}

export async function borrarBanner(id: string): Promise<Resultado> {
  const { supabase, error } = await adminParaAccion();
  if (!supabase) return fallo(error);
  if (!uuid.safeParse(id).success) return fallo("Banner inválido.");
  // Storage primero: borrar la fila no borra los archivos.
  await limpiarCarpeta(supabase, id, []);
  const { error: e } = await supabase.from("banners").delete().eq("id", id);
  if (e) return fallo("No se pudo borrar el banner.");
  updateTag(TAGS.banners);
  return ok(undefined);
}
