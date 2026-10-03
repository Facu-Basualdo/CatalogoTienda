import { ArrowLeft } from "@gravity-ui/icons";
import { Skeleton } from "@heroui/react";
import type { Metadata } from "next";
import NextLink from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import type { EstadoPedido } from "../../pedidos/acciones";
import { BorrarCupon } from "@/components/admin/cupones/borrar-cupon";
import { FormularioCupon } from "@/components/admin/cupones/formulario-cupon";
import { ChipEstado } from "@/components/admin/pedidos/estado";
import { Seccion } from "@/components/admin/seccion";
import { requerirAdmin } from "@/lib/auth";
import { obtenerCuponAdmin } from "@/lib/admin/cupones";
import { ZONA } from "@/lib/admin/fechas";
import { formatearPrecio } from "@/lib/formato";

export const metadata: Metadata = { title: "Editar cupón" };

const fecha = new Intl.DateTimeFormat("es-AR", { dateStyle: "short", timeZone: ZONA });

export default function PaginaEditarCupon(props: PageProps<"/admin/cupones/[id]">) {
  return (
    <div className="flex flex-col gap-5">
      <NextLink href="/admin/cupones" className="flex items-center gap-2 self-start text-sm text-muted hover:text-foreground">
        <ArrowLeft className="size-4" /> Cupones
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

async function Edicion({ params }: { params: PageProps<"/admin/cupones/[id]">["params"] }) {
  const { id } = await params;
  const { supabase } = await requerirAdmin();
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const datos = await obtenerCuponAdmin(supabase, id);
  if (!datos) notFound();
  const { cupon, pedidos } = datos;

  return (
    <>
      <h1 className="font-mono text-2xl font-semibold tracking-tight">{cupon.codigo}</h1>
      {/* key: después de guardar, router.refresh() trae los datos nuevos y el formulario se reinicia con ellos. */}
      <FormularioCupon key={JSON.stringify(cupon)} cupon={cupon} />

      <Seccion titulo="Pedidos que lo usaron" descripcion="Los cancelados no cuentan como uso.">
        {pedidos.length ? (
          <ul className="flex flex-col divide-y divide-separator rounded-xl border border-border">
            {pedidos.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
                <NextLink href={`/admin/pedidos/${p.id}`} className="font-semibold hover:underline">
                  #{p.numero}
                </NextLink>
                <span className="text-muted">{fecha.format(new Date(p.creadoEn))}</span>
                <span className="min-w-0 flex-1 truncate">{p.nombre}</span>
                <span className="tabular-nums">-{formatearPrecio(p.descuento)}</span>
                <ChipEstado estado={p.estado as EstadoPedido} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">Todavía nadie lo usó.</p>
        )}
      </Seccion>

      <BorrarCupon id={cupon.id} nombre={cupon.codigo} />
    </>
  );
}
