import { redirect } from "next/navigation";
import { supabaseServidor } from "@/lib/supabase/servidor";

// Guard de las páginas de /admin. Es UX: la seguridad real es RLS con es_admin().
// Ver claude/supabase/seguridad-rls.md
export async function requerirAdmin() {
  const supabase = await supabaseServidor();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) redirect("/admin/login");

  const { data: esAdmin } = await supabase.rpc("es_admin");
  if (!esAdmin) redirect("/admin/login?error=sin-permiso");

  return { supabase, email: data.claims.email as string | undefined };
}
