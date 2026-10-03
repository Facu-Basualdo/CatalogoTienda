"use server";

import { updateTag } from "next/cache";
import { z } from "zod";
import { adminParaAccion, fallo, ok, type Resultado } from "@/lib/admin/accion";
import { slugUnico } from "@/lib/admin/slug-unico";
import { procesarDescripcion } from "@/lib/admin/descripcion";
import { TAGS } from "@/lib/catalogo/tags";
import { slugify } from "@/lib/slug";
import { BUCKET } from "@/lib/supabase/storage";

// Server Actions de productos. Patrón en claude/web/dashboard.md#patrón-de-server-action
// Cada escritura invalida `productos`, `facetas` y `producto:{slug}` (viejo y nuevo).

function invalidar(...slugs: (string | null | undefined)[]) {
  updateTag(TAGS.productos);
  updateTag(TAGS.facetas);
  for (const s of new Set(slugs)) if (s) updateTag(TAGS.producto(s));
}

const uuid = z.string().uuid();

// ---------------------------------------------------------------- alta / baja

export async function crearBorrador(): Promise<Resultado<{ id: string }>> {
  const { supabase, error } = await adminParaAccion();
  if (!supabase) return fallo(error);

  // Borrador = publicado false. Las imágenes necesitan el id para su path, por eso el
  // producto existe antes de cargar nada. El trigger crea su variante única.
  const sufijo = crypto.randomUUID().slice(0, 8);
  const { data, error: e } = await supabase
    .from("productos")
    .insert({ nombre: "Producto nuevo", slug: `borrador-${sufijo}`, publicado: false })
    .select("id")
    .single();
  if (e) return fallo("No se pudo crear el producto.");
  return ok({ id: data.id });
}

export async function borrarProducto(id: string): Promise<Resultado> {
  const { supabase, error } = await adminParaAccion();
  if (!supabase) return fallo(error);
  if (!uuid.safeParse(id).success) return fallo("Producto inválido.");

  const { data: producto } = await supabase.from("productos").select("slug").eq("id", id).maybeSingle();
  if (!producto) return fallo("El producto no existe.");

  // combo_items.producto_id es on delete restrict: antes de tocar Storage, o se borrarían
  // las imágenes de un producto que después no se puede borrar.
  const { data: enCombos } = await supabase.from("combo_items").select("combo:combos(nombre)").eq("producto_id", id);
  if (enCombos?.length) {
    const nombres = enCombos.map((c) => c.combo?.nombre).filter(Boolean).join(", ");
    return fallo(`Está en ${enCombos.length === 1 ? "el combo" : "los combos"} ${nombres}. Sacalo de ahí antes de borrarlo.`);
  }

  // Storage primero: borrar la fila no borra los archivos.
  const { data: archivos } = await supabase.storage.from(BUCKET).list(`productos/${id}`, { limit: 1000 });
  if (archivos?.length) {
    const { error: e } = await supabase.storage.from(BUCKET).remove(archivos.map((a) => `productos/${id}/${a.name}`));
    if (e) return fallo("No se pudieron borrar las imágenes; el producto no se borró.");
  }
  const { error: e } = await supabase.from("productos").delete().eq("id", id);
  if (e) return fallo("No se pudo borrar el producto.");

  invalidar(producto.slug);
  return ok(undefined);
}

// ---------------------------------------------------------------- datos

const esquemaDatos = z.object({
  nombre: z.string().trim().min(1, "El nombre es obligatorio").max(120),
  precio: z.number().int("Sin decimales").min(0),
  precioAnterior: z.number().int().min(0).nullable(),
  categoriaId: uuid.nullable(),
  destacado: z.boolean(),
  publicado: z.boolean(),
});
export type DatosProducto = z.infer<typeof esquemaDatos>;

export async function guardarDatos(id: string, entrada: DatosProducto): Promise<Resultado<{ slug: string }>> {
  const { supabase, error } = await adminParaAccion();
  if (!supabase) return fallo(error);
  const datos = esquemaDatos.safeParse(entrada);
  if (!datos.success) return fallo(datos.error.issues[0]?.message ?? "Datos inválidos.");
  const d = datos.data;
  if (d.precioAnterior !== null && d.precioAnterior <= d.precio) {
    return fallo("El precio anterior tiene que ser mayor que el precio (o quedar vacío).");
  }

  const { data: antes } = await supabase.from("productos").select("slug, publicado").eq("id", id).maybeSingle();
  if (!antes) return fallo("El producto no existe.");
  // El slug lo arma el sistema: sigue al nombre mientras el producto está oculto y queda
  // fijo una vez publicado (cambiarlo rompería los links ya compartidos).
  const slug = antes.publicado ? antes.slug : await slugUnico(supabase, "productos", d.nombre, { excluirId: id, porDefecto: "producto" });

  const { error: e } = await supabase
    .from("productos")
    .update({
      nombre: d.nombre,
      slug,
      precio: d.precio,
      precio_anterior: d.precioAnterior,
      categoria_id: d.categoriaId,
      destacado: d.destacado,
      publicado: d.publicado,
    })
    .eq("id", id);
  if (e) return fallo("No se pudieron guardar los datos.");

  // El slug viejo también: si no, la URL vieja sigue sirviendo la ficha cacheada.
  invalidar(antes.slug, slug);
  return ok({ slug });
}

