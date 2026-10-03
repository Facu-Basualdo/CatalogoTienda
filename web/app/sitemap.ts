import type { MetadataRoute } from "next";
import { obtenerSlugsCombos } from "@/lib/catalogo/combos";
import { obtenerCategorias, obtenerSlugsPublicados } from "@/lib/catalogo/lecturas";
import { SITIO } from "@/lib/sitio";

// Sólo URLs indexables: home, catálogo por categoría, fichas y combos. Los filtros y la
// búsqueda son noindex (ver claude/web/catalogo.md#seo). Las lecturas son las mismas
// cacheadas con tags de la tienda: publicar o borrar un producto actualiza el sitemap.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [productos, combos, categorias] = await Promise.all([obtenerSlugsPublicados(), obtenerSlugsCombos(), obtenerCategorias()]);
  const url = (ruta: string) => `${SITIO.url}${ruta}`;
  return [
    { url: url("/"), changeFrequency: "daily", priority: 1 },
    { url: url("/catalogo"), changeFrequency: "daily", priority: 0.8 },
    { url: url("/ofertas"), changeFrequency: "daily", priority: 0.6 },
    { url: url("/combos"), changeFrequency: "weekly", priority: 0.6 },
    ...categorias.flatMap((c) => [c.slug, ...c.hijas.map((h) => h.slug)]).map((slug) => ({
      url: url(`/catalogo?cat=${slug}`),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    ...productos.map((slug) => ({ url: url(`/p/${slug}`), changeFrequency: "weekly" as const, priority: 0.9 })),
    ...combos.map((slug) => ({ url: url(`/combo/${slug}`), changeFrequency: "weekly" as const, priority: 0.7 })),
  ];
}
