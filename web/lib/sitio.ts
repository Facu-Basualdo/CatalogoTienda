// Única fuente del nombre y datos de la tienda. No escribas el nombre literal en
// ningún otro archivo: ver claude/web/tema-y-marca.md
export const SITIO = {
  nombre: "Tienda",
  descripcion: "Catálogo de productos: ropa, electrónica y más.",
  url: process.env.NEXT_PUBLIC_SITIO_URL ?? "http://localhost:3000",
  whatsapp: process.env.NEXT_PUBLIC_WHATSAPP ?? "",
  moneda: "ARS",
  locale: "es-AR",
} as const;
