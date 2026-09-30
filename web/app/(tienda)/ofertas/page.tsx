import type { Metadata } from "next";
import { Suspense } from "react";
import { EsqueletoGrilla } from "@/components/tienda/esqueletos";
import { GrillaProductos } from "@/components/tienda/tarjeta-producto";
import { SelectorVista } from "@/components/tienda/vista-listado";
import { obtenerOfertas } from "@/lib/catalogo/lecturas";

export const metadata: Metadata = {
  title: "Ofertas",
  description: "Productos con precio rebajado.",
};

// Ruta propia y no un filtro del catálogo: "ofertas" como clave de URL sería otra
// clave reservada que ningún grupo de etiquetas podría usar.
export default function PaginaOfertas() {
  return (
    <div className="mx-auto max-w-7xl px-3 py-6 sm:px-6 sm:py-10">
      <header className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Ofertas</h1>
          <p className="text-sm text-muted">Productos con precio rebajado.</p>
        </div>
        <SelectorVista />
      </header>
      <Suspense fallback={<EsqueletoGrilla />}>
        <Listado />
      </Suspense>
    </div>
  );
}

async function Listado() {
  const { productos } = await obtenerOfertas(48);
  if (!productos.length) {
    return <p className="rounded-tarjeta bg-surface p-8 text-muted">No hay ofertas en este momento.</p>;
  }
  return <GrillaProductos productos={productos} prioridad={4} />;
}
