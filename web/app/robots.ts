import type { MetadataRoute } from "next";
import { SITIO } from "@/lib/sitio";

// El panel y el carrito no tienen nada que indexar. Las variantes de /catalogo con
// filtros se resuelven con noindex en la página, no acá: los links tienen que seguirse.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/carrito"] },
    sitemap: `${SITIO.url}/sitemap.xml`,
  };
}
