"use server";

import { updateTag } from "next/cache";
import { z } from "zod";
import { adminParaAccion, fallo, ok, type Resultado } from "@/lib/admin/accion";
import { CLAVES_RESERVADAS } from "@/lib/catalogo/filtros";
import { TAGS } from "@/lib/catalogo/tags";
import { ICONOS_GRUPO } from "@/lib/iconos";
import { slugUnico } from "@/lib/admin/slug-unico";

// Server Actions de grupos y etiquetas. Patrón en claude/web/dashboard.md#patrón-de-server-action
// Un nombre de grupo o de etiqueta aparece en fichas, tarjetas (marca) y filtros de
// muchos productos: toda escritura invalida `etiquetas`, `facetas` y `productos`.
// Ver claude/web/etiquetas.md#en-el-dashboard

function invalidar() {
  updateTag(TAGS.etiquetas);
  updateTag(TAGS.facetas);
  updateTag(TAGS.productos);
}

const uuid = z.string().uuid();

/** Mensajes de la base que sí le sirven al admin (triggers y checks conocidos). */
function mensaje(e: { code?: string; message?: string }, porDefecto: string) {
  if (e.code === "P0001" && e.message) return e.message; // raise exception de un trigger o RPC
  if (e.code === "23503") return "Está en uso por variantes de productos: sacala de esas variantes primero.";
  return porDefecto;
}

// ---------------------------------------------------------------- grupos

const esquemaGrupo = z.object({
  nombre: z.string().trim().min(1, "Poné un nombre.").max(40, "Máximo 40 caracteres."),
  icono: z
    .string()
    .nullable()
    .refine((i) => i === null || i in ICONOS_GRUPO, "Ícono inválido."),
  visibleEnFiltros: z.boolean(),
  visibleEnFicha: z.boolean(),
  esVariante: z.boolean(),
  esMarca: z.boolean(),
  /** Los valores son colores: muestra de color en el panel, la ficha y los filtros. */
  conColor: z.boolean(),
  /** Categorías que piden este grupo al cargar un producto (la marca no usa). */
  categoriaIds: z.array(uuid).max(100),
});
export type DatosGrupo = z.input<typeof esquemaGrupo>;

function filaGrupo(g: z.output<typeof esquemaGrupo>) {
  return {
    nombre: g.nombre,
    icono: g.icono,
    visible_en_filtros: g.visibleEnFiltros,
    visible_en_ficha: g.visibleEnFicha,
    es_variante: g.esVariante,
    es_marca: g.esMarca,
    con_color: g.conColor,
  };
}

/** Reemplaza las categorías del grupo: agrega antes de quitar. */
async function guardarCategoriasDeGrupo(
  supabase: NonNullable<Awaited<ReturnType<typeof adminParaAccion>>["supabase"]>,
  grupoId: string,
  categoriaIds: string[],
) {
  const { data: actuales } = await supabase.from("categoria_grupos").select("categoria_id").eq("grupo_id", grupoId);
  const antes = new Set((actuales ?? []).map((c) => c.categoria_id));
  const nuevas = categoriaIds.filter((c) => !antes.has(c));
  const quitar = [...antes].filter((c) => !categoriaIds.includes(c));
  if (nuevas.length) {
    const { error } = await supabase.from("categoria_grupos").insert(nuevas.map((categoria_id) => ({ categoria_id, grupo_id: grupoId })));
    if (error) return false;
  }
  if (quitar.length) await supabase.from("categoria_grupos").delete().eq("grupo_id", grupoId).in("categoria_id", quitar);
  return true;
}

function errorGrupo(e: { code?: string; message?: string }) {
  if (e.code === "23505") return e.message?.includes("marca") ? "Ya hay un grupo marcado como marca." : "Ya existe un grupo con ese nombre.";
  if (e.code === "23514") return e.message?.includes("marca") ? "La marca no puede ser un grupo de variante." : "Datos inválidos.";
  return mensaje(e, "No se pudo guardar el grupo.");
}

