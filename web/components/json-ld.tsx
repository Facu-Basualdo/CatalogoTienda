// Datos estructurados (schema.org) para buscadores. Se escapa `<`: el JSON lleva textos
// cargados en el panel y, sin esto, un "</script>" en un nombre cerraría el tag.
// Recomendación de next/dist/docs/01-app/02-guides/json-ld.md
export function JsonLd({ datos }: { datos: Record<string, unknown> }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(datos).replace(/</g, "\\u003c") }} />;
}
