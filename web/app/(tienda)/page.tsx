import { ArrowRight } from "@gravity-ui/icons";
import { linkVariants } from "@heroui/styles";
import NextLink from "next/link";
import { CarruselBanners } from "@/components/tienda/carrusel-banners";
import { GrillaProductos } from "@/components/tienda/tarjeta-producto";
import { obtenerBanners, obtenerCategorias, obtenerDestacados } from "@/lib/catalogo/lecturas";

export default async function Inicio() {
  const [banners, destacados, categorias] = await Promise.all([
    obtenerBanners(),
    obtenerDestacados(8),
    obtenerCategorias(),
  ]);

  return (
    <>
      <CarruselBanners banners={banners} />

      <section className="mx-auto max-w-7xl px-4 pt-16 sm:px-6" aria-labelledby="destacados">
        <div className="mb-8 flex items-end justify-between gap-4">
          <h2 id="destacados" className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Destacados
          </h2>
          <NextLink href="/catalogo" className={`${linkVariants().base()} gap-1 text-sm`}>
            Ver todo <ArrowRight className="size-4" />
          </NextLink>
        </div>
        <GrillaProductos productos={destacados} />
      </section>

      <section className="mx-auto max-w-7xl px-4 pt-20 sm:px-6" aria-labelledby="categorias">
        <h2 id="categorias" className="mb-8 text-2xl font-semibold tracking-tight sm:text-3xl">
          Categorías
        </h2>
        <ul className="grid gap-4 sm:grid-cols-2">
          {categorias.map((c, i) => (
            <li key={c.id}>
              <NextLink
                href={`/catalogo?cat=${c.slug}`}
                className={`group flex aspect-[3/1] flex-col justify-between rounded-[var(--radius)] p-6 transition-opacity hover:opacity-90 ${
                  i % 2 ? "bg-foreground text-background" : "border border-border bg-surface-secondary"
                }`}
              >
                <span className="text-2xl font-semibold tracking-tight">{c.nombre}</span>
                <span className="flex flex-wrap gap-x-3 text-sm opacity-70">
                  {c.hijas.map((h) => (
                    <span key={h.slug}>{h.nombre}</span>
                  ))}
                </span>
              </NextLink>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
