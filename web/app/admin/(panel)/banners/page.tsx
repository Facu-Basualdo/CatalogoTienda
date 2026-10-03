import { Plus } from "@gravity-ui/icons";
import { Skeleton } from "@heroui/react";
import { buttonVariants } from "@heroui/styles";
import type { Metadata } from "next";
import NextLink from "next/link";
import { Suspense } from "react";
import { ListaBanners } from "@/components/admin/banners/lista-banners";
import { requerirAdmin } from "@/lib/auth";
import { vigencia } from "@/lib/admin/fechas";

export const metadata: Metadata = { title: "Banners" };

// Shell estático + datos en su propio Suspense. Ver claude/web/dashboard.md#páginas-del-panel
export default function PaginaBanners() {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Banners</h1>
          <p className="text-sm text-muted">El carrusel de la home, en este orden. Cambian solos según sus fechas.</p>
        </div>
        <NextLink href="/admin/banners/nuevo" className={buttonVariants()}>
          <Plus />
          Nuevo banner
        </NextLink>
      </div>
      <Suspense fallback={<Skeleton className="h-72 rounded-tarjeta" />}>
        <Listado />
      </Suspense>
    </div>
  );
}

async function Listado() {
  const { supabase } = await requerirAdmin();
  const { data, error } = await supabase
    .from("banners")
    .select("id, titulo, imagen_path, activo, desde, hasta, orden")
    .order("orden")
    .order("creado_en");
  if (error) return <p className="text-danger">No se pudieron leer los banners.</p>;
  if (!data.length) {
    return (
      <p className="rounded-tarjeta border border-border bg-surface p-8 text-center text-muted">
        Sin banners, la home arranca directo con los destacados.
      </p>
    );
  }
  // eslint-disable-next-line react-hooks/purity -- página dinámica: se calcula en cada pedido.
  const ahora = Date.now();
  return (
    <ListaBanners
      banners={data.map((b) => ({
        id: b.id,
        titulo: b.titulo,
        imagenPath: b.imagen_path,
        activo: b.activo,
        vigencia: vigencia({ activa: b.activo, desde: b.desde, hasta: b.hasta }, ahora),
      }))}
    />
  );
}
