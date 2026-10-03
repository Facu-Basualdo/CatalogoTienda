import { ArrowLeft, ArrowUpRightFromSquare } from "@gravity-ui/icons";
import { Chip, Skeleton } from "@heroui/react";
import { buttonVariants } from "@heroui/styles";
import type { Metadata } from "next";
import NextLink from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import {
  actualizarAltCombo,
  borrarImagenCombo,
  guardarDescripcionCombo,
  registrarImagenCombo,
  reordenarImagenesCombo,
} from "../acciones";
import { BorrarCombo } from "@/components/admin/combos/borrar-combo";
import { EditorItemsCombo } from "@/components/admin/combos/editor-items-combo";
import { FormularioDatosCombo } from "@/components/admin/combos/formulario-datos-combo";
import { EditorDescripcion } from "@/components/admin/editor-descripcion";
import { GaleriaAdmin } from "@/components/admin/galeria-admin";
import { requerirAdmin } from "@/lib/auth";
import { obtenerComboAdmin, productosParaCombo } from "@/lib/admin/combos";

export const metadata: Metadata = { title: "Editar combo" };

// Shell estático + lo que lee la sesión/params en su propio Suspense.
export default function PaginaEditarCombo(props: PageProps<"/admin/combos/[id]">) {
  return (
    <div className="flex flex-col gap-5">
      <NextLink href="/admin/combos" className="flex items-center gap-2 self-start text-sm text-muted hover:text-foreground">
        <ArrowLeft className="size-4" /> Combos
      </NextLink>
      <Suspense
        fallback={
          <div className="flex flex-col gap-5">
            <Skeleton className="h-10 w-72 rounded-lg" />
            <Skeleton className="h-80 rounded-tarjeta" />
          </div>
        }
      >
        <Edicion params={props.params} />
      </Suspense>
    </div>
  );
}

async function Edicion({ params }: { params: PageProps<"/admin/combos/[id]">["params"] }) {
  const { id } = await params;
  const { supabase } = await requerirAdmin();
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const [combo, productos] = await Promise.all([obtenerComboAdmin(supabase, id), productosParaCombo(supabase)]);
  if (!combo) notFound();

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">{combo.nombre}</h1>
          <Chip size="sm" variant={combo.publicado ? "primary" : "secondary"}>
            {combo.publicado ? "Visible" : "Oculto"}
          </Chip>
        </div>
        {combo.publicado && (
          <NextLink href={`/combo/${combo.slug}`} target="_blank" className={buttonVariants({ variant: "outline", size: "sm" })}>
            Ver en la tienda <ArrowUpRightFromSquare />
          </NextLink>
        )}
      </div>

      {/* key: al guardar, router.refresh() trae datos nuevos y cada sección se reinicia con ellos. */}
      <FormularioDatosCombo key={`datos-${combo.slug}-${combo.publicado}-${combo.precio}`} combo={combo} />
      <EditorItemsCombo
        key={`items-${JSON.stringify(combo.items)}`}
        comboId={combo.id}
        precio={combo.precio}
        inicial={combo.items}
        productos={productos}
      />
      <GaleriaAdmin
        carpeta={`combos/${combo.id}`}
        imagenes={combo.imagenes}
        acciones={{
          registrar: registrarImagenCombo.bind(null, combo.id),
          reordenar: reordenarImagenesCombo.bind(null, combo.id),
          actualizarAlt: actualizarAltCombo,
          borrar: borrarImagenCombo,
        }}
      />
      <EditorDescripcion inicial={combo.descripcion} guardar={guardarDescripcionCombo.bind(null, combo.id)} />
      <BorrarCombo id={combo.id} nombre={combo.nombre} />
    </>
  );
}
