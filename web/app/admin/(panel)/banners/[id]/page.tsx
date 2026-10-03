import { ArrowLeft } from "@gravity-ui/icons";
import { Skeleton } from "@heroui/react";
import type { Metadata } from "next";
import NextLink from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { BorrarBanner } from "@/components/admin/banners/borrar-banner";
import { FormularioBanner } from "@/components/admin/banners/formulario-banner";
import { requerirAdmin } from "@/lib/auth";
import { destinosBanner } from "@/lib/admin/banners";
import { aDia } from "@/lib/admin/fechas";

export const metadata: Metadata = { title: "Editar banner" };

export default function PaginaEditarBanner(props: PageProps<"/admin/banners/[id]">) {
  return (
    <div className="flex flex-col gap-5">
      <NextLink href="/admin/banners" className="flex items-center gap-2 self-start text-sm text-muted hover:text-foreground">
        <ArrowLeft className="size-4" /> Banners
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

async function Edicion({ params }: { params: PageProps<"/admin/banners/[id]">["params"] }) {
  const { id } = await params;
  const { supabase } = await requerirAdmin();
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const { data: b } = await supabase.from("banners").select("*").eq("id", id).maybeSingle();
  if (!b) notFound();
  const banner = {
    id: b.id,
    titulo: b.titulo,
    subtitulo: b.subtitulo,
    textoBoton: b.texto_boton,
    enlace: b.enlace,
    imagenPath: b.imagen_path,
    imagenMobilePath: b.imagen_mobile_path,
    textoClaro: b.texto_claro,
    activo: b.activo,
    desde: aDia(b.desde),
    hasta: aDia(b.hasta, true),
  };

  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">{b.titulo ?? "Banner sin título"}</h1>
      {/* key: después de guardar, router.refresh() trae los datos nuevos y el formulario se reinicia con ellos. */}
      <FormularioBanner key={JSON.stringify(banner)} banner={banner} nuevo={false} categorias={await destinosBanner(supabase)} />
      <BorrarBanner id={b.id} nombre={b.titulo ?? "este banner"} />
    </>
  );
}
