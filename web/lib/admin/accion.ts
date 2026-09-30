import "server-only";

import { supabaseServidor } from "@/lib/supabase/servidor";

// Patrón de Server Action del dashboard. Ver claude/web/dashboard.md
//   1. adminParaAccion() → cliente con la sesión, o error si no es admin
//   2. validar la entrada (Zod)
//   3. escribir con ese cliente (RLS vuelve a exigir es_admin: la seguridad real)
//   4. updateTag de lo que cambió
//   5. devolver Resultado; nunca lanzar al cliente
export type Resultado<T = undefined> = { ok: true; datos: T } | { ok: false; error: string };

export const ok = <T>(datos: T): Resultado<T> => ({ ok: true, datos });
export const fallo = (error: string): Resultado<never> => ({ ok: false, error });

export async function adminParaAccion() {
  const supabase = await supabaseServidor();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) return { supabase: null, error: "Tu sesión venció. Volvé a iniciar sesión." } as const;
  const { data: esAdmin } = await supabase.rpc("es_admin");
  if (!esAdmin) return { supabase: null, error: "Tu usuario no tiene permisos de administrador." } as const;
  return { supabase, error: null } as const;
}
