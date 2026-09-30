export const BUCKET = "catalogo";

// La base guarda paths (`productos/{id}/{uuid}.webp`), nunca URLs.
// Ver claude/supabase/imagenes.md
export function urlPublica(path: string): string {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}`;
}
