"use client";

import { Magnifier, Xmark } from "@gravity-ui/icons";
import { Button, Form, SearchField } from "@heroui/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

function useBusqueda() {
  const router = useRouter();
  const q = useSearchParams().get("q") ?? "";
  const [valor, setValor] = useState(q);
  const [qPrevio, setQPrevio] = useState(q);

  // Sincroniza el campo cuando la URL cambia desde afuera (links, atrás/adelante).
  if (q !== qPrevio) {
    setQPrevio(q);
    setValor(q);
  }

  const buscar = (texto: string) => {
    const limpio = texto.trim();
    router.push(limpio ? `/catalogo?q=${encodeURIComponent(limpio)}` : "/catalogo");
  };

  return { valor, setValor, buscar };
}

// Campo sobre el encabezado oscuro: fondo translúcido y botón de búsqueda a la derecha.
function Campo({ autoFocus, alBuscar }: { autoFocus?: boolean; alBuscar?: () => void }) {
  const { valor, setValor, buscar } = useBusqueda();
  const enviar = (texto: string) => {
    buscar(texto);
    alBuscar?.();
  };

  return (
    <Form
      role="search"
      className="flex w-full max-w-2xl items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        enviar(valor);
      }}
    >
      <SearchField
        aria-label="Buscar productos"
        value={valor}
        onChange={setValor}
        autoFocus={autoFocus}
        className="flex-1"
      >
        <SearchField.Group className="border-white/20 bg-white/10 text-white [--field-placeholder:oklch(75%_0_0)]">
          <SearchField.Input placeholder="¿Qué estás buscando?" className="text-white" />
          <SearchField.ClearButton className="text-white/70" />
        </SearchField.Group>
      </SearchField>
      <Button type="submit" isIconOnly aria-label="Buscar" className="bg-white text-black">
        <Magnifier />
      </Button>
    </Form>
  );
}

export function Buscador() {
  return <Campo />;
}

/** Mobile: la lupa despliega el buscador debajo del encabezado. */
export function BuscadorMovil() {
  const [abierto, setAbierto] = useState(false);

  return (
    <div className="md:hidden">
      <Button
        isIconOnly
        variant="ghost"
        aria-label={abierto ? "Cerrar búsqueda" : "Buscar"}
        aria-expanded={abierto}
        className="text-encabezado-foreground"
        onPress={() => setAbierto((a) => !a)}
      >
        {abierto ? <Xmark /> : <Magnifier />}
      </Button>
      {abierto && (
        <div className="absolute inset-x-0 top-16 border-t border-white/10 bg-encabezado px-4 py-3">
          <Campo autoFocus alBuscar={() => setAbierto(false)} />
        </div>
      )}
    </div>
  );
}
