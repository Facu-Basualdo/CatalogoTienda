# HeroUI

[← Índice web](INDICE.md)

**Regla: componentes de HeroUI en lugar de elementos nativos.** Un `<button>` o un
`<select>` crudo rompe foco, tema oscuro, tamaños y accesibilidad de forma
inconsistente, y en mobile el `<select>` nativo abre el picker del sistema en vez
del listbox del resto de la app.

**Es HeroUI v3** (`@heroui/react` + `@heroui/styles`, Tailwind v4, React Aria). Casi
todo lo que se encuentra en internet es de la v2 y no aplica: no hay
`HeroUIProvider`, no hay `color="primary"`, no hay `as={NextLink}`, no hay plugin de
Tailwind con `themes`. La documentación completa para agentes está en
`https://heroui.com/react/llms-full.txt` (pesa ~5 MB: bajala y buscá por componente).

## Cómo es la v3

- **Componentes compuestos**: `Card` + `Card.Header` / `Card.Content`, `Select` +
  `Select.Trigger` / `Select.Popover` + `ListBox.Item`, `Drawer.Backdrop` →
  `Drawer.Content` → `Drawer.Dialog`. Copiá la anatomía de la doc; si falta una parte
  intermedia, el componente no se ve o no abre.
- **Checkbox y Radio cambiaron en 3.2**: `<Checkbox value>` → `<Checkbox.Content>` →
  `<Checkbox.Control><Checkbox.Indicator/></Checkbox.Control>` + texto. Referencia:
  `components/tienda/filtros/panel-filtros.tsx`.
- **`onPress`, no `onClick`** (React Aria): unifica mouse, touch y teclado.
- Variantes de `Button`: `primary` (default) · `secondary` · `tertiary` · `outline` ·
  `ghost` · `danger` · `danger-soft`. No hay prop `color`.
- Estado controlado: `CheckboxGroup value/onChange(string[])`, `Select value/onChange(Key)`,
  `SearchField value/onChange/onSubmit`, `ToggleButtonGroup selectedKeys/onSelectionChange(Set)`,
  `Drawer.Backdrop isOpen/onOpenChange`.
- Toasts: `<Toast.Provider />` una vez (está en `app/providers.tsx`) y `toast()` /
  `toast.danger()` desde cualquier client component.

## Links: el punto donde más se equivoca uno

| Caso | Cómo |
|---|---|
| Link interno común (tarjeta, nav) | `next/link` con clases de `@heroui/styles`: `linkVariants().base()` o `buttonVariants({ variant })` |
| `Link` / `Breadcrumbs.Item` de HeroUI con `href` | Funciona con navegación de Next porque `app/providers.tsx` monta el `RouterProvider` de React Aria con `router.push`. **Sin ese provider hacen recarga completa** |
| Paginación | `Pagination.Link` es un botón **sin `href`**. Se usan `<a>` reales (`next/link`) con las clases BEM `pagination__link` y `aria-current="page"`: ver `components/tienda/paginacion.tsx` |
| Chip que es link (filtro activo) | `next/link` con `chipVariants({ variant }).base()` |

Las funciones `*Variants` de `@heroui/styles` no son client components: sirven en
server components.

## Equivalencias

| Nativo | HeroUI v3 |
|---|---|
| `<button>` | `Button` (`isIconOnly` + `aria-label` para íconos) |
| `<input>` | `TextField` + `Input`, o `SearchField` para búsqueda; números con `NumberField` |
| `<textarea>` | `TextArea` |
| `<select>` | `Select` + `ListBox`; con búsqueda `ComboBox` / `Autocomplete` |
| checkbox / radio | `CheckboxGroup` + `Checkbox`, `RadioGroup` + `Radio` |
| botones de opción (talle, color) | `ToggleButtonGroup selectionMode="single"` + `ToggleButton` |
| `<dialog>` | `Modal`, `AlertDialog` para confirmaciones destructivas |
| panel lateral | `Drawer` |
| tabla de datos | `Table` |
| `<img>` | `next/image` (HeroUI no tiene `Image`) |

## Excepciones: lo que HeroUI no trae

| Necesidad | Librería | Dónde |
|---|---|---|
| Carrusel de banners y galería | Embla (`embla-carousel-react`) | `components/tienda/carrusel-banners.tsx`, `galeria.tsx` |
| Editor de descripción con tablas | TipTap v3 | Ver [descripcion-rica](descripcion-rica.md) |
| Zona de arrastrar y soltar | `react-dropzone` (sólo el hook) | Ver [imagenes](imagenes.md) |
| Recorte de imágenes | `react-easy-crop` dentro de un `Modal` | Ver [imagenes](imagenes.md) |
| Reordenar | `@dnd-kit/sortable` | Galería del formulario de producto |
| Íconos | `@gravity-ui/icons` (los que usa la doc de HeroUI). **No tiene logo de WhatsApp**: se usa `Comment` | — |

**Las tablas dentro de la descripción del producto no son `Table` de HeroUI**: son
contenido, `<table>` semántico con `prose`. `Table` es interactivo (selección, orden).

## Tema

No hay plugin ni config de temas: HeroUI lee variables CSS (`--accent`, `--default`,
`--surface`, `--danger`…) que `app/globals.css` sobrescribe. Qué colores se usan y
cuáles no: [tema-y-marca](tema-y-marca.md).

## RSC

Los componentes de HeroUI son client components. Desde un server component se usan
**sólo con props serializables**: un `onPress` definido en el server no compila. La
página (server) trae datos y se los pasa a un componente cliente chico con los
handlers (patrón de `panel-filtros.tsx`, `selector-orden.tsx`).

## Ver también

- [Tema y marca](tema-y-marca.md)
- [Catálogo](catalogo.md)
- [Descripción rica](descripcion-rica.md)
- [Imágenes](imagenes.md)
- [Etiquetas y filtros](etiquetas.md)
