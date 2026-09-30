"use client";

import { LayoutCells, ListUl } from "@gravity-ui/icons";
import { ToggleButton, ToggleButtonGroup } from "@heroui/react";
import { useSyncExternalStore } from "react";

// Vista grilla / lista del catálogo. Es una preferencia del visitante: vive en
// localStorage y NO en la URL (sería otra clave reservada y otra entrada de caché).
// Las tarjetas son server components; sólo cambia un data-attribute del contenedor.
export type Vista = "grilla" | "lista";

const CLAVE = "vista:v1";
const oyentes = new Set<() => void>();
let actual: Vista | null = null;

function leer(): Vista {
  if (actual) return actual;
  try {
    actual = window.localStorage.getItem(CLAVE) === "lista" ? "lista" : "grilla";
  } catch {
    actual = "grilla";
  }
  return actual;
}

function fijar(v: Vista) {
  actual = v;
  try {
    window.localStorage.setItem(CLAVE, v);
  } catch {}
  oyentes.forEach((f) => f());
}

function suscribir(f: () => void) {
  oyentes.add(f);
  return () => oyentes.delete(f);
}

function useVista(): Vista {
  return useSyncExternalStore(suscribir, leer, () => "grilla");
}

export function SelectorVista() {
  const vista = useVista();
  return (
    <ToggleButtonGroup
      aria-label="Vista"
      selectionMode="single"
      disallowEmptySelection
      size="sm"
      selectedKeys={[vista]}
      onSelectionChange={(claves) => {
        const [v] = [...claves];
        if (v === "grilla" || v === "lista") fijar(v);
      }}
      className="hidden sm:flex"
    >
      <ToggleButton id="grilla" isIconOnly aria-label="Ver en grilla">
        <LayoutCells />
      </ToggleButton>
      <ToggleButton id="lista" isIconOnly aria-label="Ver en lista">
        <ToggleButtonGroup.Separator />
        <ListUl />
      </ToggleButton>
    </ToggleButtonGroup>
  );
}

/** Contenedor de tarjetas: en lista, una columna y tarjetas horizontales (group/vista). */
export function ContenedorVista({ children }: { children: React.ReactNode }) {
  const vista = useVista();
  return (
    <ul
      data-vista={vista}
      className="group/vista grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4 data-[vista=lista]:sm:grid-cols-1"
    >
      {children}
    </ul>
  );
}
