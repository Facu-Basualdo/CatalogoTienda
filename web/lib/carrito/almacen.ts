"use client";

import { useSyncExternalStore } from "react";

// El carrito guarda SÓLO ids y cantidades, nunca precios: los precios los calcula
// cotizar_carrito en la base. Ver claude/web/carrito.md
export type ItemCarrito =
  | { tipo: "variante"; varianteId: string; cantidad: number }
  /** `variantes`: la elegida de cada producto, en el orden de los ítems del combo. */
  | { tipo: "combo"; comboId: string; variantes: string[]; cantidad: number };

/** Identidad de la línea: la misma `clave` que devuelve cotizar. Ver claude/web/combos.md */
export function claveItem(i: ItemCarrito): string {
  return i.tipo === "combo" ? `combo:${i.comboId}:${i.variantes.join(",")}` : i.varianteId;
}

const CLAVE = "carrito:v1";
const MAX_LINEAS = 30;
const MAX_CANTIDAD = 20;
const VACIO: ItemCarrito[] = [];

let cache: ItemCarrito[] | null = null;
const oyentes = new Set<() => void>();

const esTexto = (x: unknown): x is string => typeof x === "string" && x.length > 0 && x.length < 64;

function validar(valor: unknown): ItemCarrito[] {
  if (!Array.isArray(valor)) return [];
  const salida: ItemCarrito[] = [];
  for (const i of valor) {
    if (typeof i !== "object" || i === null || !Number.isInteger(i.cantidad)) continue;
    const cantidad = Math.min(Math.max(i.cantidad, 1), MAX_CANTIDAD);
    if (i.tipo === "combo") {
      if (esTexto(i.comboId) && Array.isArray(i.variantes) && i.variantes.length <= 10 && i.variantes.every(esTexto))
        salida.push({ tipo: "combo", comboId: i.comboId, variantes: i.variantes, cantidad });
    } else if (esTexto(i.varianteId)) salida.push({ tipo: "variante", varianteId: i.varianteId, cantidad });
  }
  return salida.slice(0, MAX_LINEAS);
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

function sumar(nuevo: ItemCarrito): boolean {
  const items = leer();
  const clave = claveItem(nuevo);
  const existente = items.find((i) => claveItem(i) === clave);
  if (!existente && items.length >= MAX_LINEAS) return false;
  escribir(
    existente
      ? items.map((i) => (claveItem(i) === clave ? { ...i, cantidad: Math.min(i.cantidad + nuevo.cantidad, MAX_CANTIDAD) } : i))
      : [...items, { ...nuevo, cantidad: Math.min(nuevo.cantidad, MAX_CANTIDAD) }],
  );
  return true;
}

// Las líneas se identifican por clave (claveItem), no por variante: un combo no tiene una.
export const carrito = {
  agregar(varianteId: string, cantidad = 1): boolean {
    return sumar({ tipo: "variante", varianteId, cantidad });
  },
  agregarCombo(comboId: string, variantes: string[], cantidad = 1): boolean {
    return sumar({ tipo: "combo", comboId, variantes, cantidad });
  },
  fijarCantidad(clave: string, cantidad: number) {
    escribir(
      leer().map((i) =>
        claveItem(i) === clave ? { ...i, cantidad: Math.min(Math.max(Math.floor(cantidad), 1), MAX_CANTIDAD) } : i,
      ),
    );
  },
  quitar(clave: string) {
    escribir(leer().filter((i) => claveItem(i) !== clave));
  },
  vaciar() {
    escribir(VACIO);
  },
};

// ---------------------------------------------------------------- cupón
// Sólo el código que escribió el cliente. Si vale y cuánto descuenta lo dice cotizar:
// la tabla de cupones no es legible desde el navegador. Ver claude/web/cupones.md
const CLAVE_CUPON = "carrito:cupon";
let cupon: string | null = null;
const oyentesCupon = new Set<() => void>();

function leerCupon(): string {
  if (cupon !== null) return cupon;
  try {
    cupon = (window.localStorage.getItem(CLAVE_CUPON) ?? "").slice(0, 30);
  } catch {
    cupon = "";
  }
  return cupon;
}

export function useCupon(): string {
  return useSyncExternalStore(
    (f) => {
      oyentesCupon.add(f);
      return () => oyentesCupon.delete(f);
    },
    leerCupon,
    () => "",
  );
}

export function fijarCupon(codigo: string) {
  cupon = codigo.trim().toUpperCase().slice(0, 30);
  try {
    if (cupon) window.localStorage.setItem(CLAVE_CUPON, cupon);
    else window.localStorage.removeItem(CLAVE_CUPON);
  } catch {
    // Sin almacenamiento: dura lo que la pestaña.
  }
  oyentesCupon.forEach((f) => f());
}
