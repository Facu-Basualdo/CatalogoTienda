-- Esquema inicial del catálogo. Resumen vigente en claude/supabase/esquema.md

create extension if not exists unaccent with schema extensions;

-- Schema no expuesto por la Data API: helpers de RLS y de filtros.
create schema if not exists private;

-- ---------------------------------------------------------------------------
-- Normalización de texto
-- ---------------------------------------------------------------------------

-- unaccent() es `stable`; las columnas generadas exigen `immutable`. El wrapper con
-- el diccionario explícito es el patrón estándar. Ver claude/supabase/busqueda.md
create function public.f_unaccent(texto text)
returns text
language sql immutable parallel safe strict
set search_path = ''
as $$ select extensions.unaccent('extensions.unaccent'::regdictionary, texto) $$;

-- "144Hz", "144 hz" y "144 HZ" → "144-hz". Separa número de unidad para que no
-- convivan `144hz` y `144-hz`. Ver claude/supabase/etiquetas.md#invariantes
create function public.slugify(texto text)
returns text
language sql immutable parallel safe strict
set search_path = ''
as $$
  select trim(both '-' from
    regexp_replace(
      regexp_replace(lower(public.f_unaccent(texto)), '([0-9])([a-z])', '\1-\2', 'g'),
      '[^a-z0-9]+', '-', 'g'))
$$;

create function private.tocar_actualizado_en()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.actualizado_en := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Categorías (hasta dos niveles)
-- ---------------------------------------------------------------------------

create table public.categorias (
  id        uuid primary key default gen_random_uuid(),
  slug      text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  nombre    text not null check (length(trim(nombre)) > 0),
  padre_id  uuid references public.categorias (id) on delete restrict,
  orden     int not null default 0,
  creado_en timestamptz not null default now(),
  check (padre_id is distinct from id)
);
create index categorias_padre_id_idx on public.categorias (padre_id);

create function private.validar_nivel_categoria()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.padre_id is not null and exists (
    select 1 from public.categorias where id = new.padre_id and padre_id is not null
  ) then
    raise exception 'Las categorías admiten sólo dos niveles';
  end if;
  return new;
end;
$$;

create trigger categorias_validar_nivel
before insert or update of padre_id on public.categorias
for each row execute function private.validar_nivel_categoria();

-- ---------------------------------------------------------------------------
-- Productos
-- ---------------------------------------------------------------------------

create table public.productos (
  id                uuid primary key default gen_random_uuid(),
  slug              text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  nombre            text not null check (length(trim(nombre)) > 0),
  descripcion       jsonb,                                -- documento TipTap, nunca HTML
  descripcion_texto text not null default '',             -- texto plano para búsqueda y meta
  precio            numeric(12, 2) not null default 0 check (precio >= 0),
  precio_anterior   numeric(12, 2) check (precio_anterior >= 0),
  categoria_id      uuid references public.categorias (id) on delete set null,
  publicado         boolean not null default false,       -- visible en la tienda
  destacado         boolean not null default false,
  creado_en         timestamptz not null default now(),
  actualizado_en    timestamptz not null default now(),
  busqueda          tsvector generated always as (
    setweight(to_tsvector('spanish', public.f_unaccent(nombre)), 'A') ||
    setweight(to_tsvector('spanish', public.f_unaccent(descripcion_texto)), 'B')
  ) stored
);
create index productos_categoria_id_idx on public.productos (categoria_id);
create index productos_busqueda_idx on public.productos using gin (busqueda);
create index productos_publicados_idx on public.productos (creado_en desc) where publicado;

create trigger productos_actualizado_en
before update on public.productos
for each row execute function private.tocar_actualizado_en();

-- ---------------------------------------------------------------------------
-- Etiquetas
-- ---------------------------------------------------------------------------

create table public.grupos_etiqueta (
  id                 uuid primary key default gen_random_uuid(),
  nombre             text not null check (length(trim(nombre)) > 0),
  -- Es la clave en la URL del catálogo: no puede pisar las claves reservadas.
  slug               text not null unique
                     check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
                     check (slug not in ('cat', 'q', 'orden', 'pagina')),
  orden              int not null default 0,
  visible_en_filtros boolean not null default true,
  visible_en_ficha   boolean not null default true,
  es_variante        boolean not null default false,
  creado_en          timestamptz not null default now()
);

create table public.etiquetas (
  id        uuid primary key default gen_random_uuid(),
  grupo_id  uuid not null references public.grupos_etiqueta (id) on delete cascade,
  valor     text not null check (length(trim(valor)) > 0),
  slug      text generated always as (public.slugify(valor)) stored,
  orden     int not null default 0,
  color_hex text check (color_hex ~ '^#[0-9a-f]{6}$'),  -- muestra para grupos de color
  creado_en timestamptz not null default now(),
  unique (grupo_id, slug),
  -- Redundante en apariencia: lo necesita la FK compuesta de variante_etiquetas.
  unique (id, grupo_id)
);

create table public.producto_etiquetas (
  producto_id uuid not null references public.productos (id) on delete cascade,
  etiqueta_id uuid not null references public.etiquetas (id) on delete cascade,
  primary key (producto_id, etiqueta_id)
);
create index producto_etiquetas_etiqueta_id_idx on public.producto_etiquetas (etiqueta_id);

-- ---------------------------------------------------------------------------
-- Variantes y stock. Ver claude/supabase/variantes-y-stock.md
-- ---------------------------------------------------------------------------

