"use client";

import { SearchField } from "@heroui/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export function Buscador({ className }: { className?: string }) {
  const router = useRouter();
  const q = useSearchParams().get("q") ?? "";
  const [valor, setValor] = useState(q);
  const [qPrevio, setQPrevio] = useState(q);

  // Sincroniza el campo cuando la URL cambia desde afuera (links, atrás/adelante).
  if (q !== qPrevio) {
    setQPrevio(q);
    setValor(q);
  }

  function buscar(texto: string) {
    const limpio = texto.trim();
    router.push(limpio ? `/catalogo?q=${encodeURIComponent(limpio)}` : "/catalogo");
  }

  return (
    <SearchField
      aria-label="Buscar productos"
      value={valor}
      onChange={setValor}
      onSubmit={buscar}
      onClear={() => setValor("")}
      className={className ?? "hidden w-64 sm:block"}
    >
      <SearchField.Group>
        <SearchField.SearchIcon />
        <SearchField.Input placeholder="Buscar productos" />
        <SearchField.ClearButton />
      </SearchField.Group>
    </SearchField>
  );
}
