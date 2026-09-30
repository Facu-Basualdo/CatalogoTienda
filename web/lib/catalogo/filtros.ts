// Único parser y serializador de la URL del catálogo. Todo link de filtro pasa por
// acá. Ver claude/web/etiquetas.md#url-de-filtros

// Si agregás una clave, agregala también al check de grupos_etiqueta.slug.
export const CLAVES_RESERVADAS = ["cat", "q", "orden", "pagina"] as const;

export const ORDENES = {
  relevancia: "Relevancia",
  recientes: "Más recientes",
  "precio-asc": "Menor precio",
  "precio-desc": "Mayor precio",
} as const;
export type Orden = keyof typeof ORDENES;

export const POR_PAGINA = 24;

export type Filtros = {
  cat: string | null;
  q: string | null;
  orden: Orden;
  pagina: number;
  /** grupo-slug → etiqueta-slugs, ordenados y sin repetir (clave de caché estable). */
  etiquetas: Record<string, string[]>;
};

type SearchParams = Record<string, string | string[] | undefined>;

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

function primero(valor: string | string[] | undefined): string | undefined {
  return Array.isArray(valor) ? valor[0] : valor;
}

function normalizarLista(valores: string[]): string[] {
  return [...new Set(valores.filter((v) => SLUG.test(v)))].sort();
}

export function leerFiltros(sp: SearchParams): Filtros {
  const q = primero(sp.q)?.trim().slice(0, 100) || null;
  const ordenCrudo = primero(sp.orden);
  const orden: Orden =
    ordenCrudo && ordenCrudo in ORDENES ? (ordenCrudo as Orden) : q ? "relevancia" : "recientes";
  const pagina = Math.max(1, Math.floor(Number(primero(sp.pagina)) || 1));
  const cat = primero(sp.cat);

  const etiquetas: Record<string, string[]> = {};
  for (const [clave, valor] of Object.entries(sp)) {
    if ((CLAVES_RESERVADAS as readonly string[]).includes(clave) || !SLUG.test(clave) || valor === undefined) continue;
    // Tolera ?talle=m,l y también ?talle=m&talle=l (links viejos o armados a mano).
    const lista = normalizarLista((Array.isArray(valor) ? valor : [valor]).flatMap((v) => v.split(",")));
    if (lista.length) etiquetas[clave] = lista;
  }

  return { cat: cat && SLUG.test(cat) ? cat : null, q, orden, pagina, etiquetas };
}

export function urlDeFiltros(f: Filtros, base = "/catalogo"): string {
  const params = new URLSearchParams();
  if (f.cat) params.set("cat", f.cat);
  if (f.q) params.set("q", f.q);
  for (const grupo of Object.keys(f.etiquetas).sort()) {
    if (f.etiquetas[grupo].length) params.set(grupo, f.etiquetas[grupo].join(","));
  }
  const ordenPorDefecto: Orden = f.q ? "relevancia" : "recientes";
  if (f.orden !== ordenPorDefecto) params.set("orden", f.orden);
  if (f.pagina > 1) params.set("pagina", String(f.pagina));
  const qs = params.toString().replaceAll("%2C", ",");
  return qs ? `${base}?${qs}` : base;
}

/** Cambiar cualquier filtro vuelve a la página 1; si no, se filtra desde la 5 y no hay nada. */
export function conCambios(f: Filtros, cambios: Partial<Omit<Filtros, "pagina">>): Filtros {
  return { ...f, ...cambios, pagina: 1 };
}

export function conGrupo(f: Filtros, grupo: string, slugs: string[]): Filtros {
  const etiquetas = { ...f.etiquetas };
  const lista = normalizarLista(slugs);
  if (lista.length) etiquetas[grupo] = lista;
  else delete etiquetas[grupo];
  return conCambios(f, { etiquetas });
}

export function cantidadDeFiltros(f: Filtros): number {
  return Object.values(f.etiquetas).reduce((n, l) => n + l.length, 0);
}
