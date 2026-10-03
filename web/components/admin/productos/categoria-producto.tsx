"use client";

import NextLink from "next/link";
import { createContext, use, useState } from "react";

// La categoría elegida en "Datos" decide qué grupos muestran "Marca y características"
// y "Variantes", al instante y sin guardar antes. Ver claude/web/dashboard.md#características-por-categoría

type Contexto = {
  categoriaId: string | null;
  setCategoriaId: (id: string | null) => void;
  gruposPorCategoria: Record<string, string[]>;
  nombres: Record<string, string>;
};

const CategoriaProducto = createContext<Contexto | null>(null);

export function ProveedorCategoria({
  inicial,
  gruposPorCategoria,
  categorias,
  children,
}: {
  inicial: string | null;
  gruposPorCategoria: Record<string, string[]>;
  categorias: { id: string; nombre: string }[];
  children: React.ReactNode;
}) {
  const [categoriaId, setCategoriaId] = useState(inicial);
  const nombres = Object.fromEntries(categorias.map((c) => [c.id, c.nombre]));
  return <CategoriaProducto value={{ categoriaId, setCategoriaId, gruposPorCategoria, nombres }}>{children}</CategoriaProducto>;
}

export function useCategoriaProducto() {
  const c = use(CategoriaProducto);
  if (!c) throw new Error("useCategoriaProducto fuera de ProveedorCategoria");
  return c;
}

/**
 * Grupos que pide la categoría elegida (propios + heredados). `null` = mostrar todos:
 * sin categoría, o una categoría a la que todavía no se le eligieron características.
 */
export function useGruposPermitidos(): Set<string> | null {
  const { categoriaId, gruposPorCategoria } = useCategoriaProducto();
  const ids = categoriaId ? gruposPorCategoria[categoriaId] : undefined;
  return ids?.length ? new Set(ids) : null;
}

/** Línea de ayuda arriba de cada sección: de dónde salen los campos que se ven. */
export function AvisoCategoria({ que }: { que: string }) {
  const { categoriaId, nombres } = useCategoriaProducto();
  const permitidos = useGruposPermitidos();
  const enlace = (
    <NextLink href="/admin/categorias" className="underline underline-offset-2 hover:text-foreground">
      Categorías
    </NextLink>
  );
  return (
    <p className="text-xs text-muted">
      {!categoriaId ? (
        <>Elegí la categoría en «Datos» para ver sólo {que} que le corresponden.</>
      ) : permitidos ? (
        <>
          Se muestran {que} de «{nombres[categoriaId]}». Para cambiarlas, andá a {enlace}.
        </>
      ) : (
        <>
          «{nombres[categoriaId]}» todavía no tiene {que} elegidas: se muestran todas. Elegilas en {enlace}.
        </>
      )}
    </p>
  );
}
