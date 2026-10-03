"use client";

import { Bars } from "@gravity-ui/icons";
import { Button, Drawer } from "@heroui/react";
import NextLink from "next/link";
import { useState } from "react";
import type { Categoria } from "@/lib/catalogo/lecturas";

export function MenuMovil({ categorias }: { categorias: Categoria[] }) {
  const [abierto, setAbierto] = useState(false);
  const cerrar = () => setAbierto(false);

  return (
    <div className="md:hidden">
      <Button
        isIconOnly
        variant="ghost"
        aria-label="Abrir menú"
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
              <Drawer.Heading>Menú</Drawer.Heading>
            </Drawer.Header>
            <Drawer.Body>
              <nav aria-label="Categorías" className="flex flex-col gap-5">
                <NextLink href="/catalogo" onClick={cerrar} className="font-medium">
                  Todos los productos
                </NextLink>
                <NextLink href="/combos" onClick={cerrar} className="font-medium">
                  Combos
                </NextLink>
                <NextLink href="/ofertas" onClick={cerrar} className="font-medium">
                  Ofertas
                </NextLink>
                {categorias.map((c) => (
                  <div key={c.id} className="flex flex-col gap-2.5">
                    <NextLink href={`/catalogo?cat=${c.slug}`} onClick={cerrar} className="font-medium">
                      {c.nombre}
                    </NextLink>
                    {c.hijas.map((h) => (
                      <NextLink
                        key={h.slug}
                        href={`/catalogo?cat=${h.slug}`}
                        onClick={cerrar}
                        className="pl-3 text-sm text-muted"
                      >
                        {h.nombre}
                      </NextLink>
                    ))}
                  </div>
                ))}
              </nav>
            </Drawer.Body>
          </Drawer.Dialog>
        </Drawer.Content>
      </Drawer.Backdrop>
    </div>
  );
}
