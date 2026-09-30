import { ArrowRightFromSquare, ArrowUpRightFromSquare } from "@gravity-ui/icons";
import { Button, Form, Skeleton } from "@heroui/react";
import type { Metadata } from "next";
import NextLink from "next/link";
import { Suspense } from "react";
import { NavegacionLateral, NavegacionMovil } from "@/components/admin/navegacion-admin";
import { Logo } from "@/components/logo";
import { requerirAdmin } from "@/lib/auth";
import { cerrarSesion } from "../acciones";

export const metadata: Metadata = {
  title: { default: "Panel", template: "%s · Panel" },
  robots: { index: false, follow: false },
};

// El chequeo de admin lee cookies (API de runtime): con Cache Components tiene que
// estar dentro de un Suspense. El shell (barra y navegación) es estático.
export default function LayoutPanel({ children }: LayoutProps<"/admin">) {
  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-40 bg-encabezado text-encabezado-foreground [--logo-contraste:var(--encabezado)]">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-3 sm:px-6">
          <NavegacionMovil />
          <NextLink href="/admin" className="flex items-center gap-3">
            <Logo />
            <span className="hidden rounded-md bg-white/10 px-2 py-0.5 text-xs font-medium sm:inline">Panel</span>
          </NextLink>
          <div className="ml-auto flex items-center gap-1">
            <NextLink
              href="/"
              target="_blank"
              className="hidden items-center gap-2 rounded-xl px-3 py-2 text-sm text-white/75 hover:text-white sm:flex"
            >
              Ver tienda <ArrowUpRightFromSquare className="size-3.5" aria-hidden />
            </NextLink>
            <Suspense fallback={null}>
              <Usuario />
            </Suspense>
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-7xl flex-1 gap-6 px-3 py-5 sm:px-6 sm:py-6">
        <NavegacionLateral />
        <main className="min-w-0 flex-1">
          <Suspense fallback={<Skeleton className="h-64 w-full rounded-tarjeta" />}>
            <Guardia>{children}</Guardia>
          </Suspense>
        </main>
      </div>
    </div>
  );
}

// UX: redirige a /admin/login si no hay sesión de admin. La seguridad real es RLS.
async function Guardia({ children }: { children: React.ReactNode }) {
  await requerirAdmin();
  return children;
}

async function Usuario() {
  const { email } = await requerirAdmin();
  return (
    <div className="flex items-center gap-2">
      <span className="hidden max-w-48 truncate text-sm text-white/60 md:inline">{email}</span>
      <Form action={cerrarSesion}>
        <Button type="submit" isIconOnly variant="ghost" aria-label="Cerrar sesión" className="text-encabezado-foreground">
          <ArrowRightFromSquare />
        </Button>
      </Form>
    </div>
  );
}
