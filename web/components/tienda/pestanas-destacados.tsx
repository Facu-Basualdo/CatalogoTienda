"use client";

import { Tabs } from "@heroui/react";

// Pestañas por categoría (estilo chips). Los paneles llegan ya renderizados desde el
// server (tarjetas cacheadas): este componente sólo alterna cuál se ve.
export function PestanasDestacados({ paneles }: { paneles: { id: string; titulo: string; contenido: React.ReactNode }[] }) {
  return (
    <Tabs variant="primary" className="flex flex-col gap-5">
      <Tabs.ListContainer>
        <Tabs.List aria-label="Categorías destacadas" className="min-w-0">
          {paneles.map((p) => (
            <Tabs.Tab key={p.id} id={p.id} className="w-auto px-5">
              {p.titulo}
              <Tabs.Indicator />
            </Tabs.Tab>
          ))}
        </Tabs.List>
      </Tabs.ListContainer>
      {paneles.map((p) => (
        <Tabs.Panel key={p.id} id={p.id}>
          {p.contenido}
        </Tabs.Panel>
      ))}
    </Tabs>
  );
}
