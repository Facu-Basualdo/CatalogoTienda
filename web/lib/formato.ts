import { SITIO } from "@/lib/sitio";

const precio = new Intl.NumberFormat(SITIO.locale, {
  style: "currency",
  currency: SITIO.moneda,
  maximumFractionDigits: 0,
});

// PostgREST devuelve numeric como number o string según el caso; aceptamos ambos.
export function formatearPrecio(valor: number | string): string {
  return precio.format(typeof valor === "string" ? Number(valor) : valor);
}
