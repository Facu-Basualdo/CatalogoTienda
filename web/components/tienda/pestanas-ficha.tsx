"use client";

import { Tabs } from "@heroui/react";

// Descripción / Especificaciones. El contenido se renderiza en el server.
export function PestanasFicha({
  descripcion,
  especificaciones,
}: {
  descripcion: React.ReactNode | null;
  especificaciones: React.ReactNode | null;
}) {
  const paneles = [
    especificaciones && { id: "especificaciones", titulo: "Especificaciones", contenido: especificaciones },
    descripcion && { id: "descripcion", titulo: "Descripción", contenido: descripcion },
  ].filter(Boolean) as { id: string; titulo: string; contenido: React.ReactNode }[];

  if (!paneles.length) return null;

  return (
    <Tabs variant="secondary" defaultSelectedKey={especificaciones ? "especificaciones" : "descripcion"} className="flex flex-col gap-6">
      <Tabs.ListContainer>
        <Tabs.List aria-label="Información del producto" className="min-w-0 gap-6">
          {paneles.map((p) => (
            <Tabs.Tab key={p.id} id={p.id} className="w-auto px-1 text-sm font-medium uppercase tracking-wider">
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
