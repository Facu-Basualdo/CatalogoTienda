"use client";

import { CircleCheck, Comment, ShoppingCart, TrashBin } from "@gravity-ui/icons";
import { Button, Form, Input, Label, NumberField, Skeleton, TextArea, TextField, toast } from "@heroui/react";
import { buttonVariants } from "@heroui/styles";
import Image from "next/image";
import NextLink from "next/link";
import { useState } from "react";
import { carrito, useCarrito } from "@/lib/carrito/almacen";
import { aItemsRpc, useCotizacion, type LineaCotizada, type PedidoCreado } from "@/lib/carrito/cotizacion";
import { formatearPrecio } from "@/lib/formato";
import { SITIO } from "@/lib/sitio";
import { supabaseNavegador } from "@/lib/supabase/navegador";
import { urlPublica } from "@/lib/supabase/storage";

// El carrito muestra lo que calcula cotizar_carrito; nunca suma precios acá.
// Ver claude/web/carrito.md
export function PaginaCarrito() {
  const items = useCarrito();
  const { cotizacion, cargando, error } = useCotizacion(items);
  const [pedido, setPedido] = useState<(PedidoCreado & { nombre: string; notas: string }) | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [nombre, setNombre] = useState("");
  const [notas, setNotas] = useState("");

  if (pedido) return <Confirmacion pedido={pedido} />;

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-tarjeta border border-border bg-surface px-6 py-16 text-center">
        <ShoppingCart aria-hidden className="size-10 text-muted" />
        <h2 className="text-xl font-semibold">Tu carrito está vacío</h2>
        <p className="text-muted">Sumá productos desde el catálogo y enviá el pedido por WhatsApp.</p>
        <NextLink href="/catalogo" className={buttonVariants({ variant: "primary" })}>
          Ver productos
        </NextLink>
      </div>
    );
  }

  const hayProblemas = cotizacion?.lineas.some((l) => l.estado !== "ok") ?? false;

  async function enviar() {
    setEnviando(true);
    const { data, error: e } = await supabaseNavegador().rpc("crear_pedido", {
      p_items: aItemsRpc(items),
      p_nombre: nombre,
      p_notas: notas || undefined,
    });
    setEnviando(false);
    if (e) {
      // Los mensajes de crear_pedido están pensados para el cliente ("Ingresá tu nombre…").
      toast.danger(e.message || "No pudimos crear el pedido");
      return;
    }
    setPedido({ ...(data as unknown as PedidoCreado), nombre: nombre.trim(), notas: notas.trim() });
    carrito.vaciar();
  }

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[1fr_22rem]">
      <section aria-label="Productos del carrito" className="rounded-tarjeta border border-border bg-surface">
        {!cotizacion ? (
          <div className="flex flex-col gap-4 p-5">
            {items.map((i) => (
              <Skeleton key={i.varianteId} className="h-24 rounded-xl" />
            ))}
          </div>
        ) : (
          <ul className={`divide-y divide-separator transition-opacity ${cargando ? "opacity-60" : ""}`}>
            {cotizacion.lineas.map((l) => (
              <Linea key={l.variante_id} linea={l} />
            ))}
          </ul>
        )}
        {error && <p className="p-5 text-sm text-danger">{error}</p>}
      </section>

      <aside className="flex flex-col gap-4 rounded-tarjeta border border-border bg-surface p-5 lg:sticky lg:top-32">
        <h2 className="text-lg font-semibold">Resumen</h2>
        <dl className="flex flex-col gap-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted">Productos ({cotizacion?.cantidad ?? "…"})</dt>
            <dd className="tabular-nums">{cotizacion ? formatearPrecio(cotizacion.subtotal) : "…"}</dd>
          </div>
          {!!cotizacion?.descuento_promociones && (
            <div className="flex justify-between">
              <dt className="text-muted">Promociones</dt>
              <dd className="tabular-nums">-{formatearPrecio(cotizacion.descuento_promociones)}</dd>
            </div>
          )}
          <div className="flex justify-between border-t border-border pt-3 text-base font-semibold">
            <dt>Total</dt>
            <dd className="tabular-nums">{cotizacion ? formatearPrecio(cotizacion.total) : "…"}</dd>
          </div>
        </dl>

        <Form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            void enviar();
          }}
        >
          <TextField isRequired value={nombre} onChange={setNombre} maxLength={80} name="nombre">
            <Label>Tu nombre</Label>
            <Input placeholder="Para saber quién hace el pedido" />
          </TextField>
          <TextField value={notas} onChange={setNotas} maxLength={500} name="notas">
            <Label>Notas (opcional)</Label>
            <TextArea placeholder="Horario, retiro o envío, etc." rows={3} />
          </TextField>
          <Button type="submit" fullWidth size="lg" isPending={enviando} isDisabled={!cotizacion || cargando || hayProblemas}>
            <Comment />
            Enviar pedido por WhatsApp
          </Button>
          {hayProblemas && <p className="text-xs text-muted">Resolvé los avisos del carrito para poder enviar el pedido.</p>}
          <p className="text-xs text-muted">No se cobra nada ahora: coordinamos el pago y la entrega por WhatsApp.</p>
        </Form>
      </aside>
    </div>
  );
}

