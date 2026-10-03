# Descripción rica

[← Índice web](INDICE.md)

La descripción de un producto admite títulos, listas, negritas, links y **tablas**
(comparativas, tablas de talles, especificaciones). Se edita con TipTap en el
dashboard y se guarda como JSON en `productos.descripcion` (ver
[esquema](../supabase/esquema.md#productos)).

## Por qué JSON y no HTML ni Markdown

- **HTML guardado + `dangerouslySetInnerHTML` es XSS** en cuanto alguien pega un
  `<img onerror>` desde otra página. Sanitizar es una capa más que se puede olvidar.
- Markdown con tablas GFM obliga al admin a escribir `| --- |` a mano.
- El JSON de TipTap sólo puede contener los nodos que declaran las extensiones, se
  renderiza a elementos React sin pasar por strings HTML y se edita WYSIWYG.

## Extensiones: una sola lista

`lib/descripcion/extensiones.ts` exporta la lista que usan **tanto el editor como el
renderer**: StarterKit v3 (ya incluye `Link`; sin `codeBlock`, `code` ni `horizontalRule`) y
`TableKit` de `@tiptap/extension-table` (tabla, fila, encabezado y celda). Los links sólo
aceptan `http(s)` y salen con `rel="noopener nofollow"`.

**Si el editor tiene una extensión que el renderer no, el contenido de ese nodo
desaparece en la tienda** (o el renderer tira error por nodo desconocido). Por eso no
hay dos listas.

## Editor (dashboard)

- `components/admin/editor-descripcion.tsx` (productos y combos), `'use client'`, con
  `useEditor({ immediatelyRender: false, … })`. **Sin `immediatelyRender: false` hay
  hydration mismatch** en Next: TipTap intenta renderizar en el servidor un DOM que
  después no coincide. El estado de los botones sale de `useEditorState`.
- Barra con `Toolbar` + `ToggleButton` / `Button` de HeroUI. Tablas: insertar 3×3 con
  encabezado; dentro de una tabla, + / − fila y columna y borrar tabla.

## Guardado

**El documento viaja al Server Action como string** (`JSON.stringify(editor.getJSON())`)
y `guardarDescripcion` lo parsea. Pasar el objeto directo **falla con tablas y títulos**:
ProseMirror crea los `attrs` de los nodos con `Object.create(null)`, React no los
serializa como datos al llamar un action (los convierte en referencias temporales
opacas) y el servidor recibe algo que no puede leer: *"Cannot access colspan on the
server"*. El texto plano no tiene `attrs`, así que el bug no se ve hasta que alguien
mete una tabla. Ya pasó.

En el action: tamaño máximo ~100 KB, raíz `doc`, y `generateText` con la lista
compartida de extensiones, que además **valida**: un nodo desconocido tira error y se
rechaza la descripción. Si queda sin texto, se guarda `null`.

El Server Action guarda dos columnas:

- `descripcion` — el JSON.
- `descripcion_texto` — texto plano extraído (`generateText` de TipTap). **Obligatorio**:
  lo usan la búsqueda (ver [busqueda](../supabase/busqueda.md)) y la meta description.
  Si sólo se guarda el JSON, el producto no aparece al buscar por palabras de su
  descripción.

## Render (tienda)

- Server component `components/tienda/descripcion.tsx` con el static renderer de
  TipTap (`renderToReactElement` de `@tiptap/static-renderer/pm/react`) y la lista
  compartida. El contenedor con scroll de las tablas se agrega con `options.nodeMapping.table`,
  no con CSS sobre `prose`.
  No carga el editor ni ProseMirror en el bundle de la tienda.
- Envuelto en `prose` de `@tailwindcss/typography` (con `dark:prose-invert`).
- **Cada tabla va dentro de un contenedor `overflow-x-auto`.** Una tabla de talles de
  8 columnas en un celular desborda y genera scroll horizontal de toda la página.

## Links

El botón de link abre un `Modal` de HeroUI (no `window.prompt`); "www.ejemplo.com"
se completa con `https://`.

## Ver también

- [HeroUI](heroui.md#excepciones-lo-que-heroui-no-trae)
- [Esquema](../supabase/esquema.md#productos)
- [Búsqueda](../supabase/busqueda.md)