create table public.producto_variantes (
  id          uuid primary key default gen_random_uuid(),
  producto_id uuid not null references public.productos (id) on delete cascade,
  clave       text not null,              -- slugs de sus etiquetas: 'm/negro'; '' = variante única
  sku         text unique,
  precio      numeric(12, 2) check (precio >= 0),  -- null = usa productos.precio
  stock       int not null default 0 check (stock >= 0),
  activa      boolean not null default true,
  orden       int not null default 0,
  unique (producto_id, clave)
);
create index producto_variantes_con_stock_idx
  on public.producto_variantes (producto_id) where activa and stock > 0;

create table public.variante_etiquetas (
  variante_id uuid not null references public.producto_variantes (id) on delete cascade,
  etiqueta_id uuid not null,
  grupo_id    uuid not null,
  primary key (variante_id, grupo_id),                        -- una etiqueta por grupo
  foreign key (etiqueta_id, grupo_id) references public.etiquetas (id, grupo_id)
);
create index variante_etiquetas_etiqueta_id_idx on public.variante_etiquetas (etiqueta_id, grupo_id);

-- Talle/color van en variante_etiquetas; material/refresco en producto_etiquetas.
create function private.validar_tipo_etiqueta()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_es_variante boolean;
begin
  select g.es_variante into v_es_variante
  from public.etiquetas e
  join public.grupos_etiqueta g on g.id = e.grupo_id
  where e.id = new.etiqueta_id;

  if tg_table_name = 'variante_etiquetas' and not v_es_variante then
    raise exception 'La etiqueta % no es de un grupo de variante', new.etiqueta_id;
  elsif tg_table_name = 'producto_etiquetas' and v_es_variante then
    raise exception 'La etiqueta % es de un grupo de variante: va en la variante', new.etiqueta_id;
  end if;
  return new;
end;
$$;

create trigger variante_etiquetas_validar_tipo
before insert or update on public.variante_etiquetas
for each row execute function private.validar_tipo_etiqueta();

create trigger producto_etiquetas_validar_tipo
before insert or update on public.producto_etiquetas
for each row execute function private.validar_tipo_etiqueta();

-- es_variante no se puede cambiar en un grupo con etiquetas en uso.
create function private.bloquear_cambio_es_variante()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.es_variante is distinct from old.es_variante and (
    exists (select 1 from public.producto_etiquetas pe join public.etiquetas e on e.id = pe.etiqueta_id where e.grupo_id = old.id)
    or exists (select 1 from public.variante_etiquetas where grupo_id = old.id)
  ) then
    raise exception 'El grupo % tiene etiquetas en uso: no se puede cambiar es_variante', old.slug;
  end if;
  return new;
end;
$$;

create trigger grupos_etiqueta_bloquear_es_variante
before update of es_variante on public.grupos_etiqueta
for each row execute function private.bloquear_cambio_es_variante();

-- Todo producto nace con su variante única (sin etiquetas, stock 0).
create function private.crear_variante_unica()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  insert into public.producto_variantes (producto_id, clave) values (new.id, '');
  return new;
end;
$$;

create trigger productos_crear_variante_unica
after insert on public.productos
for each row execute function private.crear_variante_unica();

-- ---------------------------------------------------------------------------
-- Imágenes. Ver claude/supabase/imagenes.md
-- ---------------------------------------------------------------------------

create table public.producto_imagenes (
  id          uuid primary key default gen_random_uuid(),
  producto_id uuid not null references public.productos (id) on delete cascade,
  path        text not null unique,        -- path en el bucket, nunca URL
  alt         text not null default '',
  orden       int not null default 0,      -- la principal es la de menor orden; sin unique a propósito
  ancho       int check (ancho > 0),
  alto        int check (alto > 0),
  creado_en   timestamptz not null default now()
);
create index producto_imagenes_producto_idx on public.producto_imagenes (producto_id, orden);

-- ---------------------------------------------------------------------------
-- Banners de la home
-- ---------------------------------------------------------------------------

create table public.banners (
  id                 uuid primary key default gen_random_uuid(),
  titulo             text,
  subtitulo          text,
  texto_boton        text,
  imagen_path        text not null,
  imagen_mobile_path text,
  enlace             text,
  orden              int not null default 0,
  activo             boolean not null default true,
  desde              timestamptz,
  hasta              timestamptz,
  creado_en          timestamptz not null default now(),
  check (desde is null or hasta is null or hasta > desde)
);

-- ---------------------------------------------------------------------------
-- Admins. Sin grants: nadie la lee por la Data API.
-- ---------------------------------------------------------------------------

create table public.admins (
  user_id   uuid primary key references auth.users (id) on delete cascade,
  creado_en timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Grants de la Data API. Desde 2026 las tablas nuevas no se exponen solas; RLS
-- (siguiente migración) decide qué filas ve cada rol.
-- ---------------------------------------------------------------------------

grant select on
  public.categorias, public.productos, public.grupos_etiqueta, public.etiquetas,
  public.producto_etiquetas, public.producto_variantes, public.variante_etiquetas,
  public.producto_imagenes, public.banners
to anon, authenticated;

grant insert, update, delete on
  public.categorias, public.productos, public.grupos_etiqueta, public.etiquetas,
  public.producto_etiquetas, public.producto_variantes, public.variante_etiquetas,
  public.producto_imagenes, public.banners
to authenticated;

revoke all on public.admins from anon, authenticated;

grant usage on schema private to anon, authenticated;
revoke execute on all functions in schema private from public, anon, authenticated;
grant execute on function public.f_unaccent(text), public.slugify(text) to anon, authenticated;
