import { Breadcrumbs } from "@heroui/react";
import type { Metadata } from "next";
import NextLink from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Descripcion } from "@/components/tienda/descripcion";
import { EsqueletoFicha } from "@/components/tienda/esqueletos";
import { Galeria } from "@/components/tienda/galeria";
import { SelectorVariantes } from "@/components/tienda/selector-variantes";
import { obtenerProducto, obtenerSlugsPublicados } from "@/lib/catalogo/lecturas";
import { SITIO } from "@/lib/sitio";
import { urlPublica } from "@/lib/supabase/storage";

export async function generateStaticParams() {
  const slugs = await obtenerSlugsPublicados();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata(props: PageProps<"/p/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const p = await obtenerProducto(slug);
  if (!p) return { title: "Producto no encontrado" };
  const imagen = p.imagenes[0];
  return {
    title: p.nombre,
    description: p.descripcionTexto.slice(0, 160),
    alternates: { canonical: `/p/${p.slug}` },
    openGraph: imagen ? { images: [{ url: urlPublica(imagen.path), alt: imagen.alt }] } : undefined,
  };
}

export default function PaginaProducto(props: PageProps<"/p/[slug]">) {
  // params se lee dentro del Suspense (patrón de Cache Components para rutas dinámicas).
  return (
    <Suspense fallback={<EsqueletoFicha />}>
      <Ficha params={props.params} />
    </Suspense>
  );
}

async function Ficha({ params }: { params: PageProps<"/p/[slug]">["params"] }) {
  const { slug } = await params;
  const p = await obtenerProducto(slug);
  if (!p) notFound();

  const url = `${SITIO.url}/p/${p.slug}`;

  return (
    <article className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-10">
      <Breadcrumbs className="mb-6">
        <Breadcrumbs.Item href="/catalogo">Catálogo</Breadcrumbs.Item>
        {p.categoria?.padre && (
          <Breadcrumbs.Item href={`/catalogo?cat=${p.categoria.padre.slug}`}>{p.categoria.padre.nombre}</Breadcrumbs.Item>
        )}
        {p.categoria && <Breadcrumbs.Item href={`/catalogo?cat=${p.categoria.slug}`}>{p.categoria.nombre}</Breadcrumbs.Item>}
        <Breadcrumbs.Item>{p.nombre}</Breadcrumbs.Item>
      </Breadcrumbs>

      <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
        <Galeria imagenes={p.imagenes} />

        <div className="flex flex-col gap-8">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{p.nombre}</h1>

          {/* useSearchParams (?variante=) en un client component: requiere su propio Suspense. */}
          <Suspense fallback={<div className="h-40" />}>
            <SelectorVariantes
              nombre={p.nombre}
              url={url}
              precioAnterior={p.precioAnterior}
              grupos={p.gruposVariante}
              variantes={p.variantes}
            />
          </Suspense>

          {p.caracteristicas.length > 0 && (
            <section aria-labelledby="caracteristicas" className="flex flex-col gap-3">
              <h2 id="caracteristicas" className="text-sm font-semibold uppercase tracking-wider">
                Características
              </h2>
              <dl className="divide-y divide-border border-y border-border text-sm">
                {p.caracteristicas.map((c) => (
                  <div key={c.grupoSlug} className="grid grid-cols-[10rem_1fr] gap-4 py-2.5">
                    <dt className="text-muted">{c.grupo}</dt>
                    <dd className="flex flex-wrap gap-x-2">
                      {c.valores.map((v, i) => (
                        <span key={v.slug}>
                          <NextLink
                            href={`/catalogo?${c.grupoSlug}=${v.slug}`}
                            className="underline decoration-border underline-offset-4 hover:decoration-foreground"
                          >
                            {v.valor}
                          </NextLink>
                          {i < c.valores.length - 1 && ","}
                        </span>
                      ))}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          )}

        </div>
      </div>

      {p.descripcion ? (
        <section aria-labelledby="descripcion" className="mt-16 max-w-3xl">
          <h2 id="descripcion" className="mb-4 text-sm font-semibold uppercase tracking-wider">
            Descripción
          </h2>
          <Descripcion contenido={p.descripcion} />
        </section>
      ) : null}
    </article>
  );
}
