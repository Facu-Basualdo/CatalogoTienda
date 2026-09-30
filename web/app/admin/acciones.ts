"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { adminParaAccion, fallo, ok, type Resultado } from "@/lib/admin/accion";
import { TAGS } from "@/lib/catalogo/tags";
import { supabaseServidor } from "@/lib/supabase/servidor";

export async function cerrarSesion() {
  const supabase = await supabaseServidor();
  await supabase.auth.signOut();
  redirect("/admin/login");
}

/**
 * Invalida toda la caché del catálogo. Hace falta cuando los datos cambian por fuera
 * de la app (SQL, CLI, scripts): ningún tag se invalida solo.
 * Ver claude/web/cache-y-revalidacion.md#cambios-hechos-fuera-de-la-app
 */
export async function refrescarTienda(): Promise<Resultado<{ productos: number }>> {
  const { supabase, error } = await adminParaAccion();
  if (!supabase) return fallo(error);

  const { data, error: e } = await supabase.from("productos").select("slug");
  if (e) return fallo("No pudimos leer los productos.");

  for (const tag of [TAGS.productos, TAGS.facetas, TAGS.etiquetas, TAGS.categorias, TAGS.banners]) updateTag(tag);
  for (const { slug } of data) updateTag(TAGS.producto(slug));

  return ok({ productos: data.length });
}
