"use client";

import { Funnel } from "@gravity-ui/icons";
import { Button, Checkbox, CheckboxGroup, Drawer, Label, ScrollShadow, Spinner } from "@heroui/react";
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
    <div className="flex flex-col divide-y divide-separator">
      {facetas.map((f) => (
        <GrupoFaceta key={f.slug} faceta={f} valores={filtros.etiquetas[f.slug] ?? []} onCambio={onCambio} />
      ))}
    </div>
  );
}

const VISIBLES = 5;

// Grupos largos (talles, marcas) muestran 5 opciones y "Ver más". Si hay una
// seleccionada entre las ocultas, el grupo arranca expandido: si no, el filtro activo
// no se ve y parece que no hay ninguno.
function GrupoFaceta({
  faceta: f,
  valores,
  onCambio,
}: {
  faceta: Faceta;
  valores: string[];
  onCambio: (grupo: string, slugs: string[]) => void;
}) {
  const ocultaSeleccionada = f.opciones.slice(VISIBLES).some((o) => o.seleccionada);
  const [expandido, setExpandido] = useState(ocultaSeleccionada);
  const opciones = expandido ? f.opciones : f.opciones.slice(0, VISIBLES);

  return (
    <div className="flex flex-col gap-3 py-5 first:pt-0 last:pb-0">
      <CheckboxGroup name={f.slug} value={valores} onChange={(v) => onCambio(f.slug, v)} className="flex flex-col gap-2.5">
        <Label className="text-sm font-semibold">{f.nombre}</Label>
        {opciones.map((o) => (
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
      {f.opciones.length > VISIBLES && (
        <Button variant="ghost" size="sm" className="self-start px-0 underline underline-offset-4" onPress={() => setExpandido((e) => !e)}>
          {expandido ? "Ver menos" : `Ver más (${f.opciones.length - VISIBLES})`}
        </Button>
      )}
    </div>
  );
}

export function PanelFiltros({ facetas, filtros }: { facetas: Faceta[]; filtros: Filtros }) {
  const router = useRouter();
  const [pendiente, iniciar] = useTransition();
  const navegar = (f: Filtros) => iniciar(() => router.replace(urlDeFiltros(f), { scroll: false }));

  return (
    // Desktop: columna lateral, cada cambio navega.
    <aside className="hidden w-64 shrink-0 lg:block" aria-label="Filtros" aria-busy={pendiente}>
      <div className="sticky top-32 flex max-h-[calc(100vh-9rem)] flex-col gap-5 rounded-tarjeta border border-border bg-surface py-5 pl-5 pr-2">
        <div className="flex h-6 items-center justify-between pr-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider">Filtrar</h2>
          {pendiente && <Spinner size="sm" color="current" />}
        </div>
        {/* ScrollShadow: scrollbar del tema de HeroUI + degradado cuando hay más contenido.
            Nada de overflow-y-auto suelto: muestra el scrollbar nativo del sistema. */}
        <ScrollShadow className="min-h-0 flex-1 pr-3" size={32}>
          <GruposDeFacetas facetas={facetas} filtros={filtros} onCambio={(g, s) => navegar(conGrupo(filtros, g, s))} />
        </ScrollShadow>
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