export async function cambiarVisibilidad(id: string, publicado: boolean): Promise<Resultado> {
  const { supabase, error } = await adminParaAccion();
  if (!supabase) return fallo(error);
  const { data, error: e } = await supabase.from("productos").update({ publicado }).eq("id", id).select("slug").maybeSingle();
  if (e || !data) return fallo("No se pudo cambiar la visibilidad.");
  invalidar(data.slug);
  return ok(undefined);
}

// ---------------------------------------------------------------- etiquetas

/** Reemplaza las etiquetas NO variante del producto (marca, material, refresco…). */
export async function guardarEtiquetas(id: string, etiquetaIds: string[]): Promise<Resultado> {
  const { supabase, error } = await adminParaAccion();
  if (!supabase) return fallo(error);
  if (!z.array(uuid).max(200).safeParse(etiquetaIds).success) return fallo("Etiquetas inválidas.");

  const { data: actuales, error: e1 } = await supabase.from("producto_etiquetas").select("etiqueta_id").eq("producto_id", id);
  if (e1) return fallo("No se pudieron leer las etiquetas.");
  const antes = new Set(actuales.map((a) => a.etiqueta_id));
  const despues = new Set(etiquetaIds);
  const quitar = [...antes].filter((x) => !despues.has(x));
  const agregar = [...despues].filter((x) => !antes.has(x));

  // Primero agregar y después quitar: si algo falla a mitad, sobra una etiqueta en vez
  // de faltar (un producto sin marca desaparece del filtro de marca).
  if (agregar.length) {
    const { error: e } = await supabase.from("producto_etiquetas").insert(agregar.map((etiqueta_id) => ({ producto_id: id, etiqueta_id })));
    if (e) return fallo(e.message.includes("grupo de variante") ? "Talle/color se cargan en Variantes." : "No se pudieron agregar etiquetas.");
  }
  if (quitar.length) {
    const { error: e } = await supabase.from("producto_etiquetas").delete().eq("producto_id", id).in("etiqueta_id", quitar);
    if (e) return fallo("No se pudieron quitar etiquetas.");
  }

  const { data: p } = await supabase.from("productos").select("slug").eq("id", id).maybeSingle();
  invalidar(p?.slug);
  return ok(undefined);
}

/** Crea un valor nuevo en un grupo, o devuelve el existente si el slug ya está ("144Hz" = "144 hz"). */
export async function crearEtiqueta(
  grupoId: string,
  valor: string,
): Promise<Resultado<{ id: string; valor: string; slug: string; creada: boolean }>> {
  const { supabase, error } = await adminParaAccion();
  if (!supabase) return fallo(error);
  const v = valor.trim();
  if (!uuid.safeParse(grupoId).success || !v || v.length > 60 || !slugify(v)) return fallo("Valor inválido.");

  const { data: existente } = await supabase
    .from("etiquetas")
    .select("id, valor, slug")
    .eq("grupo_id", grupoId)
    .eq("slug", slugify(v))
    .maybeSingle();
  if (existente) return ok({ id: existente.id, valor: existente.valor, slug: existente.slug ?? "", creada: false });

  const { data, error: e } = await supabase.from("etiquetas").insert({ grupo_id: grupoId, valor: v }).select("id, valor, slug").single();
  if (e) return fallo("No se pudo crear la etiqueta.");
  updateTag(TAGS.etiquetas);
  updateTag(TAGS.facetas);
  return ok({ id: data.id, valor: data.valor, slug: data.slug ?? "", creada: true });
}

// ---------------------------------------------------------------- variantes

const esquemaVariantes = z
  .array(
    z.object({
      etiquetas: z.array(uuid).max(3),
      sku: z.string().trim().max(60).nullable(),
      precio: z.number().int().min(0).nullable(),
      stock: z.number().int().min(0).max(100000),
      activa: z.boolean(),
    }),
  )
  .min(1, "Tiene que haber al menos una variante")
  .max(100, "Máximo 100 combinaciones");
export type FilaVariante = z.infer<typeof esquemaVariantes>[number];

