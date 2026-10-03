import { ArrowLeft } from "@gravity-ui/icons";
import { Skeleton, Table } from "@heroui/react";
import type { Metadata } from "next";
import NextLink from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import type { EstadoPedido } from "../acciones";
import { AccionesPedido } from "@/components/admin/pedidos/acciones-pedido";
import { ChipEstado } from "@/components/admin/pedidos/estado";
import { Seccion } from "@/components/admin/seccion";
import { requerirAdmin } from "@/lib/auth";
import { formatearPrecio } from "@/lib/formato";

export const metadata: Metadata = { title: "Pedido" };

const fecha = new Intl.DateTimeFormat("es-AR", { dateStyle: "long", timeStyle: "short", timeZone: "America/Argentina/Buenos_Aires" });

export default function PaginaPedido(props: PageProps<"/admin/pedidos/[id]">) {
  return (
    <div className="flex flex-col gap-5">
      <NextLink href="/admin/pedidos" className="flex items-center gap-2 self-start text-sm text-muted hover:text-foreground">
        <ArrowLeft className="size-4" /> Pedidos
      </NextLink>
      <Suspense fallback={<Skeleton className="h-96 rounded-tarjeta" />}>
        <Detalle params={props.params} />
      </Suspense>
    </div>
  );
}

async function Detalle({ params }: { params: PageProps<"/admin/pedidos/[id]">["params"] }) {
  const { id } = await params;
  const { supabase } = await requerirAdmin();
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();

  const { data: p } = await supabase
    .from("pedidos")
    .select(
      `id, numero, estado, nombre, notas, subtotal, descuento_promociones, descuento_cupon, total, cupon_codigo, creado_en, actualizado_en,
       items:pedido_items(id, descripcion, detalle, sku, cantidad, precio_unitario, descuento, subtotal, orden, producto_id, combo_id, padre_id, promo)`,
    )
    .eq("id", id)
    .maybeSingle();
  if (!p) notFound();
  // Un combo es una fila padre (con el precio) y una hija por variante (precio 0, la que
  // mueve el stock). Las hijas van debajo de su padre. Ver claude/supabase/combos.md
  const porOrden = (a: { orden: number }, b: { orden: number }) => a.orden - b.orden;
  const items = p.items
    .filter((i) => !i.padre_id)
    .sort(porOrden)
    .flatMap((i) => [i, ...p.items.filter((h) => h.padre_id === i.id).sort(porOrden)]);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">Pedido #{p.numero}</h1>
          <ChipEstado estado={p.estado as EstadoPedido} />
        </div>
        <AccionesPedido id={p.id} estado={p.estado as EstadoPedido} numero={p.numero} />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_20rem]">
        <Seccion titulo="Productos" descripcion="Copia de cómo estaban al momento del pedido: si después cambian, el pedido no.">
          <Table>
            <Table.ScrollContainer>
              <Table.Content aria-label="Productos del pedido">
                <Table.Header>
                  <Table.Column isRowHeader>Producto</Table.Column>
                  <Table.Column>Cantidad</Table.Column>
                  <Table.Column>Precio</Table.Column>
                  <Table.Column>Subtotal</Table.Column>
                </Table.Header>
                <Table.Body>
                  {items.map((i) => (
                    <Table.Row key={i.id} id={i.id}>
                      <Table.Cell>
                        <div className={`flex flex-col ${i.padre_id ? "border-l-2 border-border pl-3" : ""}`}>
                          {!i.padre_id && i.combo_id ? (
                            <NextLink href={`/admin/combos/${i.combo_id}`} className="font-medium hover:underline">
                              Combo: {i.descripcion}
                            </NextLink>
                          ) : i.producto_id ? (
                            <NextLink href={`/admin/productos/${i.producto_id}`} className="font-medium hover:underline">
                              {i.descripcion}
                            </NextLink>
                          ) : (
                            <span className="font-medium">{i.descripcion} (ya no existe)</span>
                          )}
                          {!(i.combo_id && !i.padre_id) && (
                            <span className="text-xs text-muted">
                              {[i.detalle, i.sku && `SKU ${i.sku}`].filter(Boolean).join(" · ")}
                            </span>
                          )}
                          {i.promo && Number(i.descuento) > 0 && (
                            <span className="text-xs text-muted">
                              {i.promo}: -{formatearPrecio(i.descuento)}
                            </span>
                          )}
                        </div>
                      </Table.Cell>
                      <Table.Cell className="tabular-nums">{i.cantidad}</Table.Cell>
                      <Table.Cell className="tabular-nums">{i.padre_id ? "—" : formatearPrecio(i.precio_unitario)}</Table.Cell>
                      <Table.Cell className="tabular-nums">{i.padre_id ? "—" : formatearPrecio(i.subtotal)}</Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table.Content>
            </Table.ScrollContainer>
          </Table>
        </Seccion>

        <div className="flex flex-col gap-5">
          <Seccion titulo="Resumen">
            <dl className="flex flex-col gap-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted">Subtotal</dt>
                <dd className="tabular-nums">{formatearPrecio(p.subtotal)}</dd>
              </div>
              {Number(p.descuento_promociones) > 0 && (
                <div className="flex justify-between">
                  <dt className="text-muted">Promociones</dt>
                  <dd className="tabular-nums">-{formatearPrecio(p.descuento_promociones)}</dd>
                </div>
              )}
              {Number(p.descuento_cupon) > 0 && (
                <div className="flex justify-between">
                  <dt className="text-muted">Cupón {p.cupon_codigo}</dt>
                  <dd className="tabular-nums">-{formatearPrecio(p.descuento_cupon)}</dd>
                </div>
              )}
              <div className="flex justify-between border-t border-border pt-2 text-base font-semibold">
                <dt>Total</dt>
                <dd className="tabular-nums">{formatearPrecio(p.total)}</dd>
              </div>
            </dl>
          </Seccion>
          <Seccion titulo="Cliente">
            <dl className="flex flex-col gap-3 text-sm">
              <div>
                <dt className="text-muted">Nombre</dt>
                <dd className="font-medium">{p.nombre}</dd>
              </div>
              {p.notas && (
                <div>
                  <dt className="text-muted">Notas</dt>
                  <dd className="whitespace-pre-wrap">{p.notas}</dd>
                </div>
              )}
              <div>
                <dt className="text-muted">Creado</dt>
                <dd>{fecha.format(new Date(p.creado_en))}</dd>
              </div>
              {p.actualizado_en !== p.creado_en && (
                <div>
                  <dt className="text-muted">Último cambio</dt>
                  <dd>{fecha.format(new Date(p.actualizado_en))}</dd>
                </div>
              )}
            </dl>
            <p className="text-xs text-muted">El contacto sigue por WhatsApp: el cliente te escribe con el número de pedido.</p>
          </Seccion>
        </div>
      </div>
    </>
  );
}
