import { Skeleton } from "@heroui/react";
import type { Metadata } from "next";
import { Suspense } from "react";
import { ArbolCategorias } from "@/components/admin/categorias/arbol-categorias";
import { requerirAdmin } from "@/lib/auth";

export const metadata: Metadata = { title: "Categorías" };

// Shell estático + datos en su propio Suspense. Ver claude/web/dashboard.md#páginas-del-panel
export default function PaginaCategorias() {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Categorías</h1>
        <p className="text-sm text-muted">
          Hasta dos niveles. Las principales van en el menú de la tienda; filtrar por una incluye sus subcategorías.
        </p>
      </div>
      <Suspense fallback={<Skeleton className="h-96 rounded-tarjeta" />}>
        <Listado />
      </Suspense>
    </div>
  );
}

async function Listado() {
  const { supabase } = await requerirAdmin();
  const { data, error } = await supabase.from("categorias").select("id, nombre, slug, padre_id, orden, productos(count)");
  if (error) return <p className="text-danger">No se pudieron leer las categorías.</p>;
  return (
    <ArbolCategorias
      categorias={data.map((c) => ({
        id: c.id,
        nombre: c.nombre,
        slug: c.slug,
        padreId: c.padre_id,
        orden: c.orden,
        productos: c.productos[0]?.count ?? 0,
      }))}
    />
  );
}
