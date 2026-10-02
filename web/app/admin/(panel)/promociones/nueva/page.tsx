import { ArrowLeft } from "@gravity-ui/icons";
import { Skeleton } from "@heroui/react";
import type { Metadata } from "next";
import NextLink from "next/link";
import { Suspense } from "react";
import { FormularioPromocion } from "@/components/admin/promociones/formulario-promocion";
import { requerirAdmin } from "@/lib/auth";
import { opcionesAlcance } from "@/lib/admin/promociones";

export const metadata: Metadata = { title: "Nueva promoción" };

export default function PaginaNuevaPromocion() {
  return (
    <div className="flex flex-col gap-5">
      <NextLink href="/admin/promociones" className="flex items-center gap-2 self-start text-sm text-muted hover:text-foreground">
        <ArrowLeft className="size-4" /> Promociones
      </NextLink>
      <h1 className="text-2xl font-semibold tracking-tight">Nueva promoción</h1>
      <Suspense fallback={<Skeleton className="h-96 rounded-tarjeta" />}>
        <Formulario />
      </Suspense>
    </div>
  );
}

async function Formulario() {
  const { supabase } = await requerirAdmin();
  return <FormularioPromocion promocion={null} opciones={await opcionesAlcance(supabase)} />;
}
