import { ChevronLeft, Xmark } from "@gravity-ui/icons";
import { buttonVariants, chipVariants } from "@heroui/styles";
import type { Metadata } from "next";
import NextLink from "next/link";
import { Suspense } from "react";
import { BotonFiltrosMovil, PanelFiltros } from "@/components/tienda/filtros/panel-filtros";
import { SelectorOrden } from "@/components/tienda/filtros/selector-orden";
import { Paginacion } from "@/components/tienda/paginacion";
import { GrillaProductos } from "@/components/tienda/tarjeta-producto";
import { EsqueletoCatalogo } from "@/components/tienda/esqueletos";
import { SelectorVista } from "@/components/tienda/vista-listado";
import { conCambios, conGrupo, leerFiltros, urlDeFiltros, type Filtros } from "@/lib/catalogo/filtros";
import { buscarProductos, obtenerCategorias, obtenerFacetas, type Categoria } from "@/lib/catalogo/lecturas";

export async function generateMetadata(props: PageProps<"/catalogo">): Promise<Metadata> {
  const filtros = leerFiltros(await props.searchParams);
  const categoria = buscarCategoria(await obtenerCategorias(), filtros.cat);
  const titulo = filtros.q ? `Resultados para “${filtros.q}”` : (categoria?.nombre ?? "Catálogo");
  // Las combinaciones de filtros no se indexan: sólo la categoría limpia.
  const indexable = !filtros.q && Object.keys(filtros.etiquetas).length === 0 && filtros.pagina === 1;
  return {
    title: titulo,
    alternates: { canonical: urlDeFiltros({ ...filtros, etiquetas: {}, q: null, pagina: 1 }) },
    robots: indexable ? undefined : { index: false, follow: true },
  };
}

export default function PaginaCatalogo(props: PageProps<"/catalogo">) {
  // searchParams se lee dentro del Suspense: así el resto del layout queda en el shell estático.
  return (
    <Suspense fallback={<EsqueletoCatalogo />}>
      <Catalogo searchParams={props.searchParams} />
    </Suspense>
  );
}

function buscarCategoria(categorias: Categoria[], slug: string | null) {
  if (!slug) return null;
  for (const c of categorias) {
    if (c.slug === slug) return { ...c, padre: null as Categoria | null };
    const hija = c.hijas.find((h) => h.slug === slug);
    if (hija) return { id: "", slug: hija.slug, nombre: hija.nombre, hijas: [], padre: c };
  }
  return null;
}

