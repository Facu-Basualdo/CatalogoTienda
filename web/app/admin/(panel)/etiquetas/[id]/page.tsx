import { ArrowLeft } from "@gravity-ui/icons";
import { Skeleton } from "@heroui/react";
import type { Metadata } from "next";
import NextLink from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { BorrarGrupo } from "@/components/admin/etiquetas/borrar-grupo";
import { EditorValores } from "@/components/admin/etiquetas/editor-valores";
import { FormularioGrupo } from "@/components/admin/etiquetas/formulario-grupo";
import { requerirAdmin } from "@/lib/auth";
import { obtenerGrupo } from "@/lib/admin/etiquetas";

export const metadata: Metadata = { title: "Editar grupo" };

export default function PaginaEditarGrupo(props: PageProps<"/admin/etiquetas/[id]">) {
  return (
    <div className="flex flex-col gap-5">
      <NextLink href="/admin/etiquetas" className="flex items-center gap-2 self-start text-sm text-muted hover:text-foreground">
        <ArrowLeft className="size-4" /> Etiquetas
      </NextLink>
      <Suspense
        fallback={
          <div className="flex flex-col gap-5">
            <Skeleton className="h-10 w-72 rounded-lg" />
            <Skeleton className="h-96 rounded-tarjeta" />
          </div>
        }
      >
        <Edicion params={props.params} />
      </Suspense>
    </div>
  );
}

async function Edicion({ params }: { params: PageProps<"/admin/etiquetas/[id]">["params"] }) {
  const { id } = await params;
  const { supabase } = await requerirAdmin();
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const datos = await obtenerGrupo(supabase, id);
  if (!datos) notFound();
  const { grupo, etiquetas, enUso } = datos;

  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">{grupo.nombre}</h1>
      <FormularioGrupo key={JSON.stringify(grupo)} grupo={grupo} enUso={enUso} />
      {/* Muestra de color: en los grupos de variante (color) o si algún valor ya la tiene. */}
      <EditorValores grupoId={grupo.id} conColor={grupo.esVariante || etiquetas.some((e) => e.colorHex)} etiquetas={etiquetas} />
      <BorrarGrupo id={grupo.id} nombre={grupo.nombre} />
    </>
  );
}
