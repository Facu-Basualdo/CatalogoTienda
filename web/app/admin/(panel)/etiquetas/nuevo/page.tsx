import { ArrowLeft } from "@gravity-ui/icons";
import { Skeleton } from "@heroui/react";
import type { Metadata } from "next";
import NextLink from "next/link";
import { Suspense } from "react";
import { FormularioGrupo } from "@/components/admin/etiquetas/formulario-grupo";
import { requerirAdmin } from "@/lib/auth";

export const metadata: Metadata = { title: "Nuevo grupo" };

export default function PaginaNuevoGrupo() {
  return (
    <div className="flex flex-col gap-5">
      <NextLink href="/admin/etiquetas" className="flex items-center gap-2 self-start text-sm text-muted hover:text-foreground">
        <ArrowLeft className="size-4" /> Etiquetas
      </NextLink>
      <h1 className="text-2xl font-semibold tracking-tight">Nuevo grupo</h1>
      <Suspense fallback={<Skeleton className="h-96 rounded-tarjeta" />}>
        <Formulario />
      </Suspense>
    </div>
  );
}

async function Formulario() {
  await requerirAdmin();
  return <FormularioGrupo grupo={null} />;
}
