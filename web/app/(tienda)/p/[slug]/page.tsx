import { Breadcrumbs } from "@heroui/react";
import type { Metadata } from "next";
import NextLink from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Descripcion } from "@/components/tienda/descripcion";
import { EsqueletoFicha } from "@/components/tienda/esqueletos";
import { Galeria } from "@/components/tienda/galeria";
import { PestanasFicha } from "@/components/tienda/pestanas-ficha";
import { SelectorVariantes } from "@/components/tienda/selector-variantes";
import { obtenerProducto, obtenerSlugsPublicados, type Caracteristica } from "@/lib/catalogo/lecturas";
import { IconoGrupo } from "@/lib/iconos";
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

  // Las 4 primeras especificaciones no-variante van como resumen con íconos junto al precio.
  const principales = p.caracteristicas.filter((c) => !c.esVariante).slice(0, 4);

  return (
    <article className="mx-auto flex max-w-7xl flex-col gap-4 px-3 py-4 sm:px-6 sm:py-6">
      <section className="grid gap-8 rounded-tarjeta border border-border bg-surface p-4 sm:p-8 lg:grid-cols-2 lg:gap-12">
        <Galeria imagenes={p.imagenes} />

        <div className="flex flex-col gap-5">
          <Breadcrumbs>
            <Breadcrumbs.Item href="/catalogo">Productos</Breadcrumbs.Item>
            {p.categoria?.padre && (
              <Breadcrumbs.Item href={`/catalogo?cat=${p.categoria.padre.slug}`}>{p.categoria.padre.nombre}</Breadcrumbs.Item>
            )}
            {p.categoria && <Breadcrumbs.Item href={`/catalogo?cat=${p.categoria.slug}`}>{p.categoria.nombre}</Breadcrumbs.Item>}
          </Breadcrumbs>

          <div className="flex flex-col gap-1">
            {p.marca && (
              <NextLink
                href={`/catalogo?marca=${p.marca.slug}`}
                className="self-start text-xs font-medium uppercase tracking-wider text-muted hover:text-foreground"
              >
                {p.marca.valor}
              </NextLink>
            )}
            <h1 className="text-2xl font-light leading-tight tracking-tight sm:text-3xl">{p.nombre}</h1>
          </div>

          {/* useSearchParams (?variante=) en un client component: requiere su propio Suspense. */}
          <Suspense fallback={<div className="h-64" />}>
            <SelectorVariantes
              nombre={p.nombre}
              url={`${SITIO.url}/p/${p.slug}`}
              precioAnterior={p.precioAnterior}
              grupos={p.gruposVariante}
              variantes={p.variantes}
            />
          </Suspense>

          {principales.length > 0 && (
            <div className="flex flex-col gap-2 border-t border-border pt-5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">Características principales</p>
              <ul className="flex flex-wrap gap-x-6 gap-y-3">
                {principales.map((c) => (
                  <li key={c.grupoSlug} className="flex items-center gap-2 text-sm">
                    <IconoGrupo nombre={c.icono} className="size-4 text-muted" />
                    {c.valores.map((v) => v.valor).join(", ")}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </section>

      <section className="rounded-tarjeta border border-border bg-surface p-4 sm:p-8">
        <PestanasFicha
          descripcion={p.descripcion ? <Descripcion contenido={p.descripcion} /> : null}
          especificaciones={p.caracteristicas.length ? <Especificaciones caracteristicas={p.caracteristicas} /> : null}
        />
      </section>
    </article>
  );
}

function Especificaciones({ caracteristicas }: { caracteristicas: Caracteristica[] }) {
  return (
    <dl className="grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
      {caracteristicas.map((c) => (
        <div key={c.grupoSlug} className="flex gap-3">
          <IconoGrupo nombre={c.icono} className="mt-0.5 size-6 shrink-0" />
          <div className="flex min-w-0 flex-col border-l border-border pl-3">
            <dt className="text-xs text-muted">{c.grupo}</dt>
            <dd className="text-sm font-semibold">
              {c.valores.map((v, i) => (
                <span key={v.slug}>
                  {c.esVariante ? (
                    v.valor
                  ) : (
                    <NextLink href={`/catalogo?${c.grupoSlug}=${v.slug}`} className="hover:underline hover:underline-offset-4">
                      {v.valor}
                    </NextLink>
                  )}
                  {i < c.valores.length - 1 && ", "}
                </span>
              ))}
            </dd>
          </div>
        </div>
      ))}
    </dl>
  );
}
