"use client";

import { useSyncExternalStore } from "react";

// El carrito guarda SÓLO ids y cantidades, nunca precios: los precios los calcula
// cotizar_carrito en la base. Ver claude/web/carrito.md
export type ItemCarrito = { tipo: "variante"; varianteId: string; cantidad: number };

const CLAVE = "carrito:v1";
const MAX_LINEAS = 30;
const MAX_CANTIDAD = 20;
const VACIO: ItemCarrito[] = [];

let cache: ItemCarrito[] | null = null;
const oyentes = new Set<() => void>();

function validar(valor: unknown): ItemCarrito[] {
  if (!Array.isArray(valor)) return [];
  return valor
    .filter(
      (i): i is ItemCarrito =>
        typeof i === "object" && i !== null && typeof i.varianteId === "string" && Number.isInteger(i.cantidad),
    )
    .map((i) => ({ tipo: "variante" as const, varianteId: i.varianteId, cantidad: Math.min(Math.max(i.cantidad, 1), MAX_CANTIDAD) }))
    .slice(0, MAX_LINEAS);
}

function leer(): ItemCarrito[] {
  if (cache) return cache;
  // localStorage puede no existir (modo privado, bloqueado): el carrito queda en memoria.
  try {
    const crudo = window.localStorage.getItem(CLAVE);
    cache = crudo ? validar(JSON.parse(crudo)) : VACIO;
  } catch {
    cache = VACIO;
  }
  return cache;
}

function escribir(items: ItemCarrito[]) {
  cache = items;
  try {
    window.localStorage.setItem(CLAVE, JSON.stringify(items));
  } catch {
    // Sin almacenamiento: sigue funcionando mientras dure la pestaña.
  }
  oyentes.forEach((f) => f());
}

function suscribir(f: () => void) {
  oyentes.add(f);
  // Otra pestaña modificó el carrito.
  const alCambiarStorage = (e: StorageEvent) => {
    if (e.key === CLAVE) {
      cache = null;
      f();
    }
  };
  window.addEventListener("storage", alCambiarStorage);
  return () => {
    oyentes.delete(f);
    window.removeEventListener("storage", alCambiarStorage);
  };
}

/** Items del carrito. En el servidor (y antes de hidratar) devuelve vacío. */
export function useCarrito(): ItemCarrito[] {
  return useSyncExternalStore(suscribir, leer, () => VACIO);
}

export function cantidadTotal(items: ItemCarrito[]): number {
  return items.reduce((n, i) => n + i.cantidad, 0);
}

export const carrito = {
  agregar(varianteId: string, cantidad = 1): boolean {
    const items = leer();
    const existente = items.find((i) => i.varianteId === varianteId);
    if (!existente && items.length >= MAX_LINEAS) return false;
    escribir(
      existente
        ? items.map((i) =>
            i.varianteId === varianteId ? { ...i, cantidad: Math.min(i.cantidad + cantidad, MAX_CANTIDAD) } : i,
          )
        : [...items, { tipo: "variante", varianteId, cantidad: Math.min(cantidad, MAX_CANTIDAD) }],
    );
    return true;
  },
  fijarCantidad(varianteId: string, cantidad: number) {
    escribir(
      leer().map((i) =>
        i.varianteId === varianteId ? { ...i, cantidad: Math.min(Math.max(Math.floor(cantidad), 1), MAX_CANTIDAD) } : i,
      ),
    );
  },
  quitar(varianteId: string) {
    escribir(leer().filter((i) => i.varianteId !== varianteId));
  },
  vaciar() {
    escribir(VACIO);
  },
};
