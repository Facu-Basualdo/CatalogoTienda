import { Pencil } from "@gravity-ui/icons";
import { Chip, Skeleton, Table } from "@heroui/react";
import { buttonVariants } from "@heroui/styles";
import type { Metadata } from "next";
import NextLink from "next/link";
import { Suspense } from "react";
import { BotonNuevoCombo } from "@/components/admin/combos/nuevo-combo";
import { SwitchVisibleCombo } from "@/components/admin/combos/switch-visible-combo";
import { requerirAdmin } from "@/lib/auth";
import { formatearPrecio } from "@/lib/formato";

export const metadata: Metadata = { title: "Combos" };

// Shell estático + datos en su propio Suspense. Ver claude/web/dashboard.md#páginas-del-panel
export default function PaginaCombos() {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Combos</h1>
          <p className="text-sm text-muted">Varios productos a un precio. El cliente elige la variante de cada uno.</p>
        </div>
        <BotonNuevoCombo />
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
    .from("combos")
    .select("id, nombre, slug, precio, publicado, destacado, items:combo_items(cantidad)")
    .order("creado_en", { ascending: false });
  if (error) return <p className="text-danger">No se pudieron leer los combos.</p>;
  if (!data.length) {
    return (
      <p className="rounded-tarjeta border border-border bg-surface p-8 text-center text-muted">
        Todavía no hay combos. Creá el primero con «Nuevo combo».
      </p>
    );
  }

  return (
    <Table className="rounded-tarjeta border border-border bg-surface">
      <Table.ScrollContainer>
        <Table.Content aria-label="Combos">
          <Table.Header>
            <Table.Column isRowHeader>Nombre</Table.Column>
            <Table.Column>Productos</Table.Column>
            <Table.Column>Precio</Table.Column>
            <Table.Column>Visible</Table.Column>
            <Table.Column>
              <span className="sr-only">Editar</span>
            </Table.Column>
          </Table.Header>
          <Table.Body>
            {data.map((c) => (
              <Table.Row key={c.id} id={c.id}>
                <Table.Cell>
                  <div className="flex items-center gap-2">
                    <NextLink href={`/admin/combos/${c.id}`} className="font-medium hover:underline">
                      {c.nombre}
                    </NextLink>
                    {c.destacado && (
                      <Chip size="sm" variant="secondary">
                        Destacado
                      </Chip>
                    )}
                  </div>
                </Table.Cell>
                <Table.Cell className="tabular-nums">
                  {c.items.length ? `${c.items.length} (${c.items.reduce((s, i) => s + i.cantidad, 0)} u.)` : "Sin productos"}
                </Table.Cell>
                <Table.Cell className="tabular-nums">{formatearPrecio(c.precio)}</Table.Cell>
                <Table.Cell>
                  <SwitchVisibleCombo id={c.id} publicado={c.publicado} nombre={c.nombre} />
                </Table.Cell>
                <Table.Cell>
                  <NextLink href={`/admin/combos/${c.id}`} aria-label={`Editar ${c.nombre}`} className={buttonVariants({ variant: "ghost", size: "sm", isIconOnly: true })}>
                    <Pencil />
                  </NextLink>
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Content>
      </Table.ScrollContainer>
    </Table>
  );
}
