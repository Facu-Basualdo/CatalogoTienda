import { Plus } from "@gravity-ui/icons";
import { Chip, Skeleton, Table } from "@heroui/react";
import { buttonVariants } from "@heroui/styles";
import type { Metadata } from "next";
import NextLink from "next/link";
import { Suspense } from "react";
import { SwitchActivoCupon } from "@/components/admin/cupones/switch-activo-cupon";
import { requerirAdmin } from "@/lib/auth";
import { describirCupon } from "@/lib/admin/cupones";
import { CHIP_VIGENCIA, vigencia } from "@/lib/admin/fechas";
import { formatearPrecio } from "@/lib/formato";

export const metadata: Metadata = { title: "Cupones" };

// Shell estático + datos en su propio Suspense. Ver claude/web/dashboard.md#páginas-del-panel
export default function PaginaCupones() {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Cupones</h1>
          <p className="text-sm text-muted">El cliente los escribe en el carrito. Uno por pedido, después de promociones.</p>
        </div>
        <NextLink href="/admin/cupones/nuevo" className={buttonVariants()}>
          <Plus />
          Nuevo cupón
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
  const { data, error } = await supabase.from("cupones").select("*").order("creado_en", { ascending: false });
  if (error) return <p className="text-danger">No se pudieron leer los cupones.</p>;
  if (!data.length) {
    return (
      <p className="rounded-tarjeta border border-border bg-surface p-8 text-center text-muted">
        Todavía no hay cupones. Creá el primero con «Nuevo cupón».
      </p>
    );
  }

  // eslint-disable-next-line react-hooks/purity -- página dinámica: se calcula en cada pedido.
  const ahora = Date.now();
  return (
    <Table className="rounded-tarjeta border border-border bg-surface">
      <Table.ScrollContainer>
        <Table.Content aria-label="Cupones">
          <Table.Header>
            <Table.Column isRowHeader>Código</Table.Column>
            <Table.Column>Descuento</Table.Column>
            <Table.Column>Mínimo</Table.Column>
            <Table.Column>Usos</Table.Column>
            <Table.Column>Fechas</Table.Column>
            <Table.Column>Estado</Table.Column>
            <Table.Column>Activo</Table.Column>
          </Table.Header>
          <Table.Body>
            {data.map((c) => {
              const v = vigencia({ activa: c.activo, desde: c.desde, hasta: c.hasta }, ahora);
              const agotado = c.usos_maximos !== null && c.usos >= c.usos_maximos;
              return (
                <Table.Row key={c.id} id={c.id}>
                  <Table.Cell>
                    <NextLink href={`/admin/cupones/${c.id}`} className="font-mono font-medium hover:underline">
                      {c.codigo}
                    </NextLink>
                  </Table.Cell>
                  <Table.Cell className="tabular-nums">{describirCupon({ tipo: c.tipo, valor: Number(c.valor) })}</Table.Cell>
                  <Table.Cell className="tabular-nums text-muted">
                    {Number(c.minimo_compra) > 0 ? formatearPrecio(c.minimo_compra) : "—"}
                  </Table.Cell>
                  <Table.Cell className="tabular-nums">
                    {c.usos} / {c.usos_maximos ?? "∞"}
                  </Table.Cell>
                  <Table.Cell className="whitespace-nowrap text-muted">{v.texto}</Table.Cell>
                  <Table.Cell>
                    <Chip size="sm" variant={agotado ? "tertiary" : CHIP_VIGENCIA[v.estado].variante}>
                      {agotado ? "Agotado" : CHIP_VIGENCIA[v.estado].texto}
                    </Chip>
                  </Table.Cell>
                  <Table.Cell>
                    <SwitchActivoCupon id={c.id} activo={c.activo} nombre={c.codigo} />
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
