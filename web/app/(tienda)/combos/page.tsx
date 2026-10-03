import type { Metadata } from "next";
import { Suspense } from "react";
import { EsqueletoGrilla } from "@/components/tienda/esqueletos";
import { TarjetaCombo } from "@/components/tienda/tarjeta-combo";
import { buscarCombos } from "@/lib/catalogo/combos";

export const metadata: Metadata = {
  title: "Combos",
  description: "Productos que se llevan juntos a un precio menor.",
};

// Ruta propia: los combos no van en la grilla del catálogo (romperían facetas y paginación).
export default function PaginaCombos() {
  return (
    <div className="contenedor py-6 sm:py-10">
      <header className="mb-6">
        <h1 className="text-3xl font-semibold tracking-tight">Combos</h1>
        <p className="text-sm text-muted">Productos que se llevan juntos a un precio menor. Elegís talle y color de cada uno.</p>
      </header>
      <Suspense fallback={<EsqueletoGrilla />}>
        <Listado />
      </Suspense>
    </div>
  );
}

async function Listado() {
  const { combos } = await buscarCombos(false, 48);
  if (!combos.length) {
    return <p className="rounded-tarjeta bg-surface p-8 text-muted">No hay combos en este momento.</p>;
  }
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 2xl:grid-cols-5">
      {combos.map((c, i) => (
        <li key={c.id}>
          <TarjetaCombo combo={c} prioridad={i < 4} />
        </li>
      ))}
    </ul>
  );
}
