"use client";

import { Form, Label, ListBox, SearchField, Select } from "@heroui/react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";

export const FILTROS_ESTADO = {
  activos: "Activos (pendientes y confirmados)",
  pendiente: "Pendientes",
  confirmado: "Confirmados",
  entregado: "Entregados",
  cancelado: "Cancelados",
  todos: "Todos",
} as const;
export type FiltroEstado = keyof typeof FILTROS_ESTADO;

export function FiltrosPedidos() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [q, setQ] = useState(sp.get("q") ?? "");
  const [, iniciar] = useTransition();
  const estado = (sp.get("estado") ?? "activos") as FiltroEstado;

  const ir = (cambios: Record<string, string | null>) => {
    const p = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(cambios)) {
      if (v) p.set(k, v);
      else p.delete(k);
    }
    p.delete("pagina");
    iniciar(() => router.replace(`${pathname}${p.size ? `?${p}` : ""}`, { scroll: false }));
  };

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <Form
        role="search"
        className="flex-1"
        onSubmit={(e) => {
          e.preventDefault();
          ir({ q: q.trim() || null });
        }}
      >
        <SearchField aria-label="Buscar pedidos" value={q} onChange={setQ} onClear={() => ir({ q: null })}>
          <SearchField.Group>
            <SearchField.SearchIcon />
            <SearchField.Input placeholder="Número de pedido o nombre" />
            <SearchField.ClearButton />
          </SearchField.Group>
        </SearchField>
      </Form>
      <Select
        aria-label="Estado"
        value={estado}
        onChange={(v) => typeof v === "string" && ir({ estado: v === "activos" ? null : v })}
        className="sm:w-72"
      >
        <Label className="sr-only">Estado</Label>
        <Select.Trigger>
          <Select.Value />
          <Select.Indicator />
        </Select.Trigger>
        <Select.Popover>
          <ListBox>
            {(Object.keys(FILTROS_ESTADO) as FiltroEstado[]).map((e) => (
              <ListBox.Item key={e} id={e} textValue={FILTROS_ESTADO[e]}>
                {FILTROS_ESTADO[e]}
                <ListBox.ItemIndicator />
              </ListBox.Item>
            ))}
          </ListBox>
        </Select.Popover>
      </Select>
    </div>
  );
}
