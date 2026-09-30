import type { Metadata } from "next";
import NextLink from "next/link";
import { Suspense } from "react";
import { FormularioLogin } from "@/components/admin/formulario-login";
import { Logo } from "@/components/logo";

export const metadata: Metadata = {
  title: "Ingresar al panel",
  robots: { index: false, follow: false },
};

export default function PaginaLogin() {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="flex w-full max-w-sm flex-col gap-6 rounded-tarjeta border border-border bg-surface p-6 sm:p-8">
        <div className="flex flex-col gap-2">
          <Logo />
          <h1 className="text-xl font-semibold">Panel de administración</h1>
          <p className="text-sm text-muted">Ingresá con tu cuenta de administrador.</p>
        </div>
        {/* useSearchParams (?error=) en un client component: requiere Suspense. */}
        <Suspense>
          <FormularioLogin />
        </Suspense>
        <NextLink href="/" className="text-center text-sm text-muted hover:text-foreground">
          Volver a la tienda
        </NextLink>
      </div>
    </main>
  );
}