export async function guardarVariantes(id: string, filas: FilaVariante[]): Promise<Resultado> {
  const { supabase, error } = await adminParaAccion();
  if (!supabase) return fallo(error);
  const datos = esquemaVariantes.safeParse(filas);
  if (!datos.success) return fallo(datos.error.issues[0]?.message ?? "Variantes inválidas.");

  // Un solo RPC: reemplaza todas en una transacción. Nunca updates sueltos.
  const { error: e } = await supabase.rpc("guardar_variantes", {
    p_producto_id: id,
    p_variantes: datos.data.map((f) => ({ ...f, sku: f.sku || null })),
  });
  if (e?.code === "23505") return fallo("Hay un SKU repetido (puede estar en otro producto).");
  if (e) return fallo(e.message.startsWith("Combinación repetida") ? e.message : "No se pudieron guardar las variantes.");

  const { data: p } = await supabase.from("productos").select("slug").eq("id", id).maybeSingle();
  invalidar(p?.slug);
  return ok(undefined);
}

// ---------------------------------------------------------------- imágenes

export async function registrarImagen(
  productoId: string,
  imagen: { path: string; ancho: number; alto: number },
): Promise<Resultado<{ id: string; orden: number }>> {
  const { supabase, error } = await adminParaAccion();
  if (!supabase) return fallo(error);
  if (!imagen.path.startsWith(`productos/${productoId}/`)) return fallo("Ruta de imagen inválida.");

  const { data: prod } = await supabase.from("productos").select("slug, nombre").eq("id", productoId).maybeSingle();
  if (!prod) return fallo("El producto no existe.");
  const { data: ultima } = await supabase
    .from("producto_imagenes")
    .select("orden")
    .eq("producto_id", productoId)
    .order("orden", { ascending: false })
    .limit(1)
    .maybeSingle();
  const orden = (ultima?.orden ?? -1) + 1;

  const { data, error: e } = await supabase
    .from("producto_imagenes")
    .insert({ producto_id: productoId, path: imagen.path, ancho: imagen.ancho, alto: imagen.alto, orden, alt: prod.nombre })
    .select("id")
    .single();
  if (e) {
    // Si no se pudo registrar, el archivo quedaría huérfano.
    await supabase.storage.from(BUCKET).remove([imagen.path]);
    return fallo("No se pudo registrar la imagen.");
  }
  invalidar(prod.slug);
  return ok({ id: data.id, orden });
}

export async function actualizarAlt(imagenId: string, alt: string): Promise<Resultado> {
  const { supabase, error } = await adminParaAccion();
  if (!supabase) return fallo(error);
  const { data, error: e } = await supabase
    .from("producto_imagenes")
    .update({ alt: alt.trim().slice(0, 200) })
    .eq("id", imagenId)
    .select("producto:productos(slug)")
    .maybeSingle();
  if (e || !data) return fallo("No se pudo guardar el texto alternativo.");
  invalidar(data.producto?.slug);
  return ok(undefined);
}

export async function reordenarImagenes(productoId: string, ids: string[]): Promise<Resultado> {
  const { supabase, error } = await adminParaAccion();
  if (!supabase) return fallo(error);
  if (!z.array(uuid).safeParse(ids).success) return fallo("Orden inválido.");
  const { error: e } = await supabase.rpc("reordenar_imagenes", { p_producto_id: productoId, p_ids: ids });
  if (e) return fallo("No se pudo reordenar.");
  const { data: p } = await supabase.from("productos").select("slug").eq("id", productoId).maybeSingle();
  invalidar(p?.slug);
  return ok(undefined);
}

export async function borrarImagen(imagenId: string): Promise<Resultado> {
  const { supabase, error } = await adminParaAccion();
  if (!supabase) return fallo(error);
  const { data: img } = await supabase
    .from("producto_imagenes")
    .select("path, producto:productos(slug)")
    .eq("id", imagenId)
    .maybeSingle();
  if (!img) return fallo("La imagen no existe.");

  // Storage primero: un archivo huérfano es invisible; una fila sin archivo es una imagen rota.
  const { error: e1 } = await supabase.storage.from(BUCKET).remove([img.path]);
  if (e1) return fallo("No se pudo borrar el archivo.");
  const { error: e2 } = await supabase.from("producto_imagenes").delete().eq("id", imagenId);
  if (e2) return fallo("No se pudo borrar la imagen.");
  invalidar(img.producto?.slug);
  return ok(undefined);
}

// ---------------------------------------------------------------- descripción

/** El documento llega como string JSON: ver procesarDescripcion. */
export async function guardarDescripcion(id: string, contenido: string): Promise<Resultado> {
  const { supabase, error } = await adminParaAccion();
  if (!supabase) return fallo(error);
  const d = procesarDescripcion(contenido);
  if (!d.ok) return d;
  const { json, texto } = d.datos;

  // descripcion_texto es obligatoria: la usan la búsqueda y la meta description.
  const { data, error: e } = await supabase
    .from("productos")
    .update({ descripcion: json, descripcion_texto: texto })
    .eq("id", id)
    .select("slug")
    .maybeSingle();
  if (e || !data) return fallo("No se pudo guardar la descripción.");
  invalidar(data.slug);
  return ok(undefined);
}
