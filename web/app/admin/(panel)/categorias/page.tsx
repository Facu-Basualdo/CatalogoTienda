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
          Hasta dos niveles. Las principales van en el menú de la tienda; filtrar por una incluye sus subcategorías. Cada
          categoría elige qué características se cargan en sus productos.
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
  const [{ data, error }, { data: grupos }, { data: plantillas }] = await Promise.all([
    supabase
      .from("categorias")
      .select("id, nombre, slug, padre_id, orden, productos(count), categoria_grupos(grupo_id), categoria_plantillas(plantilla_id)"),
    supabase.from("grupos_etiqueta").select("id, nombre, es_variante, es_marca, orden").eq("es_marca", false).order("orden"),
    supabase.from("plantillas").select("id, nombre, plantilla_grupos(grupo_id)").order("nombre"),
  ]);
  if (error) return <p className="text-danger">No se pudieron leer las categorías.</p>;
  return (
    <ArbolCategorias
      grupos={(grupos ?? []).map((g) => ({ id: g.id, nombre: g.nombre, esVariante: g.es_variante }))}
      plantillas={(plantillas ?? []).map((p) => ({ id: p.id, nombre: p.nombre, grupoIds: p.plantilla_grupos.map((g) => g.grupo_id) }))}
      categorias={data.map((c) => ({
        grupoIds: c.categoria_grupos.map((g) => g.grupo_id),
        plantillaIds: c.categoria_plantillas.map((p) => p.plantilla_id),
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
