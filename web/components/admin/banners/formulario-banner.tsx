"use client";

import { Button, Form, Input, Label, Switch, TextField, toast } from "@heroui/react";
import { parseDate, type CalendarDate } from "@internationalized/date";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { guardarBanner } from "@/app/admin/(panel)/banners/acciones";
import { DiapositivaBanner } from "@/components/tienda/diapositiva-banner";
import { urlPublica } from "@/lib/supabase/storage";
import { Seccion } from "../seccion";
import { SelectorFecha } from "../selector-fecha";
import { SubidaImagen } from "../subida-imagen";
import { DestinoBanner, type CategoriaDestino } from "./destino-banner";

export type BannerAdmin = {
  id: string;
  titulo: string | null;
  subtitulo: string | null;
  textoBoton: string | null;
  enlace: string | null;
  imagenPath: string;
  imagenMobilePath: string | null;
  textoClaro: boolean;
  activo: boolean;
  desde: string | null;
  hasta: string | null;
};

function Interruptor({ valor, onChange, titulo, ayuda }: { valor: boolean; onChange: (v: boolean) => void; titulo: string; ayuda: string }) {
  return (
    <div className="flex flex-col gap-1">
      <Switch isSelected={valor} onChange={onChange}>
        <Switch.Content>
          <Switch.Control>
            <Switch.Thumb />
          </Switch.Control>
          <Label>{titulo}</Label>
        </Switch.Content>
      </Switch>
      <p className="text-xs text-muted">{ayuda}</p>
    </div>
  );
}

/**
 * Alta (`nuevo`, con un id que ya generó la página) y edición. Las imágenes suben a
 * `banners/{id}/` al elegirlas; el banner se guarda recién con "Guardar". Ver claude/web/banners.md
 */
