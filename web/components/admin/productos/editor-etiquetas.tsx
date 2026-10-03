"use client";

import { Button, toast } from "@heroui/react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { guardarEtiquetas } from "@/app/admin/(panel)/productos/acciones";
import type { EtiquetaAdmin, GrupoAdmin } from "@/lib/admin/productos";
import { Seccion } from "../seccion";
import { AvisoCategoria, useGruposPermitidos } from "./categoria-producto";
import { SelectorEtiquetas } from "./selector-etiquetas";

// Marca y etiquetas comunes (material, refresco…). Talle/color van en Variantes: la
// base rechaza etiquetas de grupos de variante en producto_etiquetas.
export function EditorEtiquetas({
  productoId,
  grupos: iniciales,
  seleccionadas: inicio,
}: {
  productoId: string;
  grupos: GrupoAdmin[];
  seleccionadas: string[];
}) {
  const router = useRouter();
  const [grupos, setGrupos] = useState(iniciales.filter((g) => !g.esVariante));
  const [seleccionadas, setSeleccionadas] = useState(inicio);
  const [pendiente, iniciar] = useTransition();
  const permitidos = useGruposPermitidos();
  const sinCambios =
    [...seleccionadas].sort().join() === [...inicio].sort().join();

  const deGrupo = (g: GrupoAdmin) =>
    seleccionadas.filter((id) => g.etiquetas.some((e) => e.id === id));
  const reemplazarGrupo = (g: GrupoAdmin, ids: string[]) =>
    setSeleccionadas((s) => [
      ...s.filter((id) => !g.etiquetas.some((e) => e.id === id)),
      ...ids,
    ]);
  const agregarEtiqueta = (grupoId: string, e: EtiquetaAdmin) =>
    setGrupos((gs) =>
      gs.map((g) =>
        g.id === grupoId ? { ...g, etiquetas: [...g.etiquetas, e] } : g,
      ),
    );

  return (
    <Seccion
      id="etiquetas"
      titulo="Marca y características"
      descripcion="Alimentan los filtros del catálogo y la tabla de especificaciones. Talle y color se cargan en Variantes."
      acciones={
        <Button
          isDisabled={sinCambios}
          isPending={pendiente}
          onPress={() =>
            iniciar(async () => {
              const r = await guardarEtiquetas(productoId, seleccionadas);
              if (!r.ok) return void toast.danger(r.error);
              toast("Características guardadas");
              router.refresh();
            })
          }
        >
          Guardar
        </Button>
      }
    >
      <AvisoCategoria que="las características" />
      <div className="grid gap-5 md:grid-cols-2">
        {/* La marca va siempre; un grupo con valores ya cargados se muestra aunque no sea de
            la categoría, para no esconder datos. */}
        {grupos
          .filter(
            (g) =>
              g.esMarca ||
              !permitidos ||
              permitidos.has(g.id) ||
              deGrupo(g).length > 0,
          )
          .map((g) => (
            <SelectorEtiquetas
              key={g.id}
              grupo={g}
              unica={g.esMarca}
              seleccionadas={deGrupo(g)}
              onChange={(ids) => reemplazarGrupo(g, ids)}
              onEtiquetaCreada={agregarEtiqueta}
            />
          ))}
      </div>
    </Seccion>
  );
}
