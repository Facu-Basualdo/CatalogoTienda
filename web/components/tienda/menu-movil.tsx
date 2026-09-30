"use client";

import { Bars } from "@gravity-ui/icons";
import { Button, Drawer } from "@heroui/react";
import NextLink from "next/link";
import { Suspense, useState } from "react";
import type { Categoria } from "@/lib/catalogo/lecturas";
import { Buscador } from "./buscador";

export function MenuMovil({ categorias }: { categorias: Categoria[] }) {
  const [abierto, setAbierto] = useState(false);
  const cerrar = () => setAbierto(false);

  return (
    <div className="md:hidden">
      <Button isIconOnly variant="ghost" aria-label="Abrir menú" onPress={() => setAbierto(true)}>
        <Bars />
      </Button>
      <Drawer.Backdrop isOpen={abierto} onOpenChange={setAbierto}>
        <Drawer.Content placement="left">
          <Drawer.Dialog>
            <Drawer.CloseTrigger />
            <Drawer.Header>
              <Drawer.Heading>Menú</Drawer.Heading>
            </Drawer.Header>
            <Drawer.Body className="flex flex-col gap-6">
              <Suspense>
                <Buscador className="w-full" />
              </Suspense>
              <nav aria-label="Categorías" className="flex flex-col gap-4">
                <NextLink href="/catalogo" onClick={cerrar} className="font-medium">
                  Todo el catálogo
                </NextLink>
                {categorias.map((c) => (
                  <div key={c.id} className="flex flex-col gap-2">
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