export function FormularioBanner({
  banner,
  nuevo,
  categorias,
}: {
  banner: BannerAdmin;
  nuevo: boolean;
  categorias: CategoriaDestino[];
}) {
  const router = useRouter();
  const [pendiente, iniciar] = useTransition();
  const [imagenPath, setImagenPath] = useState(banner.imagenPath);
  const [imagenMobilePath, setImagenMobilePath] = useState(banner.imagenMobilePath);
  const [titulo, setTitulo] = useState(banner.titulo ?? "");
  const [subtitulo, setSubtitulo] = useState(banner.subtitulo ?? "");
  const [textoBoton, setTextoBoton] = useState(banner.textoBoton ?? "");
  const [enlace, setEnlace] = useState(banner.enlace ?? "");
  const [textoClaro, setTextoClaro] = useState(banner.textoClaro);
  const [activo, setActivo] = useState(banner.activo);
  const [desde, setDesde] = useState<CalendarDate | null>(banner.desde ? parseDate(banner.desde) : null);
  const [hasta, setHasta] = useState<CalendarDate | null>(banner.hasta ? parseDate(banner.hasta) : null);

  const vista = {
    id: banner.id,
    titulo: titulo.trim() || null,
    subtitulo: subtitulo.trim() || null,
    textoBoton: textoBoton.trim() || null,
    enlace: enlace.trim() || null,
    imagenPath,
    imagenMobilePath,
    textoClaro,
  };

  function guardar() {
    iniciar(async () => {
      const r = await guardarBanner(banner.id, nuevo, {
        imagenPath,
        imagenMobilePath,
        titulo,
        subtitulo,
        // Sin destino no hay botón: no se guarda un texto que no se va a ver.
        textoBoton: enlace.trim() ? textoBoton : "",
        enlace,
        textoClaro,
        activo,
        desde: desde?.toString() ?? null,
        hasta: hasta?.toString() ?? null,
      });
      if (!r.ok) return void toast.danger(r.error);
      toast.success(nuevo ? "Banner creado" : "Banner guardado");
      if (nuevo) router.replace(`/admin/banners/${banner.id}`);
      else router.refresh();
    });
  }

  return (
    <Form
      className="flex flex-col gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        guardar();
      }}
    >
      <Seccion titulo="Imágenes" descripcion="Sin texto adentro: el título y el botón los pone la página encima, y se leen en cualquier pantalla.">
        <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          <div className="flex flex-col gap-3">
            <Label className="text-sm font-medium">Escritorio (3:1) · obligatoria</Label>
            {imagenPath && (
              <div className="relative aspect-[3/1] overflow-hidden rounded-xl bg-surface-secondary">
                <Image src={urlPublica(imagenPath)} alt="" fill sizes="(max-width: 1024px) 100vw, 50vw" className="object-cover" />
              </div>
            )}
            <SubidaImagen
              formato="bannerDesktop"
              carpeta={`banners/${banner.id}`}
              etiqueta={imagenPath ? "Reemplazar imagen de escritorio" : undefined}
              onSubida={(img) => setImagenPath(img.path)}
            />
          </div>
          <div className="flex flex-col gap-3">
            <Label className="text-sm font-medium">Celular (4:5) · opcional</Label>
            {imagenMobilePath && (
              <div className="relative mx-auto aspect-[4/5] w-full max-w-56 overflow-hidden rounded-xl bg-surface-secondary">
                <Image src={urlPublica(imagenMobilePath)} alt="" fill sizes="224px" className="object-cover" />
              </div>
            )}
            <SubidaImagen
              formato="bannerMobile"
              carpeta={`banners/${banner.id}`}
              etiqueta={imagenMobilePath ? "Reemplazar imagen de celular" : undefined}
              onSubida={(img) => setImagenMobilePath(img.path)}
            />
            {imagenMobilePath ? (
              <Button size="sm" variant="ghost" onPress={() => setImagenMobilePath(null)} className="self-start">
                Usar la de escritorio recortada
              </Button>
            ) : (
              <p className="text-xs text-muted">Sin esta, el celular muestra el centro de la de escritorio.</p>
            )}
          </div>
        </div>
      </Seccion>

      <Seccion titulo="Texto y botón" descripcion="Todo opcional: un banner puede ser sólo imagen.">
        <div className="grid gap-5 md:grid-cols-2">
          <TextField value={titulo} onChange={setTitulo} maxLength={60}>
            <Label>Título</Label>
            <Input placeholder="Nueva temporada" />
          </TextField>
          <TextField value={subtitulo} onChange={setSubtitulo} maxLength={120}>
            <Label>Subtítulo</Label>
            <Input placeholder="Remeras y buzos de algodón" />
          </TextField>
          <DestinoBanner enlace={enlace} onChange={setEnlace} categorias={categorias} />
          {enlace ? (
            <TextField value={textoBoton} onChange={setTextoBoton} maxLength={30}>
              <Label>Texto del botón</Label>
              <Input placeholder="Ver ropa" />
            </TextField>
          ) : (
            <div />
          )}
          <Interruptor
            valor={textoClaro}
            onChange={setTextoClaro}
            titulo="Texto blanco"
            ayuda="Para imágenes oscuras. Mirá la vista previa."
          />
          <Interruptor valor={activo} onChange={setActivo} titulo="Activo" ayuda="Apagado no se muestra aunque esté dentro de las fechas." />
          <SelectorFecha etiqueta="Desde" valor={desde} onChange={setDesde} ayuda="Vacío: se muestra desde ya." />
          <SelectorFecha etiqueta="Hasta (inclusive)" valor={hasta} onChange={setHasta} ayuda="Vacío: no vence." />
        </div>
      </Seccion>

      {imagenPath && (
        <Seccion titulo="Vista previa" descripcion="Así se ve en la home.">
          <div className="grid items-start gap-6 lg:grid-cols-[3fr_1fr]">
            <div className="flex flex-col gap-2">
              <p className="text-xs text-muted">Escritorio</p>
              <div className="pointer-events-none overflow-hidden rounded-tarjeta">
                <DiapositivaBanner banner={vista} variante="desktop" sizes="60vw" />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <p className="text-xs text-muted">Celular</p>
              <div className="pointer-events-none mx-auto w-full max-w-64 overflow-hidden rounded-tarjeta">
                <DiapositivaBanner banner={vista} variante="mobile" sizes="256px" />
              </div>
            </div>
          </div>
        </Seccion>
      )}

      <div className="flex justify-end">
        <Button type="submit" isPending={pendiente} isDisabled={!imagenPath}>
          {nuevo ? "Crear banner" : "Guardar cambios"}
        </Button>
      </div>
    </Form>
  );
}
