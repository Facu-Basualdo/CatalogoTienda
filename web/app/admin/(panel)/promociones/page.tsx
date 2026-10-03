import { Plus } from "@gravity-ui/icons";
import { Chip, Skeleton, Table } from "@heroui/react";
import { buttonVariants } from "@heroui/styles";
import type { Metadata } from "next";
import NextLink from "next/link";
import { Suspense } from "react";
import { SwitchActiva } from "@/components/admin/promociones/switch-activa";
import { requerirAdmin } from "@/lib/auth";
import { CHIP_VIGENCIA as CHIP, vigencia } from "@/lib/admin/fechas";
import { describirPromo } from "@/lib/admin/promociones";

export const metadata: Metadata = { title: "Promociones" };

// Shell estático + datos en su propio Suspense. Ver claude/web/dashboard.md#páginas-del-panel
export default function PaginaPromociones() {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Promociones</h1>
          <p className="text-sm text-muted">
            Descuentos automáticos por producto, categoría o etiqueta. No se acumulan: gana la que más descuenta.
          </p>
        </div>
        <NextLink href="/admin/promociones/nueva" className={buttonVariants()}>
          <Plus />
          Nueva promoción
        </NextLink>
      </div>
      <Suspense fallback={<Skeleton className="h-72 rounded-tarjeta" />}>
        <Listado />
      </Suspense>
    </div>
  );
}

async function Listado() {
  const { supabase } = await requerirAdmin();
  const { data, error } = await supabase
    .from("promociones")
    .select(
      "id, nombre, tipo, valor, lleva, paga, alcance_todo, activa, desde, hasta, alcance:promocion_alcance(producto_id, categoria_id, etiqueta_id)",
    )
    .order("creado_en", { ascending: false });
  if (error) return <p className="text-danger">No se pudieron leer las promociones.</p>;
  if (!data.length) {
    return (
      <p className="rounded-tarjeta border border-border bg-surface p-8 text-center text-muted">
        Todavía no hay promociones. Creá la primera con «Nueva promoción».
      </p>
    );
  }

  // eslint-disable-next-line react-hooks/purity -- página dinámica: se calcula en cada pedido.
  const ahora = Date.now();
  return (
    <Table className="rounded-tarjeta border border-border bg-surface">
      <Table.ScrollContainer>
        <Table.Content aria-label="Promociones">
          <Table.Header>
            <Table.Column isRowHeader>Nombre</Table.Column>
            <Table.Column>Descuento</Table.Column>
            <Table.Column>Aplica a</Table.Column>
            <Table.Column>Fechas</Table.Column>
            <Table.Column>Estado</Table.Column>
            <Table.Column>Activa</Table.Column>
          </Table.Header>
          <Table.Body>
            {data.map((p) => {
              const v = vigencia(p, ahora);
              return (
                <Table.Row key={p.id} id={p.id}>
                  <Table.Cell>
                    <NextLink href={`/admin/promociones/${p.id}`} className="font-medium hover:underline">
                      {p.nombre}
                    </NextLink>
                  </Table.Cell>
                  <Table.Cell className="whitespace-nowrap">{describirPromo(p)}</Table.Cell>
                  <Table.Cell className="text-muted">{resumenAlcance(p)}</Table.Cell>
                  <Table.Cell className="whitespace-nowrap text-muted">{v.texto}</Table.Cell>
                  <Table.Cell>
                    <Chip size="sm" variant={CHIP[v.estado].variante}>
                      {CHIP[v.estado].texto}
                    </Chip>
                  </Table.Cell>
                  <Table.Cell>
                    <SwitchActiva id={p.id} activa={p.activa} nombre={p.nombre} />
                  </Table.Cell>
                </Table.Row>
              );
            })}
          </Table.Body>
        </Table.Content>
      </Table.ScrollContainer>
    </Table>
  );
}

function resumenAlcance(p: {
  alcance_todo: boolean;
  alcance: { producto_id: string | null; categoria_id: string | null; etiqueta_id: string | null }[];
}) {
  if (p.alcance_todo) return "Todo el catálogo";
  const contar = (n: number, uno: string, varios: string) => (n ? `${n} ${n === 1 ? uno : varios}` : null);
  return (
    [
      contar(p.alcance.filter((a) => a.categoria_id).length, "categoría", "categorías"),
      contar(p.alcance.filter((a) => a.etiqueta_id).length, "etiqueta", "etiquetas"),
      contar(p.alcance.filter((a) => a.producto_id).length, "producto", "productos"),
    ]
      .filter(Boolean)
      .join(" · ") || "Nada (no aplica)"
  );
}