function Linea({ linea: l }: { linea: LineaCotizada }) {
  const maximo = Math.max(1, Math.min(l.stock, 20));
  return (
    <li className="flex gap-4 p-4 sm:p-5">
      <div className="relative aspect-[4/5] w-20 shrink-0 overflow-hidden rounded-xl bg-surface-secondary">
        {l.imagen_path && <Image src={urlPublica(l.imagen_path)} alt="" fill sizes="80px" className="object-cover" />}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            {l.slug ? (
              <NextLink href={`/p/${l.slug}?variante=${l.variante_id}`} className="line-clamp-2 text-sm font-medium hover:underline">
                {l.nombre}
              </NextLink>
            ) : (
              <p className="text-sm font-medium text-muted">Producto no disponible</p>
            )}
            {l.detalle && <p className="text-xs text-muted">{l.detalle}</p>}
          </div>
          <Button isIconOnly size="sm" variant="ghost" aria-label="Quitar del carrito" onPress={() => carrito.quitar(l.variante_id)}>
            <TrashBin />
          </Button>
        </div>

        {l.estado === "ok" || l.estado === "stock_insuficiente" ? (
          <div className="flex flex-wrap items-end justify-between gap-3">
            <NumberField
              aria-label="Cantidad"
              value={l.cantidad}
              minValue={1}
              maxValue={Math.max(maximo, l.cantidad)}
              onChange={(v) => v && carrito.fijarCantidad(l.variante_id, v)}
              className="w-32"
            >
              <NumberField.Group>
                <NumberField.DecrementButton />
                <NumberField.Input />
                <NumberField.IncrementButton />
              </NumberField.Group>
            </NumberField>
            <div className="text-right">
              <p className="text-xs text-muted tabular-nums">{formatearPrecio(l.precio_unitario)} c/u</p>
              <p className="font-semibold tabular-nums">{formatearPrecio(l.subtotal || l.precio_unitario * l.cantidad)}</p>
            </div>
          </div>
        ) : null}

        {l.estado === "stock_insuficiente" && (
          <p className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-danger">
              {l.stock === 1 ? "Queda 1 unidad." : `Quedan ${l.stock} unidades.`}
            </span>
            <Button size="sm" variant="outline" onPress={() => carrito.fijarCantidad(l.variante_id, l.stock)}>
              Llevar {l.stock}
            </Button>
          </p>
        )}
        {l.estado === "sin_stock" && <p className="text-xs text-danger">Se quedó sin stock. Quitalo para continuar.</p>}
        {l.estado === "no_disponible" && <p className="text-xs text-danger">Ya no está a la venta. Quitalo para continuar.</p>}
      </div>
    </li>
  );
}

function mensajeWhatsapp(p: PedidoCreado & { nombre: string; notas: string }) {
  const lineas = p.lineas.map(
    (l) => `• ${l.cantidad} × ${l.nombre}${l.detalle ? ` (${l.detalle})` : ""} — ${formatearPrecio(l.subtotal)}`,
  );
  return [
    `Hola! Quiero hacer el pedido #${p.numero}:`,
    ...lineas,
    `Total: ${formatearPrecio(p.total)}`,
    `Nombre: ${p.nombre}`,
    ...(p.notas ? [`Notas: ${p.notas}`] : []),
  ].join("\n");
}

function Confirmacion({ pedido }: { pedido: PedidoCreado & { nombre: string; notas: string } }) {
  const enlace = SITIO.whatsapp
    ? `https://wa.me/${SITIO.whatsapp}?text=${encodeURIComponent(mensajeWhatsapp(pedido))}`
    : null;

  return (
    <div className="mx-auto flex max-w-xl flex-col items-center gap-4 rounded-tarjeta border border-border bg-surface px-6 py-12 text-center">
      <CircleCheck aria-hidden className="size-10" />
      <h2 className="text-2xl font-semibold">Pedido #{pedido.numero} registrado</h2>
      <p className="text-muted">
        Total {formatearPrecio(pedido.total)}.{" "}
        {enlace ? "Envialo por WhatsApp para que lo confirmemos." : "Nos vamos a comunicar para confirmarlo."}
      </p>
      {/* Link y no window.open después del await: los navegadores bloquean popups que no salen de un clic. */}
      {enlace && (
        <a href={enlace} target="_blank" rel="noopener noreferrer" className={buttonVariants({ size: "lg" })}>
          <Comment />
          Abrir WhatsApp
        </a>
      )}
      <NextLink href="/catalogo" className="text-sm text-muted underline underline-offset-4 hover:text-foreground">
        Seguir comprando
      </NextLink>
    </div>
  );
}
