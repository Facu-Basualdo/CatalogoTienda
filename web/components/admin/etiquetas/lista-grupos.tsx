"use client";

import { ArrowDown, ArrowUp } from "@gravity-ui/icons";
import { Button, Chip, toast } from "@heroui/react";
import NextLink from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { reordenarGrupos } from "@/app/admin/(panel)/etiquetas/acciones";
import type { GrupoListado } from "@/lib/admin/etiquetas";
import { IconoGrupo } from "@/lib/iconos";

// El orden es el de los filtros y la ficha. La marca va siempre primera (un trigger
// le fija orden 0), por eso no se mueve.
export function ListaGrupos({ grupos }: { grupos: GrupoListado[] }) {
  const router = useRouter();
  const [orden, setOrden] = useState(grupos);
  const [previo, setPrevio] = useState(grupos);
  const [, iniciar] = useTransition();
  if (previo !== grupos) {
    setPrevio(grupos);
    setOrden(grupos);
  }

  function mover(n: number, d: number) {
    const nuevo = [...orden];
    [nuevo[n], nuevo[n + d]] = [nuevo[n + d], nuevo[n]];
    setOrden(nuevo);
    iniciar(async () => {
      const r = await reordenarGrupos(nuevo.filter((g) => !g.esMarca).map((g) => g.id));
      if (!r.ok) {
        toast.danger(r.error);
        setOrden(orden);
      } else router.refresh();
    });
  }

  return (
    <ol className="flex flex-col divide-y divide-separator rounded-tarjeta border border-border bg-surface">
      {orden.map((g, n) => (
        <li key={g.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
          <IconoGrupo nombre={g.icono} className="size-5 shrink-0 text-muted" />
          <div className="flex min-w-0 flex-1 flex-col">
            <NextLink href={`/admin/etiquetas/${g.id}`} className="font-medium hover:underline">
              {g.nombre}
            </NextLink>
            <span className="font-mono text-xs text-muted">?{g.slug}=</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {g.esMarca && <Chip size="sm">Marca</Chip>}
            {g.esVariante && <Chip size="sm">Variante</Chip>}
            {!g.visibleEnFiltros && (
              <Chip size="sm" variant="tertiary">
                Oculto en filtros
              </Chip>
            )}
            {!g.visibleEnFicha && (
              <Chip size="sm" variant="tertiary">
                Oculto en ficha
              </Chip>
            )}
          </div>
          <span className="w-24 text-right text-sm tabular-nums text-muted">
            {g.etiquetas} {g.etiquetas === 1 ? "valor" : "valores"}
          </span>
          <div className="flex">
            <Button
              isIconOnly
              size="sm"
              variant="ghost"
              aria-label={`Subir ${g.nombre}`}
              isDisabled={g.esMarca || n === 0 || orden[n - 1]?.esMarca}
              onPress={() => mover(n, -1)}
            >
              <ArrowUp />
            </Button>
            <Button
              isIconOnly
              size="sm"
              variant="ghost"
              aria-label={`Bajar ${g.nombre}`}
              isDisabled={g.esMarca || n === orden.length - 1}
              onPress={() => mover(n, 1)}
            >
              <ArrowDown />
            </Button>
          </div>
        </li>
      ))}
    </ol>
  );
}
