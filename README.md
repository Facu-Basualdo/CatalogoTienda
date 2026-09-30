# Tienda — catálogo genérico

Tienda online de portfolio con catálogo genérico: sirve igual para ropa que para
electrónica. Los productos se describen con **etiquetas agrupadas** (`Talle: M`,
`Tasa de refresco: 144 Hz`, `Material: 100% algodón`) que alimentan filtros
facetados, tienen **variantes con stock propio** (talle × color, memoria ×
almacenamiento), varias imágenes y una descripción rica con tablas.

Estética minimalista en blanco y negro, pensada primero para el celular.

## Stack

| Capa | Tecnología |
|---|---|
| Frontend | Next.js 16 (App Router, Cache Components) · React 19 · TypeScript |
| UI | HeroUI v3 · Tailwind CSS v4 · Embla (carruseles) · TipTap v3 (descripciones) |
| Datos | Supabase: Postgres 17 con RLS, Storage, Auth |
| Deploy | Vercel |

## Qué tiene

**Hecho**

- Home con carrusel de banners (imagen distinta en desktop y mobile), destacados y
  categorías.
- Catálogo con filtros facetados en la URL (`/catalogo?cat=ropa&talle=m&color=negro`):
  AND entre grupos, OR dentro de un grupo, conteos que no se anulan al tildar,
  búsqueda sin tildes (`algodon` encuentra `algodón`, `144hz` encuentra `144 Hz`),
  orden y paginación.
- Ficha de producto con galería, selector de variantes que distingue combinaciones
  agotadas de inexistentes, stock bajo, tabla de características automática y
  descripción con tablas.
- Filtros por variante que exigen **una misma variante con stock**: `talle=xl&color=negro`
  no muestra una remera que sólo tiene XL blanca y L negra.
- Seguridad resuelta en la base: grants explícitos + Row Level Security. Los
  borradores no salen por la API; `anon` no puede escribir.
- Datos de demo: 20 productos de dos rubros con imágenes generadas.

**En camino** (ver [el plan](docs/plan-implementacion.md))

- Dashboard: productos, variantes y stock, imágenes con recorte obligatorio,
  etiquetas, categorías y banners.
- Carrito con pedido por WhatsApp, guardado en la base.
- Promociones (% o monto, N×M, 2da unidad), combos y cupones de descuento.

## Estructura

```
web/          App Next.js (lo que se despliega en Vercel)
supabase/     Migraciones SQL, seed y configuración de la CLI
claude/       Documentación técnica en notas (pensada para agentes, legible por humanos)
docs/         Plan de implementación
scripts/      Verificador de la documentación
```

## Correrlo en local

Requisitos: Node 20+ y un proyecto de Supabase.

```bash
cd web
npm install
cp .env.example .env      # completar con los datos del proyecto de Supabase
npm run dev               # http://localhost:3000
```

### Preparar la base

Desde la raíz del repo, con `DATABASE_URL` (Supabase → Connect → Session pooler,
puerto 5432, contraseña *percent-encoded*):

```bash
npx supabase db push --db-url "$DATABASE_URL"            # esquema, RLS, funciones, bucket
npx supabase db query --db-url "$DATABASE_URL" -f supabase/seed.sql   # datos de demo
cd web && node scripts/sembrar-imagenes.mjs              # imágenes de demo (usa SUPABASE_SECRET_KEY, sólo local)
```

Para el dashboard: en Supabase deshabilitá los sign-ups, creá un usuario en
Authentication → Users y agregalo como admin:

```sql
insert into admins (user_id) values ('<uuid del usuario>');
```

### Tipos de la base

Después de cada migración:

```bash
npx supabase gen types --lang typescript --db-url "$DATABASE_URL" --schema public > web/lib/supabase/database.types.ts
```

## Deploy en Vercel

- Root Directory: `web`.
- Variables: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`,
  `NEXT_PUBLIC_SITIO_URL`, `NEXT_PUBLIC_WHATSAPP`. **No** subas `DATABASE_URL` ni la
  secret key: la app no las usa.
- Las migraciones no las aplica el build: `supabase db push` antes de desplegar código
  que las necesite.

## Documentación

La documentación técnica vive en [`claude/`](claude/) como un grafo de notas cortas:
cada una arranca por el problema que resuelve y cierra con enlaces a las relacionadas.
Punto de entrada: [`CLAUDE.md`](CLAUDE.md). Para verificar que no haya enlaces rotos
ni notas huérfanas:

```bash
node scripts/verificar-docs.mjs
```