export async function crearGrupo(datos: DatosGrupo): Promise<Resultado<{ id: string }>> {
  const { supabase, error } = await adminParaAccion();
  if (!supabase) return fallo(error);
  const r = esquemaGrupo.safeParse(datos);
  if (!r.success) return fallo(r.error.issues[0]?.message ?? "Datos inválidos.");
  // Al final de la lista.
  const { data: ultimo } = await supabase.from("grupos_etiqueta").select("orden").order("orden", { ascending: false }).limit(1).maybeSingle();
  const { data, error: e } = await supabase
    .from("grupos_etiqueta")
    // El slug es la clave del filtro en la URL (?talle=m): se arma con el nombre al crear
    // el grupo, evita las claves reservadas del catálogo y no cambia después.
    .insert({
      ...filaGrupo(r.data),
      slug: await slugUnico(supabase, "grupos_etiqueta", r.data.nombre, { porDefecto: "grupo", reservados: CLAVES_RESERVADAS }),
      orden: (ultimo?.orden ?? 0) + 1,
    })
    .select("id")
    .single();
  if (e) return fallo(errorGrupo(e));
  if (!r.data.esMarca && !(await guardarCategoriasDeGrupo(supabase, data.id, r.data.categoriaIds))) {
    return fallo("Se creó el grupo pero no se pudieron guardar sus categorías.");
  }
  invalidar();
  return ok({ id: data.id });
}

export async function guardarGrupo(id: string, datos: DatosGrupo): Promise<Resultado> {
  const { supabase, error } = await adminParaAccion();
  if (!supabase) return fallo(error);
  if (!uuid.safeParse(id).success) return fallo("Grupo inválido.");
  const r = esquemaGrupo.safeParse(datos);
  if (!r.success) return fallo(r.error.issues[0]?.message ?? "Datos inválidos.");
  const { error: e } = await supabase.from("grupos_etiqueta").update(filaGrupo(r.data)).eq("id", id);
  if (e) return fallo(errorGrupo(e));
  // Si sus valores dejan de ser colores, se borran las muestras: la tienda las muestra
  // siempre que haya color_hex.
  if (!r.data.conColor) await supabase.from("etiquetas").update({ color_hex: null }).eq("grupo_id", id).not("color_hex", "is", null);
  if (!(await guardarCategoriasDeGrupo(supabase, id, r.data.esMarca ? [] : r.data.categoriaIds))) {
    return fallo("Se guardó el grupo pero no sus categorías.");
  }
  invalidar();
  return ok(undefined);
}

export async function borrarGrupo(id: string): Promise<Resultado> {
  const { supabase, error } = await adminParaAccion();
  if (!supabase) return fallo(error);
  if (!uuid.safeParse(id).success) return fallo("Grupo inválido.");
  // Borra sus etiquetas (cascade) y las saca de los productos; si alguna está en una
  // variante, la FK de variante_etiquetas lo impide.
  const { error: e } = await supabase.from("grupos_etiqueta").delete().eq("id", id);
  if (e) return fallo(mensaje(e, "No se pudo borrar el grupo."));
  invalidar();
  return ok(undefined);
}

export async function reordenarGrupos(ids: string[]): Promise<Resultado> {
  const { supabase, error } = await adminParaAccion();
  if (!supabase) return fallo(error);
  if (!z.array(uuid).safeParse(ids).success) return fallo("Orden inválido.");
  const { error: e } = await supabase.rpc("reordenar_grupos", { p_ids: ids });
  if (e) return fallo("No se pudo reordenar.");
  invalidar();
  return ok(undefined);
}

// ---------------------------------------------------------------- etiquetas

