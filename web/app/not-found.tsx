import { buttonVariants } from "@heroui/styles";
import NextLink from "next/link";

export default function NoEncontrado() {
  return (
    <main className="mx-auto flex max-w-xl flex-1 flex-col items-start justify-center gap-4 px-6 py-24">
      <p className="text-sm uppercase tracking-wider text-muted">404</p>
      <h1 className="text-3xl font-semibold tracking-tight">No encontramos esta página</h1>
      <p className="text-muted">Puede que el producto ya no esté publicado o que el link esté mal.</p>
      <NextLink href="/catalogo" className={buttonVariants({ variant: "primary" })}>
        Ir al catálogo
      </NextLink>
    </main>
  );
}
