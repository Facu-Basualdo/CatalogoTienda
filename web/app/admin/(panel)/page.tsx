import { Skeleton } from "@heroui/react";
import type { Metadata } from "next";
import NextLink from "next/link";
import { Suspense } from "react";
import { BotonRefrescar } from "@/components/admin/boton-refrescar";
import { requerirAdmin } from "@/lib/auth";

export const metadata: Metadata = { title: "Inicio" };

// Patrón de página del panel: el shell (título y acciones) es estático y todo lo que
// lee la sesión va en un componente dentro de su PROPIO Suspense. El Suspense del
// layout no alcanza: en una navegación el layout no se vuelve a renderizar.
// Ver claude/web/dashboard.md#páginas-del-panel
export default function InicioPanel() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Inicio</h1>
          <p className="text-sm text-muted">Resumen de la tienda.</p>
        </div>
        <BotonRefrescar />
      </div>

      <Suspense fallback={<EsqueletoResumen />}>
        <Resumen />
      </Suspense>

      <p className="rounded-tarjeta border border-dashed border-border p-5 text-sm text-muted">
        &quot;Refrescar tienda&quot; vuelve a leer todo el catálogo. Usalo si cambiaste datos por fuera del panel
        (SQL o scripts); los cambios hechos desde el panel se reflejan solos.
      </p>
    </div>
  );
}

async function Resumen() {
  const { supabase } = await requerirAdmin();

  const [productos, pedidos] = await Promise.all([
    supabase.from("productos").select("publicado, variantes:producto_variantes(stock, activa)"),
    supabase.from("pedidos").select("estado", { count: "exact" }).eq("estado", "pendiente"),
  ]);

  const lista = productos.data ?? [];
  const publicados = lista.filter((p) => p.publicado).length;
  const sinStock = lista.filter((p) => p.publicado && !p.variantes.some((v) => v.activa && v.stock > 0)).length;

  const tarjetas = [
    { titulo: "Productos", valor: lista.length, detalle: `${publicados} visibles en la tienda`, href: "/admin/productos" },
    { titulo: "Sin stock", valor: sinStock, detalle: "Visibles pero sin unidades", href: "/admin/productos?estado=sin-stock" },
    { titulo: "Pedidos pendientes", valor: pedidos.count ?? 0, detalle: "Esperando confirmación", href: "/admin/pedidos?estado=pendiente" },
  ];

  return (
    <ul className="grid gap-4 sm:grid-cols-3">
      {tarjetas.map((t) => (
        <li key={t.titulo}>
          <NextLink href={t.href} className="flex flex-col gap-1 rounded-tarjeta border border-border bg-surface p-5 transition-colors hover:border-muted">
            <p className="text-sm text-muted">{t.titulo}</p>
            <p className="text-3xl font-semibold tabular-nums">{t.valor}</p>
            <p className="text-xs text-muted">{t.detalle}</p>
          </NextLink>
        </li>
      ))}
    </ul>
  );
}

function EsqueletoResumen() {
  return (
    <ul className="grid gap-4 sm:grid-cols-3" aria-busy>
      {[0, 1, 2].map((i) => (
        <li key={i}>
          <Skeleton className="h-28 rounded-tarjeta" />
        </li>
      ))}
    </ul>
  );
}
