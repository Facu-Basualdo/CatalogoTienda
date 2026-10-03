import { ArrowLeft } from "@gravity-ui/icons";
import { Skeleton } from "@heroui/react";
import type { Metadata } from "next";
import NextLink from "next/link";
import { Suspense } from "react";
import { FormularioCupon } from "@/components/admin/cupones/formulario-cupon";
import { requerirAdmin } from "@/lib/auth";

export const metadata: Metadata = { title: "Nuevo cupón" };

export default function PaginaNuevoCupon() {
  return (
    <div className="flex flex-col gap-5">
      <NextLink href="/admin/cupones" className="flex items-center gap-2 self-start text-sm text-muted hover:text-foreground">
        <ArrowLeft className="size-4" /> Cupones
      </NextLink>
      <h1 className="text-2xl font-semibold tracking-tight">Nuevo cupón</h1>
      <Suspense fallback={<Skeleton className="h-96 rounded-tarjeta" />}>
        <Formulario />
      </Suspense>
    </div>
  );
}

// La sesión se lee dentro del Suspense (ver claude/web/dashboard.md#páginas-del-panel).
async function Formulario() {
  await requerirAdmin();
  return <FormularioCupon cupon={null} />;
}
