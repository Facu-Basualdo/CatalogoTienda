"use client";

import { ArrowDown, ArrowUp } from "@gravity-ui/icons";
import { Button, Chip, Switch, toast } from "@heroui/react";
import Image from "next/image";
import NextLink from "next/link";
import { useRouter } from "next/navigation";
import { useOptimistic, useState, useTransition } from "react";
import { cambiarActivoBanner, reordenarBanners } from "@/app/admin/(panel)/banners/acciones";
import type { Vigencia } from "@/lib/admin/fechas";
import { urlPublica } from "@/lib/supabase/storage";

export type FilaBanner = {
  id: string;
  titulo: string | null;
  imagenPath: string;
  activo: boolean;
  vigencia: Vigencia;
};

const CHIP: Record<Vigencia["estado"], string> = {
  vigente: "Se ve",
  programada: "Programado",
  vencida: "Vencido",
  pausada: "Pausado",
};

// El orden es el del carrusel de la home.
export function ListaBanners({ banners }: { banners: FilaBanner[] }) {
  const router = useRouter();
  const [orden, setOrden] = useState(banners);
  const [previo, setPrevio] = useState(banners);
  const [, iniciar] = useTransition();
  if (previo !== banners) {
    setPrevio(banners);
    setOrden(banners);
  }

  function mover(n: number, d: number) {
    const nuevo = [...orden];
    [nuevo[n], nuevo[n + d]] = [nuevo[n + d], nuevo[n]];
    setOrden(nuevo);
    iniciar(async () => {
      const r = await reordenarBanners(nuevo.map((b) => b.id));
      if (!r.ok) {
        toast.danger(r.error);
        setOrden(orden);
      } else router.refresh();
    });
  }

  return (
    <ol className="flex flex-col divide-y divide-separator rounded-tarjeta border border-border bg-surface">
      {orden.map((b, n) => (
        <li key={b.id} className="flex flex-wrap items-center gap-4 p-3 sm:p-4">
          <NextLink href={`/admin/banners/${b.id}`} className="relative aspect-[3/1] w-48 shrink-0 overflow-hidden rounded-lg bg-surface-secondary">
            <Image src={urlPublica(b.imagenPath)} alt="" fill sizes="192px" className="object-cover" />
          </NextLink>
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <NextLink href={`/admin/banners/${b.id}`} className="font-medium hover:underline">
              {b.titulo ?? "Sin título"}
            </NextLink>
            <span className="text-xs text-muted">{b.vigencia.texto}</span>
          </div>
          <Chip size="sm" variant={b.vigencia.estado === "vigente" ? "primary" : "tertiary"}>
            {CHIP[b.vigencia.estado]}
          </Chip>
          <SwitchActivo id={b.id} activo={b.activo} nombre={b.titulo ?? "banner"} />
          <div className="flex">
            <Button isIconOnly size="sm" variant="ghost" aria-label="Antes en el carrusel" isDisabled={n === 0} onPress={() => mover(n, -1)}>
              <ArrowUp />
            </Button>
            <Button
              isIconOnly
              size="sm"
              variant="ghost"
              aria-label="Después en el carrusel"
              isDisabled={n === orden.length - 1}
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

function SwitchActivo({ id, activo, nombre }: { id: string; activo: boolean; nombre: string }) {
  const [valor, setValor] = useOptimistic(activo);
  const [, iniciar] = useTransition();
  return (
    <Switch
      size="sm"
      isSelected={valor}
      aria-label={`Activo: ${nombre}`}
      onChange={(nuevo) =>
        iniciar(async () => {
          setValor(nuevo);
          const r = await cambiarActivoBanner(id, nuevo);
          if (!r.ok) toast.danger(r.error);
        })
      }
    >
      <Switch.Content>
        <Switch.Control>
          <Switch.Thumb />
        </Switch.Control>
      </Switch.Content>
    </Switch>
  );
}
