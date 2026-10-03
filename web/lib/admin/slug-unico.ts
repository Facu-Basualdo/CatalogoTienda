import "server-only";

import { slugify } from "@/lib/slug";
import type { supabaseServidor } from "@/lib/supabase/servidor";

type Cliente = Awaited<ReturnType<typeof supabaseServidor>>;
type TablaConSlug = "productos" | "combos" | "categorias" | "grupos_etiqueta";

/**
 * El slug (la parte de la URL: /p/remera-basica) lo arma el sistema, nunca el admin:
 * slugify(nombre) y, si ya lo usa otra fila de la tabla, "-2", "-3"… `reservados`: slugs
 * que no se pueden usar aunque estén libres (claves de la URL del catálogo).
 * Ver claude/web/dashboard.md#slugs
 */
export async function slugUnico(
  supabase: Cliente,
  tabla: TablaConSlug,
  nombre: string,
  { excluirId, porDefecto, reservados = [] }: { excluirId?: string; porDefecto: string; reservados?: readonly string[] },
): Promise<string> {
  const base = slugify(nombre) || porDefecto;
  let consulta = supabase.from(tabla).select("slug").like("slug", `${base}%`);
  if (excluirId) consulta = consulta.neq("id", excluirId);
  const { data } = await consulta;
  const usados = new Set([...(data ?? []).map((f) => f.slug), ...reservados]);
  if (!usados.has(base)) return base;
  for (let n = 2; ; n++) if (!usados.has(`${base}-${n}`)) return `${base}-${n}`;
}
