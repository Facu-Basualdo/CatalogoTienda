import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "./database.types";

// Cliente con la sesión del admin (cookies). Sólo en /admin: leer cookies vuelve
// dinámica la ruta. Crear uno nuevo por request. Ver claude/web/clientes-supabase.md
export async function supabaseServidor() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Llamado desde un Server Component: no puede escribir cookies. El proxy
            // ya refrescó la sesión, así que se puede ignorar.
          }
        },
      },
    },
  );
}
