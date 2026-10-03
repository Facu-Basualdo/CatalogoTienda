import { Breadcrumbs } from "@heroui/react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { JsonLd } from "@/components/json-ld";
import { Descripcion } from "@/components/tienda/descripcion";
import { EsqueletoFicha } from "@/components/tienda/esqueletos";
import { Galeria } from "@/components/tienda/galeria";
import { SelectorCombo } from "@/components/tienda/selector-combo";
import { obtenerCombo, obtenerSlugsCombos } from "@/lib/catalogo/combos";
import { SITIO } from "@/lib/sitio";
import { urlPublica } from "@/lib/supabase/storage";

export async function generateStaticParams() {
  const slugs = await obtenerSlugsCombos();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata(props: PageProps<"/combo/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const c = await obtenerCombo(slug);
  if (!c) return { title: "Combo no encontrado" };
  const imagen = c.imagenes[0];
  return {
    title: c.nombre,
    description: (c.descripcionTexto || `Combo: ${c.items.map((i) => i.nombre).join(" + ")}`).slice(0, 160),
    alternates: { canonical: `/combo/${c.slug}` },
    openGraph: imagen ? { images: [{ url: urlPublica(imagen.path), alt: imagen.alt }] } : undefined,
  };
}

export default function PaginaCombo(props: PageProps<"/combo/[slug]">) {
  return (
    <Suspense fallback={<EsqueletoFicha />}>
      <Ficha params={props.params} />
    </Suspense>
  );
}

async function Ficha({ params }: { params: PageProps<"/combo/[slug]">["params"] }) {
  const { slug } = await params;
  const c = await obtenerCombo(slug);
  if (!c) notFound();

  // Sin imágenes propias, la galería muestra la principal de cada producto.
  const imagenes = c.imagenes.length
    ? c.imagenes
    : c.items.flatMap((i, n) => (i.imagen ? [{ id: `item-${n}`, ...i.imagen, ancho: null, alto: null }] : []));

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: c.nombre,
    description: (c.descripcionTexto || c.items.map((i) => i.nombre).join(" + ")).slice(0, 500),
    image: imagenes.map((i) => urlPublica(i.path)),
    offers: {
      "@type": "Offer",
      priceCurrency: SITIO.moneda,
      price: c.precio,
      availability: c.disponible ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      url: `${SITIO.url}/combo/${c.slug}`,
    },
  };

  return (
    <article className="contenedor flex flex-col gap-4 py-4 sm:py-6">
      <JsonLd datos={jsonLd} />
      <section className="grid gap-8 rounded-tarjeta border border-border bg-surface p-4 sm:p-8 lg:grid-cols-2 lg:gap-12">
        <Galeria imagenes={imagenes} />
        <div className="flex flex-col gap-5">
          <Breadcrumbs>
            <Breadcrumbs.Item href="/combos">Combos</Breadcrumbs.Item>
            <Breadcrumbs.Item>{c.nombre}</Breadcrumbs.Item>
          </Breadcrumbs>
          <div className="flex flex-col gap-1">
            <p className="text-xs font-medium uppercase tracking-wider text-muted">Combo · {c.items.length} productos</p>
            <h1 className="text-2xl font-light leading-tight tracking-tight sm:text-3xl">{c.nombre}</h1>
          </div>
          {c.items.length ? (
            <SelectorCombo id={c.id} nombre={c.nombre} precio={c.precio} precioItems={c.precioItems} items={c.items} />
          ) : (
            <p className="text-muted">Este combo no está disponible.</p>
          )}
        </div>
      </section>

      {!!c.descripcion && (
        <section className="rounded-tarjeta border border-border bg-surface p-4 sm:p-8">
          <h2 className="mb-4 text-lg font-semibold">Descripción</h2>
          <Descripcion contenido={c.descripcion} />
        </section>
      )}
    </article>
  );
}
