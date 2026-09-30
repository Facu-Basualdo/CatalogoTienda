"use client";

import { Funnel } from "@gravity-ui/icons";
import { Button, Checkbox, CheckboxGroup, Drawer, Label, Spinner } from "@heroui/react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { cantidadDeFiltros, conGrupo, urlDeFiltros, type Filtros } from "@/lib/catalogo/filtros";
import type { Faceta } from "@/lib/catalogo/lecturas";

// Facetas del RPC facetas_productos: nunca se cuentan en el cliente.
// Ver claude/web/etiquetas.md#panel-de-filtros
function GruposDeFacetas({
  facetas,
  filtros,
  onCambio,
}: {
  facetas: Faceta[];
  filtros: Filtros;
  onCambio: (grupo: string, slugs: string[]) => void;
}) {
  if (!facetas.length) return <p className="text-sm text-muted">No hay filtros para estos resultados.</p>;

  return (
    <div className="flex flex-col gap-8">
      {facetas.map((f) => (
        <CheckboxGroup
          key={f.slug}
          name={f.slug}
          value={filtros.etiquetas[f.slug] ?? []}
          onChange={(valores) => onCambio(f.slug, valores)}
          className="flex flex-col gap-3"
        >
          <Label className="text-sm font-semibold">{f.nombre}</Label>
          {f.opciones.map((o) => (
            // Seleccionada con 0 resultados: se muestra deshabilitada para poder entender por qué no hay nada.
            <Checkbox key={o.slug} value={o.slug} isDisabled={o.cantidad === 0 && !o.seleccionada}>
              <Checkbox.Content className="w-full">
                <Checkbox.Control>
                  <Checkbox.Indicator />
                </Checkbox.Control>
                <span className="flex flex-1 items-center gap-2 text-sm">
                  {o.colorHex && (
                    <span
                      aria-hidden
                      className="size-3.5 rounded-full ring-1 ring-muted/60"
                      style={{ backgroundColor: o.colorHex }}
                    />
                  )}
                  {o.valor}
                  <span className="ml-auto text-xs tabular-nums text-muted">{o.cantidad}</span>
                </span>
              </Checkbox.Content>
            </Checkbox>
          ))}
        </CheckboxGroup>
      ))}
    </div>
  );
}

export function PanelFiltros({ facetas, filtros }: { facetas: Faceta[]; filtros: Filtros }) {
  const router = useRouter();
  const [pendiente, iniciar] = useTransition();
  const navegar = (f: Filtros) => iniciar(() => router.replace(urlDeFiltros(f), { scroll: false }));

  return (
    // Desktop: columna lateral, cada cambio navega.
    <aside className="hidden w-60 shrink-0 lg:block" aria-label="Filtros" aria-busy={pendiente}>
      <div className="sticky top-24 flex flex-col gap-6">
        <div className="flex h-6 items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider">Filtrar</h2>
          {pendiente && <Spinner size="sm" color="current" />}
        </div>
        <GruposDeFacetas facetas={facetas} filtros={filtros} onCambio={(g, s) => navegar(conGrupo(filtros, g, s))} />
      </div>
    </aside>
  );
}

// Mobile: botón + Drawer. Va en la barra de herramientas, no como columna del layout.
export function BotonFiltrosMovil({ facetas, filtros }: { facetas: Faceta[]; filtros: Filtros }) {
  const router = useRouter();
  const [, iniciar] = useTransition();
  const [abierto, setAbierto] = useState(false);
  // Los cambios se acumulan y se aplican con "Ver resultados": cada tilde sería una
  // navegación y en mobile se siente trabado.
  const [borrador, setBorrador] = useState(filtros);
  const navegar = (f: Filtros) => iniciar(() => router.replace(urlDeFiltros(f), { scroll: false }));
  const cantidad = cantidadDeFiltros(filtros);

  return (
    <>
      <div className="lg:hidden">
        <Button
          variant="outline"
          size="sm"
          onPress={() => {
            setBorrador(filtros);
            setAbierto(true);
          }}
        >
          <Funnel />
          Filtros{cantidad ? ` (${cantidad})` : ""}
        </Button>
        <Drawer.Backdrop isOpen={abierto} onOpenChange={setAbierto}>
          <Drawer.Content placement="right">
            <Drawer.Dialog>
              <Drawer.CloseTrigger />
              <Drawer.Header>
                <Drawer.Heading>Filtros</Drawer.Heading>
              </Drawer.Header>
              <Drawer.Body>
                <GruposDeFacetas
                  facetas={facetas}
                  filtros={borrador}
                  onCambio={(g, s) => setBorrador((b) => conGrupo(b, g, s))}
                />
              </Drawer.Body>
              <Drawer.Footer className="flex gap-2">
                <Button variant="ghost" onPress={() => setBorrador({ ...borrador, etiquetas: {}, pagina: 1 })}>
                  Limpiar
                </Button>
                <Button
                  fullWidth
                  onPress={() => {
                    setAbierto(false);
                    navegar(borrador);
                  }}
                >
                  Ver resultados
                </Button>
              </Drawer.Footer>
            </Drawer.Dialog>
          </Drawer.Content>
        </Drawer.Backdrop>
      </div>
    </>
  );
}
