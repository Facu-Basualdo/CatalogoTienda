# Tema y marca

[← Índice web](INDICE.md)

Proyecto de portfolio: nombre y logo genéricos, estética **minimalista en blanco y
negro**. El color lo ponen las fotos de los productos; la interfaz se queda neutra
para no competir con ellas.

## Marca: un solo lugar

- `web/lib/sitio.ts` exporta `SITIO = { nombre: 'Tienda', descripcion, url, whatsapp, moneda, locale }`.
  **El nombre no se escribe literal en ningún otro archivo**: metadata, footer, Open
  Graph y mensaje de WhatsApp lo leen de ahí. Renombrar la tienda es cambiar una línea.
- `web/components/logo.tsx`: monograma SVG inline + nombre, con **`fill="currentColor"`**
  y el trazo interno en `var(--background)`. Un PNG o un SVG con `#000` fijo
  desaparece en modo oscuro.
- `web/app/icon.svg`: favicon con `@media (prefers-color-scheme: dark)` adentro del SVG.

## Dónde vive la paleta

**En `web/app/globals.css`, sobrescribiendo las variables de `@heroui/styles`.** Las de
HeroUI están en `@layer base`; las nuestras van sin capa para ganarles, y el bloque
`.dark` va después del claro porque `:root` y `.dark` tienen la misma especificidad.
Si agregás una variable al bloque claro, agregala también al oscuro o en modo oscuro
queda el valor claro.

| Variable | Claro | Oscuro | Uso |
|---|---|---|---|
| `--background` / `--foreground` | blanco / `oklch(14.5% 0 0)` | invertidos | Fondo y texto |
| `--accent` | negro, texto blanco | blanco, texto negro | Acción principal (`Button` `primary`, seleccionado) |
| `--default`, `--surface-*` | grises neutros | grises neutros | Botones secundarios, tarjetas |
| `--muted` | gris 52% | gris 70% | Texto secundario |
| `--success`, `--warning` | neutralizados a grises | — | **No se usan**; neutralizados para que un uso accidental no meta color |
| `--danger` | rojo apagado | rojo apagado | **Sólo** errores y acciones destructivas |

`next-themes` pone la clase `light`/`dark` en `<html>` (sigue al sistema por defecto);
HeroUI reacciona a esa clase.

## Reglas

- **`Button` `primary` sólo en la acción principal de cada vista.** Todo lo demás
  `outline`, `ghost` o `secondary`.
- **Precio anterior tachado en `text-muted`, no en rojo.** "Sin stock" también gris
  (`Chip variant="secondary"`). El rojo queda para "algo salió mal".
- **Seleccionado = invertido.** HeroUI pinta el `ToggleButton` seleccionado con
  `--accent-soft` (15% del acento), que en blanco y negro casi no se distingue; en
  `globals.css` `.toggle-button` lo redefine a `--accent`. Si otro componente de
  selección se ve "apagado", es el mismo problema: redefinir su variable ahí, no con
  clases sueltas.
- Muestras de color (etiquetas con `color_hex`): `ring-1 ring-muted/60`, no `border-border`:
  el negro sobre fondo oscuro desaparece.
- Bordes en lugar de sombras (`--surface-shadow` y `--field-shadow` en transparente).
- Radio chico (`--radius: 0.375rem`); las superficies propias usan `rounded-[var(--radius)]`.
- Tipografía: Geist Sans y Geist Mono (SKUs) vía `next/font`.

## Ver también

- [HeroUI](heroui.md#tema)
- [Variantes y stock](variantes-y-stock.md)
- [Catálogo](catalogo.md)
