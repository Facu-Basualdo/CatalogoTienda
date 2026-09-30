# Tema y marca

[← Índice web](INDICE.md)

Proyecto de portfolio con nombre y logo genéricos. **Estructura inspirada en
compragamer.com, en blanco y negro**: encabezado oscuro de dos filas, página gris clara,
contenido en superficies blancas muy redondeadas, botón de compra a todo el ancho. De la
referencia se toma la estructura, nunca su logo, nombre ni su rojo de marca.

## Marca: un solo lugar

- `web/lib/sitio.ts` exporta `SITIO`. **El nombre no se escribe literal en ningún otro
  archivo**: metadata, footer y WhatsApp lo leen de ahí.
- `web/components/logo.tsx`: monograma SVG con `fill="currentColor"`; el trazo interior
  usa `var(--logo-contraste, var(--background))`. Sobre el encabezado oscuro la "T" se
  perdía (era gris sobre blanco): el `<header>` define `--logo-contraste` con su propio
  color.
- `web/app/icon.svg`: favicon con `prefers-color-scheme` adentro del SVG.

## Dónde vive la paleta

**En `web/app/globals.css`, sobrescribiendo las variables de `@heroui/styles`** (que están
en `@layer base`; las nuestras van sin capa para ganarles, y el bloque `.dark` va
después del claro porque tienen la misma especificidad). Las variables propias se
exponen a Tailwind en `@theme inline`.

| Variable / utilidad | Uso |
|---|---|
| `--background` (gris 96.5%) | Fondo de página. **No es blanco**: el contenido va en superficies |
| `--surface` → `bg-surface` | Tarjetas, paneles, filtros, carrito |
| `--radio-tarjeta` → `rounded-tarjeta` (1.25rem) | Todo contenedor de página. Los controles usan `--radius` (0.625rem) |
| `--encabezado` → `bg-encabezado` | Encabezado y franja "cómo comprar". **Oscuro también en tema claro** |
| `--accent` | Negro (blanco en oscuro): botón principal y seleccionado |
| `--ahorro` → `bg-ahorro` | **El único color de la interfaz**: el chip "-$ 18.880" |
| `--danger` | Sólo errores y avisos que bloquean (stock en el carrito) |
| `--success`, `--warning` | Neutralizados a grises; no se usan |

## Reglas

- **El verde es sólo para el ahorro en pesos** (`ChipAhorro` en `precio.tsx`). Es
  información, no decoración: no se usa para "stock disponible", botones ni badges.
- Precio anterior tachado en `text-muted`; "Sin stock" en gris. Nada de rojo para ofertas.
- **Un botón negro por tarjeta o vista**: "Sumar al carrito" en la tarjeta, "Enviar
  pedido" en el carrito. Lo demás `outline`, `ghost` o `secondary`.
- **Seleccionado = invertido.** HeroUI pinta el `ToggleButton` seleccionado con
  `--accent-soft`, que en blanco y negro no se distingue; `globals.css` lo redefine a
  `--accent` en `.toggle-button`.
- Sobre el encabezado oscuro, los controles de HeroUI necesitan color explícito
  (`text-encabezado-foreground`); el campo de búsqueda usa `bg-white/10` y borde
  `white/20`.
- Muestras de color: `ring-1 ring-muted/60`; el negro sobre fondo oscuro desaparece con
  `border-border`.
- Títulos de sección con peso mixto: "Conocé nuestros **productos destacados**"
  (`font-light` + `<strong>`).
- Tipografía: Geist Sans y Geist Mono (SKUs).

## Ver también

- [HeroUI](heroui.md#tema)
- [Catálogo](catalogo.md)
- [Carrito](carrito.md)
- [Variantes y stock](variantes-y-stock.md)
