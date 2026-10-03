import type { GrupoVariante, VarianteFicha } from "./lecturas";

// Reglas compartidas por el selector de la ficha y el del combo.
// Ver claude/web/variantes-y-stock.md#selector-en-la-ficha
// - nunca se ocultan opciones: agotada = tachada y elegible, inexistente = deshabilitada
// - la disponibilidad se calcula contra lo ya elegido en los otros grupos
// `minimo`: unidades que hacen falta (en un combo, la cantidad del ítem).

export type EstadoOpcion = "ok" | "agotada" | "inexistente";

const combinacion = (variantes: VarianteFicha[], grupos: GrupoVariante[], deseadas: Record<string, string>) =>
  variantes.find((v) => grupos.every((g) => v.opciones[g.slug] === deseadas[g.slug]));

export function varianteInicial(variantes: VarianteFicha[], id: string | null, minimo = 1) {
  return variantes.find((v) => v.id === id) ?? variantes.find((v) => v.stock >= minimo) ?? variantes[0];
}

/** Variante a la que lleva elegir `slug` en `grupo`: la combinación exacta o, si no existe, la primera con stock. */
export function varianteAlElegir(
  variantes: VarianteFicha[],
  grupos: GrupoVariante[],
  actual: VarianteFicha,
  grupo: string,
  slug: string,
  minimo = 1,
) {
  return (
    combinacion(variantes, grupos, { ...actual.opciones, [grupo]: slug }) ??
    variantes.find((v) => v.opciones[grupo] === slug && v.stock >= minimo) ??
    variantes.find((v) => v.opciones[grupo] === slug)
  );
}

export function estadoOpcion(
  variantes: VarianteFicha[],
  grupos: GrupoVariante[],
  actual: VarianteFicha,
  grupo: string,
  slug: string,
  minimo = 1,
): EstadoOpcion {
  const v = combinacion(variantes, grupos, { ...actual.opciones, [grupo]: slug });
  if (!v) return "inexistente";
  return v.stock >= minimo ? "ok" : "agotada";
}
