import { ArrowLeft } from "@gravity-ui/icons";
import { Skeleton } from "@heroui/react";
import type { Metadata } from "next";
import NextLink from "next/link";
import { Suspense } from "react";
import { FormularioBanner } from "@/components/admin/banners/formulario-banner";
import { requerirAdmin } from "@/lib/auth";

export const metadata: Metadata = { title: "Nuevo banner" };

export default function PaginaNuevoBanner() {
  return (
    <div className="flex flex-col gap-5">
      <NextLink href="/admin/banners" className="flex items-center gap-2 self-start text-sm text-muted hover:text-foreground">
        <ArrowLeft className="size-4" /> Banners
      </NextLink>
      <h1 className="text-2xl font-semibold tracking-tight">Nuevo banner</h1>
      <Suspense fallback={<Skeleton className="h-96 rounded-tarjeta" />}>
        <Formulario />
      </Suspense>
    </div>
  );
}

// El id se genera acá (después de leer la sesión): las imágenes necesitan su carpeta
// `banners/{id}/` antes de que exista la fila.
async function Formulario() {
  await requerirAdmin();
  const id = crypto.randomUUID();
  return (
    <FormularioBanner
      nuevo
      banner={{
        id,
        titulo: null,
        subtitulo: null,
        textoBoton: null,
        enlace: null,
        imagenPath: "",
        imagenMobilePath: null,
        textoClaro: false,
        activo: true,
        desde: null,
        hasta: null,
      }}
    />
  );
}
