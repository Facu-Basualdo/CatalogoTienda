import { ChevronLeft, ChevronRight } from "@gravity-ui/icons";
import { Skeleton, Table } from "@heroui/react";
import { buttonVariants } from "@heroui/styles";
import type { Metadata } from "next";
import NextLink from "next/link";
import { Suspense } from "react";
import type { EstadoPedido } from "./acciones";
import { ChipEstado } from "@/components/admin/pedidos/estado";
import { FILTROS_ESTADO, FiltrosPedidos, type FiltroEstado } from "@/components/admin/pedidos/filtros-pedidos";
import { requerirAdmin } from "@/lib/auth";
import { formatearPrecio } from "@/lib/formato";

export const metadata: Metadata = { title: "Pedidos" };

const POR_PAGINA = 30;
const fecha = new Intl.DateTimeFormat("es-AR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Argentina/Buenos_Aires" });

// Shell estático + datos en su propio Suspense. Ver claude/web/dashboard.md#páginas-del-panel
export default function PaginaPedidos(props: PageProps<"/admin/pedidos">) {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Pedidos</h1>
        <p className="text-sm text-muted">Llegan desde el carrito de la tienda. Confirmar un pedido descuenta el stock.</p>
      </div>
      <Suspense fallback={<Skeleton className="h-12 rounded-xl" />}>
        <FiltrosPedidos />
      </Suspense>
      <Suspense fallback={<Skeleton className="h-96 rounded-tarjeta" />}>
        <Listado searchParams={props.searchParams} />
      </Suspense>
    </div>
  );
}

async function Listado({ searchParams }: { searchParams: PageProps<"/admin/pedidos">["searchParams"] }) {
  const sp = await searchParams;
  const { supabase } = await requerirAdmin();
  const q = typeof sp.q === "string" ? sp.q.trim().slice(0, 80) : "";
  const estado = (typeof sp.estado === "string" && sp.estado in FILTROS_ESTADO ? sp.estado : "activos") as FiltroEstado;
  const pagina = Math.max(1, Number(sp.pagina) || 1);

  let consulta = supabase
    .from("pedidos")
    .select("id, numero, estado, nombre, total, creado_en, items:pedido_items(cantidad)", { count: "exact" })
    .order("creado_en", { ascending: false })
    .range((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA - 1);
  if (estado === "activos") consulta = consulta.in("estado", ["pendiente", "confirmado"]);
  else if (estado !== "todos") consulta = consulta.eq("estado", estado);
  if (q) {
    const numero = Number(q.replace(/^#/, ""));
    consulta = Number.isInteger(numero) && numero > 0 ? consulta.eq("numero", numero) : consulta.ilike("nombre", `%${q}%`);
  }
  const { data, count, error } = await consulta;
  if (error) return <p className="text-danger">No se pudieron leer los pedidos.</p>;

  const total = count ?? 0;
  const paginas = Math.max(1, Math.ceil(total / POR_PAGINA));
  const url = (n: number) => {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (estado !== "activos") p.set("estado", estado);
    if (n > 1) p.set("pagina", String(n));
    return `/admin/pedidos${p.size ? `?${p}` : ""}`;
  };

  if (!data.length) {
    return <p className="rounded-tarjeta border border-border bg-surface p-8 text-center text-muted">No hay pedidos con estos filtros.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted">
        {total} {total === 1 ? "pedido" : "pedidos"}
      </p>
      <Table className="rounded-tarjeta border border-border bg-surface">
        <Table.ScrollContainer>
          <Table.Content aria-label="Pedidos">
            <Table.Header>
              <Table.Column isRowHeader>Pedido</Table.Column>
              <Table.Column>Fecha</Table.Column>
              <Table.Column>Cliente</Table.Column>
              <Table.Column>Unidades</Table.Column>
              <Table.Column>Total</Table.Column>
              <Table.Column>Estado</Table.Column>
            </Table.Header>
            <Table.Body>
              {data.map((p) => (
                <Table.Row key={p.id} id={p.id}>
                  <Table.Cell>
                    <NextLink href={`/admin/pedidos/${p.id}`} className="font-semibold hover:underline">
                      #{p.numero}
                    </NextLink>
                  </Table.Cell>
                  <Table.Cell className="text-muted">{fecha.format(new Date(p.creado_en))}</Table.Cell>
                  <Table.Cell>{p.nombre}</Table.Cell>
                  <Table.Cell className="tabular-nums">{p.items.reduce((n, i) => n + i.cantidad, 0)}</Table.Cell>
                  <Table.Cell className="tabular-nums">{formatearPrecio(p.total)}</Table.Cell>
                  <Table.Cell>
                    <ChipEstado estado={p.estado as EstadoPedido} />
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Content>
        </Table.ScrollContainer>
      </Table>
      {paginas > 1 && (
        <nav aria-label="Paginación" className="flex items-center justify-end gap-2 text-sm">
          {pagina > 1 && (
            <NextLink href={url(pagina - 1)} className={buttonVariants({ variant: "outline", size: "sm" })}>
              <ChevronLeft /> Anterior
            </NextLink>
          )}
          <span className="text-muted">
            Página {pagina} de {paginas}
          </span>
          {pagina < paginas && (
            <NextLink href={url(pagina + 1)} className={buttonVariants({ variant: "outline", size: "sm" })}>
              Siguiente <ChevronRight />
            </NextLink>
          )}
        </nav>
      )}
    </div>
  );
}
