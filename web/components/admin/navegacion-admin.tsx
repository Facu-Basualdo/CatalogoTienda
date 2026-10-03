"use client";

import {
  Bars,
  Box,
  Gear,
  House,
  LayoutHeaderCells,
  Percent,
  Picture,
  Receipt,
  Tag,
  Tags,
} from "@gravity-ui/icons";
import { Button, Chip, Drawer } from "@heroui/react";
import NextLink from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, useState } from "react";

// Secciones del panel. `listo: false` se muestra deshabilitada con "Pronto": el orden
// de construcción está en docs/plan-implementacion.md.
const SECCIONES = [
  { href: "/admin", titulo: "Inicio", icono: House, listo: true },
  { href: "/admin/productos", titulo: "Productos", icono: Box, listo: true },
  { href: "/admin/pedidos", titulo: "Pedidos", icono: Receipt, listo: true },
  { href: "/admin/combos", titulo: "Combos", icono: LayoutHeaderCells, listo: true },
  { href: "/admin/promociones", titulo: "Promociones", icono: Percent, listo: true },
  { href: "/admin/cupones", titulo: "Cupones", icono: Tag, listo: false },
  { href: "/admin/banners", titulo: "Banners", icono: Picture, listo: false },
  { href: "/admin/etiquetas", titulo: "Etiquetas", icono: Tags, listo: false },
  { href: "/admin/categorias", titulo: "Categorías", icono: Gear, listo: false },
] as const;

// usePathname es dato de la URL: en rutas dinámicas (/admin/productos/[id]) tiene que
// estar dentro de un Suspense o el build falla. Fallback: la misma lista sin activa.
function Enlaces({ alNavegar }: { alNavegar?: () => void }) {
  return (
    <Suspense fallback={<Lista pathname="" alNavegar={alNavegar} />}>
      <EnlacesConRuta alNavegar={alNavegar} />
    </Suspense>
  );
}

function EnlacesConRuta({ alNavegar }: { alNavegar?: () => void }) {
  return <Lista pathname={usePathname()} alNavegar={alNavegar} />;
}

function Lista({ pathname, alNavegar }: { pathname: string; alNavegar?: () => void }) {
  return (
    <nav aria-label="Secciones del panel" className="flex flex-col gap-1">
      {SECCIONES.map(({ href, titulo, icono: Icono, listo }) => {
        const activa = href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
        if (!listo) {
          return (
            <span
              key={href}
              aria-disabled
              className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-muted opacity-60"
            >
              <Icono className="size-4" aria-hidden />
              {titulo}
              <Chip size="sm" variant="secondary" className="ml-auto">
                Pronto
              </Chip>
            </span>
          );
        }
        return (
          <NextLink
            key={href}
            href={href}
            onClick={alNavegar}
            aria-current={activa ? "page" : undefined}
            className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors ${
              activa ? "bg-foreground font-medium text-background" : "hover:bg-surface-secondary"
            }`}
          >
            <Icono className="size-4" aria-hidden />
            {titulo}
          </NextLink>
        );
      })}
    </nav>
  );
}

export function NavegacionLateral() {
  return (
    <aside className="hidden w-60 shrink-0 lg:block">
      <div className="sticky top-20 rounded-tarjeta border border-border bg-surface p-3">
        <Enlaces />
      </div>
    </aside>
  );
}

export function NavegacionMovil() {
  const [abierto, setAbierto] = useState(false);
  return (
    <div className="lg:hidden">
      <Button
        isIconOnly
        variant="ghost"
        aria-label="Abrir menú del panel"
        className="text-encabezado-foreground"
        onPress={() => setAbierto(true)}
      >
        <Bars />
      </Button>
      <Drawer.Backdrop isOpen={abierto} onOpenChange={setAbierto}>
        <Drawer.Content placement="left">
          <Drawer.Dialog>
            <Drawer.CloseTrigger />
            <Drawer.Header>
              <Drawer.Heading>Panel</Drawer.Heading>
            </Drawer.Header>
            <Drawer.Body>
              <Enlaces alNavegar={() => setAbierto(false)} />
            </Drawer.Body>
          </Drawer.Dialog>
        </Drawer.Content>
      </Drawer.Backdrop>
    </div>
  );
}