const esquemaEtiqueta = z.object({
  valor: z.string().trim().min(1, "Poné un valor.").max(60, "Máximo 60 caracteres."),
  colorHex: z
    .string()
    .regex(/^#[0-9a-f]{6}$/, "Color inválido.")
    .nullable(),
});

function errorEtiqueta(e: { code?: string; message?: string }) {
  // unique (grupo_id, slug): "144Hz" y "144 Hz" dan el mismo slug.
  if (e.code === "23505") return "Ya existe ese valor en el grupo (\"144Hz\" y \"144 Hz\" cuentan como el mismo). Si son dos valores repetidos, fusionalos.";
  return mensaje(e, "No se pudo guardar la etiqueta.");
}

export async function crearEtiquetaEnGrupo(grupoId: string, valor: string, colorHex: string | null): Promise<Resultado> {
  const { supabase, error } = await adminParaAccion();
  if (!supabase) return fallo(error);
  if (!uuid.safeParse(grupoId).success) return fallo("Grupo inválido.");
  const r = esquemaEtiqueta.safeParse({ valor, colorHex });
  if (!r.success) return fallo(r.error.issues[0]?.message ?? "Datos inválidos.");
  const { data: ultima } = await supabase
    .from("etiquetas")
    .select("orden")
    .eq("grupo_id", grupoId)
    .order("orden", { ascending: false })
    .limit(1)
    .maybeSingle();
  const { error: e } = await supabase
    .from("etiquetas")
    .insert({ grupo_id: grupoId, valor: r.data.valor, color_hex: r.data.colorHex, orden: (ultima?.orden ?? -1) + 1 });
  if (e) return fallo(errorEtiqueta(e));
  invalidar();
  return ok(undefined);
}

export async function guardarEtiqueta(id: string, valor: string, colorHex: string | null): Promise<Resultado> {
  const { supabase, error } = await adminParaAccion();
  if (!supabase) return fallo(error);
  if (!uuid.safeParse(id).success) return fallo("Etiqueta inválida.");
  const r = esquemaEtiqueta.safeParse({ valor, colorHex });
  if (!r.success) return fallo(r.error.issues[0]?.message ?? "Datos inválidos.");
  // Renombrar cambia el slug (columna generada): un trigger recalcula la clave de las
  // variantes. Los links con filtros por el valor viejo dejan de filtrar.
  const { error: e } = await supabase.from("etiquetas").update({ valor: r.data.valor, color_hex: r.data.colorHex }).eq("id", id);
  if (e) return fallo(errorEtiqueta(e));
  invalidar();
  return ok(undefined);
}

export async function borrarEtiqueta(id: string): Promise<Resultado> {
  const { supabase, error } = await adminParaAccion();
  if (!supabase) return fallo(error);
  if (!uuid.safeParse(id).success) return fallo("Etiqueta inválida.");
  const { error: e } = await supabase.from("etiquetas").delete().eq("id", id);
  if (e) return fallo(mensaje(e, "No se pudo borrar la etiqueta."));
  invalidar();
  return ok(undefined);
}

export async function reordenarEtiquetas(grupoId: string, ids: string[]): Promise<Resultado> {
  const { supabase, error } = await adminParaAccion();
  if (!supabase) return fallo(error);
  if (!uuid.safeParse(grupoId).success || !z.array(uuid).safeParse(ids).success) return fallo("Orden inválido.");
  const { error: e } = await supabase.rpc("reordenar_etiquetas", { p_grupo_id: grupoId, p_ids: ids });
  if (e) return fallo("No se pudo reordenar.");
  invalidar();
  return ok(undefined);
}

/** Mueve productos, variantes y promociones de `origen` a `destino` y borra `origen`. */
export async function fusionarEtiquetas(origen: string, destino: string): Promise<Resultado> {
  const { supabase, error } = await adminParaAccion();
  if (!supabase) return fallo(error);
  if (!uuid.safeParse(origen).success || !uuid.safeParse(destino).success) return fallo("Etiquetas inválidas.");
  const { error: e } = await supabase.rpc("fusionar_etiquetas", { p_origen: origen, p_destino: destino });
  if (e) return fallo(mensaje(e, "No se pudieron fusionar."));
  invalidar();
  return ok(undefined);
}

// ---------------------------------------------------------------- plantillas
// Conjunto de grupos con nombre ("Notebook") que se asigna a varias categorías de una vez.
// Sólo guía el formulario del panel: no invalida la tienda. Ver claude/web/dashboard.md#características-por-categoría

const esquemaPlantilla = z.object({
  nombre: z.string().trim().min(1, "Poné un nombre.").max(60, "Máximo 60 caracteres."),
  grupoIds: z.array(uuid).min(1, "Elegí al menos un grupo de etiquetas.").max(50),
  categoriaIds: z.array(uuid).max(100),
});
export type DatosPlantilla = z.input<typeof esquemaPlantilla>;

export async function guardarPlantilla(id: string | null, datos: DatosPlantilla): Promise<Resultado> {
  const { supabase, error } = await adminParaAccion();
  if (!supabase) return fallo(error);
  if (id !== null && !uuid.safeParse(id).success) return fallo("Plantilla inválida.");
  const r = esquemaPlantilla.safeParse(datos);
  if (!r.success) return fallo(r.error.issues[0]?.message ?? "Datos inválidos.");
  // Nombre, grupos y categorías en una transacción.
  const { error: e } = await supabase.rpc("guardar_plantilla", {
    // null = crear. El tipo generado no admite null en un uuid; la función sí.
    p_id: id as string,
    p_nombre: r.data.nombre,
    p_grupos: r.data.grupoIds,
    p_categorias: r.data.categoriaIds,
  });
  if (e?.code === "23505") return fallo("Ya hay una plantilla con ese nombre.");
  if (e) return fallo(mensaje(e, "No se pudo guardar la plantilla."));
  return ok(undefined);
}

export async function borrarPlantilla(id: string): Promise<Resultado> {
  const { supabase, error } = await adminParaAccion();
  if (!supabase) return fallo(error);
  if (!uuid.safeParse(id).success) return fallo("Plantilla inválida.");
  // Las categorías dejan de pedir sus grupos (cascade); los productos no se tocan.
  const { error: e } = await supabase.from("plantillas").delete().eq("id", id);
  if (e) return fallo("No se pudo borrar la plantilla.");
  return ok(undefined);
}
