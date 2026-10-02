import { ArrowLeft } from "@gravity-ui/icons";
import { Skeleton } from "@heroui/react";
import type { Metadata } from "next";
import NextLink from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { BorrarPromocion } from "@/components/admin/promociones/borrar-promocion";
import { FormularioPromocion } from "@/components/admin/promociones/formulario-promocion";
import { requerirAdmin } from "@/lib/auth";
import { obtenerPromocionAdmin, opcionesAlcance } from "@/lib/admin/promociones";

export const metadata: Metadata = { title: "Editar promoción" };

// Shell estático + lo que lee la sesión/params en su propio Suspense.
export default function PaginaEditarPromocion(props: PageProps<"/admin/promociones/[id]">) {
  return (
    <div className="flex flex-col gap-5">
      <NextLink href="/admin/promociones" className="flex items-center gap-2 self-start text-sm text-muted hover:text-foreground">
        <ArrowLeft className="size-4" /> Promociones
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

async function Edicion({ params }: { params: PageProps<"/admin/promociones/[id]">["params"] }) {
  const { id } = await params;
  const { supabase } = await requerirAdmin();
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const [promocion, opciones] = await Promise.all([obtenerPromocionAdmin(supabase, id), opcionesAlcance(supabase)]);
  if (!promocion) notFound();

  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">{promocion.nombre}</h1>
      {/* key: después de guardar, router.refresh() trae los datos nuevos y el formulario se reinicia con ellos. */}
      <FormularioPromocion key={JSON.stringify(promocion)} promocion={promocion} opciones={opciones} />
      <BorrarPromocion id={promocion.id} nombre={promocion.nombre} />
    </>
  );
}
