import NextLink from "next/link";
import { Suspense } from "react";
import { AccesoCarrito } from "@/components/carrito/acceso-carrito";
import { Logo } from "@/components/logo";
import { obtenerCategorias } from "@/lib/catalogo/lecturas";
import { Buscador, BuscadorMovil } from "./buscador";
import { MenuMovil } from "./menu-movil";
import { SelectorTema } from "./selector-tema";

// Encabezado oscuro de dos filas (siempre oscuro, también en tema claro):
// 1) logo · buscador ancho · tema · carrito   2) categorías · ofertas
export async function Encabezado() {
  const categorias = await obtenerCategorias();

  return (
    <header className="sticky top-0 z-40 bg-encabezado text-encabezado-foreground [--logo-contraste:var(--encabezado)]">
      <div className="contenedor flex h-16 items-center gap-3 lg:gap-8">
        <MenuMovil categorias={categorias} />
        <NextLink href="/" aria-label="Inicio" className="shrink-0">
          <Logo />
        </NextLink>

        {/* El buscador lee searchParams: va en Suspense para no volver dinámico el layout. */}
        <div className="hidden flex-1 md:block">
          <Suspense fallback={<div className="h-10" />}>
            <Buscador />
          </Suspense>
        </div>

        <div className="ml-auto flex items-center gap-1 md:ml-0">
          <Suspense fallback={null}>
            <BuscadorMovil />
          </Suspense>
          <SelectorTema />
          <AccesoCarrito />
        </div>
      </div>

      <nav aria-label="Categorías" className="hidden border-t border-white/10 md:block">
        <div className="contenedor flex h-11 items-center gap-6 text-sm">
          <NextLink href="/catalogo" className="text-white/75 transition-colors hover:text-white">
            Productos
          </NextLink>
          {categorias.map((c) => (
            <NextLink key={c.id} href={`/catalogo?cat=${c.slug}`} className="text-white/75 transition-colors hover:text-white">
              {c.nombre}
            </NextLink>
          ))}
          <NextLink href="/ofertas" className="text-white/75 transition-colors hover:text-white">
            Ofertas
          </NextLink>
        </div>
      </nav>
    </header>
  );
}
