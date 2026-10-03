import { Plus } from "@gravity-ui/icons";
import { Skeleton } from "@heroui/react";
import { buttonVariants } from "@heroui/styles";
import type { Metadata } from "next";
import NextLink from "next/link";
import { Suspense } from "react";
import { ListaGrupos } from "@/components/admin/etiquetas/lista-grupos";
import { Plantillas } from "@/components/admin/etiquetas/plantillas";
import { requerirAdmin } from "@/lib/auth";
import { categoriasParaGrupos, listarGrupos, listarPlantillas } from "@/lib/admin/etiquetas";

export const metadata: Metadata = { title: "Etiquetas" };

// Shell estático + datos en su propio Suspense. Ver claude/web/dashboard.md#páginas-del-panel
export default function PaginaEtiquetas() {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Etiquetas</h1>
          <p className="text-sm text-muted">Los grupos son los filtros del catálogo y las características de la ficha.</p>
        </div>
        <NextLink href="/admin/etiquetas/nuevo" className={buttonVariants()}>
          <Plus />
          Nuevo grupo
        </NextLink>
      </div>
      <Suspense fallback={<Skeleton className="h-96 rounded-tarjeta" />}>
        <Listado />
      </Suspense>
    </div>
  );
}

async function Listado() {
  const { supabase } = await requerirAdmin();
  const [grupos, plantillas, categorias] = await Promise.all([
    listarGrupos(supabase),
    listarPlantillas(supabase),
    categoriasParaGrupos(supabase),
  ]);
  if (!grupos.length) {
    return <p className="rounded-tarjeta border border-border bg-surface p-8 text-center text-muted">Todavía no hay grupos.</p>;
  }
  return (
    <>
      <ListaGrupos grupos={grupos} />
      <Plantillas
        plantillas={plantillas}
        grupos={grupos.filter((g) => !g.esMarca).map((g) => ({ id: g.id, nombre: g.nombre, esVariante: g.esVariante }))}
        categorias={categorias}
      />
    </>
  );
}
