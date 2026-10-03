import "server-only";

import type { supabaseServidor } from "@/lib/supabase/servidor";

type Cliente = Awaited<ReturnType<typeof supabaseServidor>>;

/** Destinos del botón del banner: categorías con su jerarquía ("Ropa › Remeras"). */
export async function destinosBanner(supabase: Cliente) {
  const { data } = await supabase.from("categorias").select("id, slug, nombre, padre_id, orden").order("orden");
  const cats = data ?? [];
  return cats
    .filter((c) => !c.padre_id)
    .flatMap((r) => [
      { slug: r.slug, nombre: r.nombre },
      ...cats.filter((c) => c.padre_id === r.id).map((c) => ({ slug: c.slug, nombre: `${r.nombre} › ${c.nombre}` })),
    ]);
}
