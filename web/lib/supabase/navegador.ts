import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./database.types";

// Cliente del navegador: login y subida directa de imágenes a Storage desde el dashboard.
export function supabaseNavegador() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
