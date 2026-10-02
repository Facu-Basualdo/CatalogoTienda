// Tags de caché del catálogo. Qué lectura lleva cuál y qué mutación invalida cuál:
// claude/web/cache-y-revalidacion.md#tags. No escribas los strings a mano.
export const TAGS = {
  productos: "productos",
  producto: (slug: string) => `producto:${slug}`,
  facetas: "facetas",
  etiquetas: "etiquetas",
  categorias: "categorias",
  banners: "banners",
  promociones: "promociones",
} as const;
