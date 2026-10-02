// Réplica de public.slugify (supabase/migrations/*_esquema_inicial.sql). Si cambia una,
// cambia la otra: el dashboard la usa para sugerir slugs y para encontrar una etiqueta
// existente antes de crear un duplicado ("144Hz" → "144-hz").
export function slugify(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/([0-9])([a-z])/g, "$1-$2")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export const SLUG_VALIDO = /^[a-z0-9]+(-[a-z0-9]+)*$/;
