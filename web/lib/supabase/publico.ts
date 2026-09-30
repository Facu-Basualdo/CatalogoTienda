import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

// Cliente del catálogo público: sin cookies, lee como `anon`. Es el único que se
// puede usar dentro de funciones con 'use cache'. Ver claude/web/clientes-supabase.md
export function supabasePublico() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } },
  );
}
