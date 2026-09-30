import NextLink from "next/link";
import { Suspense } from "react";
import { Logo } from "@/components/logo";
import { obtenerCategorias } from "@/lib/catalogo/lecturas";
import { Buscador } from "./buscador";
import { MenuMovil } from "./menu-movil";
import { SelectorTema } from "./selector-tema";

export async function Encabezado() {
  const categorias = await obtenerCategorias();

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6">
        <MenuMovil categorias={categorias} />
        <NextLink href="/" aria-label="Inicio" className="shrink-0">
          <Logo />
        </NextLink>

        <nav aria-label="Categorías" className="ml-6 hidden items-center gap-6 text-sm md:flex">
          <NextLink href="/catalogo" className="text-muted transition-colors hover:text-foreground">
            Todo
          </NextLink>
          {categorias.map((c) => (
            <NextLink
              key={c.id}
              href={`/catalogo?cat=${c.slug}`}
              className="text-muted transition-colors hover:text-foreground"
            >
              {c.nombre}
            </NextLink>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {/* El buscador lee searchParams: va en Suspense para no volver dinámico el layout. */}
          <Suspense fallback={<div className="hidden h-10 w-64 sm:block" />}>
            <Buscador />
          </Suspense>
          <SelectorTema />
        </div>
      </div>
    </header>
  );
}