async function Catalogo({ searchParams }: { searchParams: PageProps<"/catalogo">["searchParams"] }) {
  const filtros = leerFiltros(await searchParams);
  const [resultado, facetas, categorias] = await Promise.all([
    buscarProductos(filtros),
    obtenerFacetas(filtros),
    obtenerCategorias(),
  ]);

  const categoria = buscarCategoria(categorias, filtros.cat);
  const titulo = filtros.q ? `Resultados para “${filtros.q}”` : (categoria?.nombre ?? "Catálogo");
  // Subcategorías para navegar: las hijas de la actual, o las hermanas si es hija.
  const subcategorias = categoria?.padre ? categoria.padre.hijas : (categoria?.hijas ?? []);
  const fueraDeRango = resultado.total > 0 && filtros.pagina > resultado.paginas;

  return (
    <div className="mx-auto max-w-7xl px-3 py-5 sm:px-6 sm:py-8">
      <header className="mb-6 flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-3 border-b border-border pb-4">
          <NextLink
            href={categoria?.padre ? urlDeFiltros(conCambios(filtros, { cat: categoria.padre.slug })) : "/"}
            aria-label={categoria?.padre ? `Volver a ${categoria.padre.nombre}` : "Volver al inicio"}
            className={buttonVariants({ variant: "ghost", size: "sm", isIconOnly: true })}
          >
            <ChevronLeft />
          </NextLink>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-2xl font-semibold tracking-tight sm:text-3xl">{titulo}</h1>
            <p className="text-sm text-muted">
              {resultado.total} {resultado.total === 1 ? "producto" : "productos"}
            </p>
          </div>
          <div className="flex w-full items-center gap-2 sm:w-auto">
            <BotonFiltrosMovil facetas={facetas} filtros={filtros} />
            <div className="ml-auto flex items-center gap-2">
              <SelectorOrden filtros={filtros} />
              <SelectorVista />
            </div>
          </div>
        </div>
        {subcategorias.length > 0 && (
          <nav aria-label="Subcategorías" className="flex flex-wrap gap-2">
            {subcategorias.map((s) => (
              <NextLink
                key={s.slug}
                href={urlDeFiltros(conCambios(filtros, { cat: s.slug }))}
                aria-current={s.slug === filtros.cat ? "page" : undefined}
                className={buttonVariants({ size: "sm", variant: s.slug === filtros.cat ? "primary" : "outline" })}
              >
                {s.nombre}
              </NextLink>
            ))}
          </nav>
        )}
      </header>

      <div className="flex gap-6">
        <PanelFiltros facetas={facetas} filtros={filtros} />

        <section className="flex min-w-0 flex-1 flex-col gap-5" aria-label="Productos">
          <FiltrosActivos filtros={filtros} facetas={facetas} />

          {resultado.productos.length > 0 ? (
            <GrillaProductos productos={resultado.productos} prioridad={filtros.pagina === 1 ? 4 : 0} />
          ) : (
            <SinResultados filtros={filtros} fueraDeRango={fueraDeRango} />
          )}

          <Paginacion filtros={filtros} paginas={resultado.paginas} />
        </section>
      </div>
    </div>
  );
}

function FiltrosActivos({ filtros, facetas }: { filtros: Filtros; facetas: Awaited<ReturnType<typeof obtenerFacetas>> }) {
  const activos = Object.entries(filtros.etiquetas).flatMap(([grupo, slugs]) =>
    slugs.map((slug) => {
      const opcion = facetas.find((f) => f.slug === grupo)?.opciones.find((o) => o.slug === slug);
      return { grupo, slug, valor: opcion?.valor ?? slug };
    }),
  );
  if (!activos.length && !filtros.q) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {filtros.q && (
        <NextLink href={urlDeFiltros(conCambios(filtros, { q: null }))} className={`${chipVariants({ variant: "secondary" }).base()} gap-1`}>
          “{filtros.q}” <Xmark aria-label="Quitar búsqueda" className="size-3" />
        </NextLink>
      )}
      {activos.map((a) => (
        <NextLink
          key={`${a.grupo}-${a.slug}`}
          href={urlDeFiltros(conGrupo(filtros, a.grupo, filtros.etiquetas[a.grupo].filter((s) => s !== a.slug)))}
          className={`${chipVariants({ variant: "secondary" }).base()} gap-1`}
        >
          {a.valor} <Xmark aria-label={`Quitar ${a.valor}`} className="size-3" />
        </NextLink>
      ))}
      {activos.length > 1 && (
        <NextLink href={urlDeFiltros(conCambios(filtros, { etiquetas: {} }))} className="text-sm text-muted underline underline-offset-4 hover:text-foreground">
          Limpiar filtros
        </NextLink>
      )}
    </div>
  );
}

function SinResultados({ filtros, fueraDeRango }: { filtros: Filtros; fueraDeRango: boolean }) {
  return (
    <div className="flex flex-col items-start gap-4 rounded-tarjeta border border-border bg-surface p-8">
      <p className="font-medium">{fueraDeRango ? "Esta página no existe." : "No hay productos con estos filtros."}</p>
      <NextLink
        href={urlDeFiltros(fueraDeRango ? { ...filtros, pagina: 1 } : conCambios(filtros, { etiquetas: {}, q: null }))}
        className={buttonVariants({ variant: "outline", size: "sm" })}
      >
        {fueraDeRango ? "Ir a la primera página" : "Quitar filtros"}
      </NextLink>
    </div>
  );
}
