"use client";

import { Form, Label, ListBox, SearchField, Select } from "@heroui/react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";

export const ESTADOS = {
  todos: "Todos",
  visibles: "Visibles",
  ocultos: "Ocultos (borradores)",
  "sin-stock": "Sin stock",
} as const;
export type Estado = keyof typeof ESTADOS;

export function FiltrosListado() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [q, setQ] = useState(sp.get("q") ?? "");
  const [, iniciar] = useTransition();
  const estado = (sp.get("estado") ?? "todos") as Estado;

  const ir = (cambios: Record<string, string | null>) => {
    const p = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(cambios)) {
      if (v) p.set(k, v);
      else p.delete(k);
    }
    p.delete("pagina"); // cambiar un filtro vuelve a la página 1
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
        <SearchField aria-label="Buscar productos" value={q} onChange={setQ} onClear={() => ir({ q: null })}>
          <SearchField.Group>
            <SearchField.SearchIcon />
            <SearchField.Input placeholder="Buscar por nombre o SKU" />
            <SearchField.ClearButton />
          </SearchField.Group>
        </SearchField>
      </Form>
      <Select
        aria-label="Estado"
        value={estado}
        onChange={(v) => typeof v === "string" && ir({ estado: v === "todos" ? null : v })}
        className="sm:w-56"
      >
        <Label className="sr-only">Estado</Label>
        <Select.Trigger>
          <Select.Value />
          <Select.Indicator />
        </Select.Trigger>
        <Select.Popover>
          <ListBox>
            {(Object.keys(ESTADOS) as Estado[]).map((e) => (
              <ListBox.Item key={e} id={e} textValue={ESTADOS[e]}>
                {ESTADOS[e]}
                <ListBox.ItemIndicator />
              </ListBox.Item>
            ))}
          </ListBox>
        </Select.Popover>
      </Select>
    </div>
  );
}
